import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { dedupeAndSort, getRecords, mutateRecords, RecordStoreError } from '@/lib/api-utils';
import { GameRecord } from '@/types/game';

const DATA_FILE = path.join(process.cwd(), 'data', 'records.json');

function writeStore(contents: string) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, contents, 'utf8');
}

function readStore(): string {
  return fs.readFileSync(DATA_FILE, 'utf8');
}

const SEED: GameRecord[] = [
  { nickname: 'A', score: 100, date: '2026-01-01T00:00:00.000Z', discordId: '111' },
  { nickname: 'B', score: 90, date: '2026-01-02T00:00:00.000Z', discordId: '222' },
];

describe('dedupeAndSort', () => {
  it('discordId별 최고 점수만 남긴다', () => {
    const result = dedupeAndSort([
      { nickname: 'A', score: 50, date: '2026-01-01T00:00:00.000Z', discordId: '111' },
      { nickname: 'A바뀜', score: 120, date: '2026-01-03T00:00:00.000Z', discordId: '111' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(120);
  });

  it('점수 내림차순, 동점은 먼저 세운 기록이 앞선다', () => {
    const result = dedupeAndSort([
      { nickname: 'B', score: 100, date: '2026-01-05T00:00:00.000Z', discordId: '222' },
      { nickname: 'A', score: 100, date: '2026-01-01T00:00:00.000Z', discordId: '111' },
      { nickname: 'C', score: 200, date: '2026-01-09T00:00:00.000Z', discordId: '333' },
    ]);
    expect(result.map((r) => r.nickname)).toEqual(['C', 'A', 'B']);
  });

  it('limit으로 상위 N개만 돌려준다', () => {
    expect(dedupeAndSort(SEED, 1)).toHaveLength(1);
  });
});

describe('저장소 읽기 실패', () => {
  let original: string | null = null;

  beforeEach(() => {
    original = fs.existsSync(DATA_FILE) ? readStore() : null;
  });

  afterEach(() => {
    if (original === null) {
      fs.rmSync(DATA_FILE, { force: true });
    } else {
      writeStore(original);
    }
  });

  it('깨진 파일이면 빈 배열이 아니라 예외를 던진다', async () => {
    writeStore('[{"a":');
    await expect(getRecords()).rejects.toBeInstanceOf(RecordStoreError);
  });

  it('배열이 아닌 내용이면 예외를 던진다', async () => {
    writeStore('{"records":[]}');
    await expect(getRecords()).rejects.toBeInstanceOf(RecordStoreError);
  });

  it('읽기에 실패하면 저장하지 않는다', async () => {
    writeStore('[{"a":');

    await expect(
      mutateRecords(() => ({ records: [SEED[0]], result: true }))
    ).rejects.toBeInstanceOf(RecordStoreError);

    // 덮어쓰였다면 기존 내용이 사라졌을 것이다.
    expect(readStore()).toBe('[{"a":');
  });
});

describe('mutateRecords', () => {
  let original: string | null = null;

  beforeEach(() => {
    original = fs.existsSync(DATA_FILE) ? readStore() : null;
    writeStore(JSON.stringify(SEED));
  });

  afterEach(() => {
    if (original === null) {
      fs.rmSync(DATA_FILE, { force: true });
    } else {
      writeStore(original);
    }
  });

  it('받은 배열을 그대로 돌려주면 저장을 생략한다', async () => {
    const raw = readStore();
    const result = await mutateRecords((records) => ({ records, result: 'skip' }));
    expect(result).toBe('skip');
    // 저장했다면 들여쓰기 포맷으로 다시 써져 원본과 달라진다
    expect(readStore()).toBe(raw);
  });

  it('읽은 기록을 변형해 저장한다', async () => {
    const added = await mutateRecords((records) => ({
      records: [...records, { nickname: 'C', score: 10, date: '2026-02-01T00:00:00.000Z', discordId: '333' }],
      result: 'ok',
    }));

    expect(added).toBe('ok');
    expect(JSON.parse(readStore())).toHaveLength(3);
  });

  it('변형 함수는 기존 기록 전체를 받는다', async () => {
    let seen: GameRecord[] = [];
    await mutateRecords((records) => {
      seen = records;
      return { records, result: null };
    });
    expect(seen.map((r) => r.discordId)).toEqual(['111', '222']);
  });
});
