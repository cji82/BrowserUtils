import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RegexTester } from '../modules/regex-tester.js';

describe('RegexTester', () => {
  it('단순 매칭', () => {
    const r = RegexTester.test('\\d+', '', 'abc123def');
    assert.strictEqual(r.error, undefined);
    assert.ok(r.ok);
    assert.ok(r.listLines && r.listLines.length > 0);
  });

  it('g 플래그로 전역 매칭', () => {
    const r = RegexTester.test('\\d+', 'g', 'a1b2c3');
    assert.strictEqual(r.error, undefined);
    assert.strictEqual(r.matches.length, 3);
  });

  it('패턴만 입력 시 에러 메시지', () => {
    const r = RegexTester.test('', '', 'hello');
    assert.ok(r.error);
  });

  it('교체 문자열 반환', () => {
    const r = RegexTester.test('(\\d+)', 'g', 'a1b2', '$1!');
    assert.strictEqual(r.replaceResult, 'a1!b2!');
  });
});
