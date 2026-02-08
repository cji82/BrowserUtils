import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PasswordGenerator } from '../modules/password-generator.js';

describe('PasswordGenerator', () => {
  it('지정한 길이로 생성', () => {
    const pw = PasswordGenerator.generate(12, { upper: true, lower: true, digit: true, special: false });
    assert.strictEqual(pw.length, 12);
  });

  it('옵션에 따라 문자 종류가 포함된다', () => {
    const pw = PasswordGenerator.generate(50, { upper: true, lower: true, digit: false, special: false });
    assert.ok(/[A-Z]/.test(pw));
    assert.ok(/[a-z]/.test(pw));
  });

  it('문자 종류를 하나도 안 고르면 에러', () => {
    assert.throws(() => PasswordGenerator.generate(8, { upper: false, lower: false, digit: false, special: false }), /하나 이상/);
  });
});
