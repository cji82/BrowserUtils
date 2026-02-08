import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimeConverter } from '../modules/time-converter.js';

describe('TimeConverter', () => {
  it('숫자만 입력 시 날짜 문자열로 변환', () => {
    const r = TimeConverter.convert('1704067200');
    assert.strictEqual(r.type, 'date');
    assert.ok(r.value.length > 0);
  });

  it('날짜 문자열 입력 시 타임스탬프로 변환', () => {
    const r = TimeConverter.convert('2024-01-01 00:00:00');
    assert.strictEqual(r.type, 'timestamp');
    assert.ok(typeof r.value === 'number');
  });

  it('timestampToDate', () => {
    const s = TimeConverter.timestampToDate(1704067200);
    assert.ok(/^\d/.test(s));
  });

  it('잘못된 타임스탬프는 에러', () => {
    assert.throws(() => TimeConverter.timestampToDate('invalid'), /유효하지 않은/);
  });
});
