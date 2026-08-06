import { GameRecord } from '@/types/game';
import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
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

// 이미 public으로 저장된 객체가 있어 그대로 둔다. private 전환은 별도 마이그레이션이 필요하다.
const BLOB_ACCESS = 'public' as const;

const MAX_WRITE_ATTEMPTS = 5;

/**
 * 저장소 읽기 실패. 이 예외를 삼키고 빈 배열로 진행하면
 * 뒤이은 전량 덮어쓰기가 기존 기록을 지운다.
 */
export class RecordStoreError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RecordStoreError';
  }
}

/** 읽은 시점의 버전. 쓸 때 이 값을 조건으로 걸어 다른 요청의 덮어쓰기를 막는다. */
interface RecordSnapshot {
  records: GameRecord[];
  etag: string | null;
}

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
  throw new RecordStoreError('기록 파일이 배열이 아닙니다.');
}

async function readSnapshot(): Promise<RecordSnapshot> {
  if (hasBlobToken) {
    let result;
    try {
      // 엣지 캐시가 직전 스냅샷을 돌려주면 그 위에 덮어써 기록이 사라진다.
      result = await get(BLOB_PATH, { access: BLOB_ACCESS, useCache: false });
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        return { records: [], etag: null };
      }
      throw new RecordStoreError('Blob 읽기 실패', { cause: error });
    }

    // 아직 한 번도 저장한 적 없는 상태
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { records: [], etag: null };
    }

    try {
      const text = await new Response(result.stream).text();
      return { records: toRecordArray(JSON.parse(text)), etag: result.blob.etag };
    } catch (error) {
      if (error instanceof RecordStoreError) throw error;
      throw new RecordStoreError('Blob 본문 파싱 실패', { cause: error });
    }
  }

  if (isVercel) {
    throw new RecordStoreError('Vercel 환경에 BLOB_READ_WRITE_TOKEN이 없습니다.');
  }

  try {
    await ensureDataFile();
    const data = await fsp.readFile(DATA_FILE, 'utf8');
    return { records: toRecordArray(JSON.parse(data)), etag: null };
  } catch (error) {
    if (error instanceof RecordStoreError) throw error;
    throw new RecordStoreError('로컬 기록 파일 읽기 실패', { cause: error });
  }
}

/**
 * @throws {BlobPreconditionFailedError} 읽은 뒤 다른 요청이 먼저 쓴 경우
 */
async function writeSnapshot(records: GameRecord[], etag: string | null): Promise<void> {
  if (hasBlobToken) {
    await put(BLOB_PATH, JSON.stringify(records, null, 2), {
      addRandomSuffix: false,
      access: BLOB_ACCESS,
      contentType: 'application/json',
      allowOverwrite: true,
      ...(etag ? { ifMatch: etag } : {}),
    });
    return;
  }

  if (isVercel) {
    throw new RecordStoreError('Vercel 환경에 BLOB_READ_WRITE_TOKEN이 없습니다.');
  }

  await ensureDataFile();
  await fsp.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
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
 * 기록 불러오기
 * @throws {RecordStoreError} 저장소를 읽지 못한 경우
 */
export async function getRecords(): Promise<GameRecord[]> {
  const { records } = await readSnapshot();
  return records;
}

/**
 * 기록을 읽어 변형 함수를 적용한 뒤 저장한다.
 * 읽기가 실패하면 저장하지 않는다. 빈 배열로 덮어써 전체 기록이 사라지는 것을 막는다.
 * 저장 직전에 다른 요청이 먼저 썼으면 새로 읽어 다시 적용한다.
 */
export async function mutateRecords<T>(
  mutator: (records: GameRecord[]) => { records: GameRecord[]; result: T }
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const snapshot = await readSnapshot();
    const { records, result } = mutator(snapshot.records);

    if (!Array.isArray(records)) {
      throw new RecordStoreError('변형 결과가 배열이 아닙니다.');
    }

    try {
      await writeSnapshot(records, snapshot.etag);
      return result;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError && attempt < MAX_WRITE_ATTEMPTS) {
        logger.warn(`기록 저장 충돌, 재시도 ${attempt}/${MAX_WRITE_ATTEMPTS}`);
        continue;
      }
      if (error instanceof RecordStoreError) throw error;
      throw new RecordStoreError('기록 저장 실패', { cause: error });
    }
  }

  throw new RecordStoreError('기록 저장 충돌이 반복되어 저장하지 못했습니다.');
}
