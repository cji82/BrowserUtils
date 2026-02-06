/**
 * 퍼센트 계산 (네이버 퍼센트 계산기와 동일)
 * 1. 전체값의 비율%는 얼마?
 * 2. 전체값의 일부값은 몇%?
 * 3. 전체값이 증감값으로 변하면? (증감률 %)
 * 4. 전체값이 증감률% 증가하면?
 */
export class PercentageCalculator {
  /** 전체값의 비율%는 얼마? */
  static percentOf(total, rate) {
    const x = Number(total);
    const p = Number(rate);
    if (isNaN(x) || isNaN(p)) return null;
    return (x * p) / 100;
  }

  /** 전체값의 일부값은 몇%? → (일부/전체)*100 */
  static whatPercent(total, part) {
    const x = Number(total);
    const y = Number(part);
    if (isNaN(x) || isNaN(y)) return null;
    if (x === 0) return null;
    return (y / x) * 100;
  }

  /** 전체값이 증감값으로 변하면? → 증감률(%) */
  static changeRate(fromVal, toVal) {
    const from = Number(fromVal);
    const to = Number(toVal);
    if (isNaN(from) || isNaN(to)) return null;
    if (from === 0) return null;
    return ((to - from) / from) * 100;
  }

  /** 전체값이 증감률% 증가하면? */
  static increaseBy(total, rate) {
    const x = Number(total);
    const p = Number(rate);
    if (isNaN(x) || isNaN(p)) return null;
    return x * (1 + p / 100);
  }
}
