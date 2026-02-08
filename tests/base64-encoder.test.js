import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Base64Encoder } from '../modules/base64-encoder.js';

describe('Base64Encoder', () => {
  it('encode: 영문을 Base64로 인코딩한다', () => {
    assert.strictEqual(Base64Encoder.encode('hello'), 'aGVsbG8=');
  });

  it('decode: Base64 문자열을 복원한다', () => {
    assert.strictEqual(Base64Encoder.decode('aGVsbG8='), 'hello');
  });

  it('한글 encode/decode roundtrip', () => {
    const text = '한글';
    assert.strictEqual(Base64Encoder.decode(Base64Encoder.encode(text)), text);
  });

  it('잘못된 Base64 디코딩 시 에러를 던진다', () => {
    assert.throws(() => Base64Encoder.decode('!!!'), /디코딩 실패/);
  });
});
