import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UnitConverter } from '../modules/unit-converter.js';

describe('UnitConverter', () => {
  it('길이 변환: 1km = 1000m', () => {
    const r = UnitConverter.convert('length', 'km', 'm', 1);
    assert.strictEqual(r, 1000);
  });

  it('무게 변환', () => {
    const r = UnitConverter.convert('weight', 'kg', 'g', 1);
    assert.strictEqual(r, 1000);
  });

  it('지원하지 않는 단위는 에러', () => {
    assert.throws(() => UnitConverter.convert('length', 'km', 'invalid', 1), /지원하지 않는/);
  });

  it('숫자 아닌 값은 에러', () => {
    assert.throws(() => UnitConverter.convert('length', 'm', 'cm', 'abc'), /숫자를/);
  });
});
