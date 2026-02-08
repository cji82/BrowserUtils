import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { JwtDecoder } from '../modules/jwt-decoder.js';

function toBase64Url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('JwtDecoder', () => {
  const headerB64 = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const payloadB64 = toBase64Url({ sub: 'test' });
  const fakeJwt = headerB64 + '.' + payloadB64 + '.signature';

  it('정상 JWT 디코드', () => {
    const r = JwtDecoder.decode(fakeJwt);
    assert.ok(r.header);
    assert.strictEqual(r.header.typ, 'JWT');
    assert.ok(r.payload);
    assert.strictEqual(r.payload.sub, 'test');
    assert.ok(r.headerFormatted.includes('alg'));
    assert.ok(r.payloadFormatted.includes('sub'));
  });

  it('빈 문자열은 에러', () => {
    assert.throws(() => JwtDecoder.decode(''), /JWT 문자열을/);
  });

  it('점이 3개가 아니면 에러', () => {
    assert.throws(() => JwtDecoder.decode('a.b'), /세 부분/);
  });
});
