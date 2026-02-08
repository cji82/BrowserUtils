import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JSONFormatter } from '../modules/json-formatter.js';

describe('JSONFormatter', () => {
  it('format: 들여쓰기된 JSON을 반환한다', () => {
    const input = '{"a":1,"b":2}';
    const out = JSONFormatter.format(input);
    assert.ok(out.includes('\n'));
    assert.strictEqual(JSON.parse(out).a, 1);
  });

  it('minify: 한 줄 JSON을 반환한다', () => {
    const input = '{"a": 1, "b": 2}';
    assert.strictEqual(JSONFormatter.minify(input), '{"a":1,"b":2}');
  });

  it('validate: 유효한 JSON은 valid true', () => {
    const r = JSONFormatter.validate('{"x":1}');
    assert.strictEqual(r.valid, true);
    assert.ok(r.message.includes('유효'));
  });

  it('validate: 잘못된 JSON은 valid false', () => {
    const r = JSONFormatter.validate('{ invalid }');
    assert.strictEqual(r.valid, false);
    assert.ok(r.message.length > 0);
  });
});
