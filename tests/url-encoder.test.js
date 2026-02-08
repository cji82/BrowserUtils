import { describe, it } from 'node:test';
import assert from 'node:assert';
import { URLEncoder } from '../modules/url-encoder.js';

describe('URLEncoder', () => {
  it('encode: 한글과 공백을 인코딩한다', () => {
    assert.strictEqual(URLEncoder.encode('한글'), '%ED%95%9C%EA%B8%80');
    assert.strictEqual(URLEncoder.encode('a b'), 'a%20b');
  });

  it('decode: 인코딩된 문자열을 복원한다', () => {
    assert.strictEqual(URLEncoder.decode('%ED%95%9C%EA%B8%80'), '한글');
    assert.strictEqual(URLEncoder.decode('a+b'), 'a b');
  });

  it('encode 후 decode 하면 원문과 같다', () => {
    const text = 'https://example.com/경로?q=검색';
    assert.strictEqual(URLEncoder.decode(URLEncoder.encode(text)), text);
  });

  it('잘못된 디코딩 시 에러를 던진다', () => {
    assert.throws(() => URLEncoder.decode('%XX'), /디코딩 실패/);
  });
});
