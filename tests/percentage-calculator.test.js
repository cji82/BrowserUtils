import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PercentageCalculator } from '../modules/percentage-calculator.js';

describe('PercentageCalculator', () => {
  it('percentOf: 전체의 N%', () => {
    assert.strictEqual(PercentageCalculator.percentOf(10000, 20), 2000);
  });

  it('whatPercent: 일부가 전체의 몇 %', () => {
    assert.strictEqual(PercentageCalculator.whatPercent(10000, 500), 5);
  });

  it('changeRate: 증감률', () => {
    assert.strictEqual(PercentageCalculator.changeRate(10000, 12500), 25);
  });

  it('increaseBy: N% 증가한 값', () => {
    assert.strictEqual(PercentageCalculator.increaseBy(10000, 25), 12500);
  });

  it('잘못된 입력은 null', () => {
    assert.strictEqual(PercentageCalculator.percentOf('a', 20), null);
    assert.strictEqual(PercentageCalculator.whatPercent(0, 5), null);
  });
});
