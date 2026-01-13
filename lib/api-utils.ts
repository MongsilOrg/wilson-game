import { GameRecord } from '@/types/game';
import { list, put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';

const fsp = fs.promises;

// Blob 설정
const BLOB_FILENAME = 'records.json';
const BLOB_PATH = `wilson/${BLOB_FILENAME}`; // blob 내 경로

// 로컬 JSON 파일 경로 (로컬 개발용 폴백)
const DATA_FILE = path.join(process.cwd(), 'data', 'records.json');
const DATA_DIR = path.dirname(DATA_FILE);

const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const isVercel = process.env.VERCEL === '1';

// Blob URL 캐시 (메모리 캐싱으로 list() 호출 최소화)
let cachedBlobUrl: string | null = null;

async function ensureDataFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(DATA_FILE);
  } catch {
    await fsp.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

function toRecordArray(maybeRecords: unknown): GameRecord[] {
  if (Array.isArray(maybeRecords)) {
    return maybeRecords as GameRecord[];
  }
  return [];
}

async function readFromBlob(): Promise<GameRecord[]> {
  // 캐시된 URL이 있으면 우선 사용 (list() 호출 방지)
  if (cachedBlobUrl) {
    try {
      const res = await fetch(cachedBlobUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return toRecordArray(data);
      }
      // 캐시된 URL이 실패하면 캐시 무효화하고 fallback으로 진행
      logger.warn('Cached blob URL failed, falling back to list()');
      cachedBlobUrl = null;
    } catch (error) {
      // 네트워크 오류 등으로 실패 시 캐시 무효화하고 fallback으로 진행
      logger.warn('Error fetching from cached blob URL, falling back to list():', error);
      cachedBlobUrl = null;
    }
  }

  // 캐시된 URL이 없거나 실패한 경우에만 list() 호출 (fallback)
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    const exact = blobs.find((b) => b.pathname === BLOB_PATH);
    const newest = blobs
      .filter((b) => b.pathname.startsWith(BLOB_PATH))
      .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())[0];
    const existing = exact ?? newest;
    if (!existing) return [];

    // 찾은 blob URL을 캐시에 저장
    cachedBlobUrl = existing.url;

    const res = await fetch(existing.url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return toRecordArray(data);
  } catch (error) {
    logger.error('Error in readFromBlob fallback:', error);
    return [];
  }
}

async function writeToBlob(records: GameRecord[]): Promise<void> {
  const result = await put(
    BLOB_PATH,
    JSON.stringify(records, null, 2),
    {
      addRandomSuffix: false,
      access: 'public',
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    }
  );
  
  // put()이 반환하는 URL을 캐시에 저장 (다음 readFromBlob() 호출 시 list() 호출 방지)
  cachedBlobUrl = result.url;
}

/**
 * discordId별 최고 점수만 남기고 점수 DESC, 동일 점수는 날짜 ASC 정렬
 * discordId가 없으면 닉네임으로 중복 제거 (하위 호환성)
 */
export function dedupeAndSort(records: GameRecord[], limit?: number): GameRecord[] {
  // discordId를 우선으로 사용, 없으면 닉네임 사용
  const recordMap = new Map<string, GameRecord>();
  
  for (const record of records) {
    // discordId가 있으면 discordId를 키로 사용, 없으면 닉네임 사용
    const key = record.discordId || record.nickname;
    const existing = recordMap.get(key);
    
    if (!existing || record.score > existing.score) {
      recordMap.set(key, record);
    } else if (existing && record.score === existing.score) {
      // 점수가 같을 때 더 이른 기록을 유지
      const shouldReplace = record.date.localeCompare(existing.date) < 0;
      if (shouldReplace) {
        recordMap.set(key, record);
      }
    }
  }

  const uniqueRecords = Array.from(recordMap.values());
  uniqueRecords.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.date.localeCompare(b.date);
  });

  return typeof limit === 'number' ? uniqueRecords.slice(0, limit) : uniqueRecords;
}

/**
 * 기록 불러오기 (비동기, 필요 시 파일 생성)
 */
export async function getRecords(): Promise<GameRecord[]> {
  try {
    if (hasBlobToken) {
      return await readFromBlob();
    }

    // Vercel 환경에서 토큰이 없으면 영구 저장 불가 → 명시적으로 실패시켜 원인 노출
    if (isVercel && !hasBlobToken) {
      throw new Error('Missing BLOB_READ_WRITE_TOKEN in Vercel environment');
    }

    // 로컬 폴백
    await ensureDataFile();
    const data = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
      return toRecordArray(parsed);
  } catch (error) {
    logger.error('Error getting records:', error);
    return [];
  }
}

/**
 * 기록 저장 (비동기)
 */
export async function saveRecords(records: GameRecord[]): Promise<void> {
  try {
    if (hasBlobToken) {
      await writeToBlob(records);
      return;
    }

    // Vercel 환경에서 토큰이 없으면 영구 저장 불가 → 명시적으로 실패시켜 원인 노출
    if (isVercel && !hasBlobToken) {
      throw new Error('Missing BLOB_READ_WRITE_TOKEN in Vercel environment');
    }

    // 로컬 폴백
    await ensureDataFile();
    await fsp.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (error) {
    logger.error('Error saving records:', error);
    throw error;
  }
}

/**
 * 닉네임/점수 기준으로 기록을 추가 또는 갱신
 */
export function upsertRecord(
  records: GameRecord[],
  nickname: string,
  score: number,
  dateIso: string
): { records: GameRecord[]; updated: boolean } {
  const parsedScore = Number.parseInt(score.toString(), 10);
  if (Number.isNaN(parsedScore)) {
    return { records, updated: false };
  }

  const nextRecords = [...records];
  const existingIndex = nextRecords.findIndex((r) => r.nickname === nickname);

  if (existingIndex !== -1) {
    const existing = nextRecords[existingIndex];
    if (parsedScore > existing.score) {
      nextRecords[existingIndex] = {
        nickname,
        score: parsedScore,
        date: dateIso,
      };
      return { records: nextRecords, updated: true };
    }
    return { records: nextRecords, updated: false };
  }

  nextRecords.push({
    nickname,
    score: parsedScore,
    date: dateIso,
  });
  return { records: nextRecords, updated: true };
}

