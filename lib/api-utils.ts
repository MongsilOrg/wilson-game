import { GameRecord } from '@/types/game';
import { get, put, del, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
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

// 기록에는 참가자 전원의 discordId가 들어 있다. private으로 둬야 하고,
// useCache: false로 원본을 직접 읽는 것도 private일 때만 동작한다(공개 객체는 CDN 캐시를 탄다).
const BLOB_ACCESS = 'private' as const;

// public과 private은 호스트가 달라 기존 객체가 자동으로 옮겨지지 않는다.
// 처음 읽을 때 public에 남은 기록을 가져오고, private으로 쓴 뒤 지운다.
const LEGACY_BLOB_ACCESS = 'public' as const;

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
  /** public에 남아 있던 기록을 읽어온 경우의 원본 URL */
  legacyUrl?: string;
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

async function readBlob(access: 'public' | 'private') {
  try {
    // 엣지 캐시가 직전 스냅샷을 돌려주면 그 위에 덮어써 기록이 사라진다.
    return await get(BLOB_PATH, { access, useCache: false });
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }
    throw new RecordStoreError(`Blob 읽기 실패 (${access})`, { cause: error });
  }
}

async function parseBlob(stream: ReadableStream<Uint8Array>): Promise<GameRecord[]> {
  try {
    return toRecordArray(JSON.parse(await new Response(stream).text()));
  } catch (error) {
    if (error instanceof RecordStoreError) throw error;
    throw new RecordStoreError('Blob 본문 파싱 실패', { cause: error });
  }
}

async function readSnapshot(): Promise<RecordSnapshot> {
  if (hasBlobToken) {
    const result = await readBlob(BLOB_ACCESS);

    if (result?.statusCode === 200 && result.stream) {
      return { records: await parseBlob(result.stream), etag: result.blob.etag };
    }

    const legacy = await readBlob(LEGACY_BLOB_ACCESS);

    if (legacy?.statusCode === 200 && legacy.stream) {
      logger.warn('public에 남은 기록을 읽었습니다. private으로 옮깁니다.');
      // etag는 private 객체 기준이라야 하므로 여기서는 조건 없이 쓴다.
      return { records: await parseBlob(legacy.stream), etag: null, legacyUrl: legacy.blob.url };
    }

    // 아직 한 번도 저장한 적 없는 상태
    return { records: [], etag: null };
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
async function writeSnapshot(records: GameRecord[], snapshot: RecordSnapshot): Promise<void> {
  if (hasBlobToken) {
    await put(BLOB_PATH, JSON.stringify(records, null, 2), {
      addRandomSuffix: false,
      access: BLOB_ACCESS,
      contentType: 'application/json',
      allowOverwrite: true,
      ...(snapshot.etag ? { ifMatch: snapshot.etag } : {}),
    });

    if (snapshot.legacyUrl) {
      try {
        await del(snapshot.legacyUrl);
        logger.warn('public에 남아 있던 기록을 삭제했습니다.');
      } catch (error) {
        // 옮기는 것까지는 끝났으므로 삭제 실패로 요청을 실패시키지 않는다.
        logger.error('public 기록 삭제 실패:', error);
      }
    }
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
 * 변형 함수가 받은 배열을 그대로 돌려주면 저장을 생략한다. put 횟수가 플랜 한도에
 * 잡히므로, 변경이 없으면(점수 미갱신 등) 쓰지 않는 것이 요금과 충돌 양쪽에 낫다.
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

    if (records === snapshot.records && !snapshot.legacyUrl) {
      return result;
    }

    try {
      await writeSnapshot(records, snapshot);
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
