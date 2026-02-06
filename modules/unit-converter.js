/**
 * 단위 변환 (길이, 무게, 부피, 넓이)
 * 네이버 단위변환과 유사한 기능
 */
const RATIOS = {
  length: {
    km: 1000,
    m: 1,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254,
  },
  weight: {
    t: 1000,
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.45359237,
    oz: 0.028349523125,
  },
  volume: {
    kL: 1000,
    L: 1,
    mL: 0.001,
    gal: 3.785411784,
    qt: 0.946352946,
    pt: 0.473176473,
    cup: 0.2365882365,
  },
  area: {
    km2: 1e6,
    m2: 1,
    cm2: 0.0001,
    ha: 10000,
    a: 100,
    pyeong: 3.3057851239669424, // 1평 ≈ 3.3058 m²
    ft2: 0.09290304,
    in2: 0.00064516,
  },
};

export class UnitConverter {
  static categories = {
    length: { label: '길이', units: RATIOS.length },
    weight: { label: '무게', units: RATIOS.weight },
    volume: { label: '부피', units: RATIOS.volume },
    area: { label: '넓이', units: RATIOS.area },
  };

  static unitLabels = {
    length: { km: 'km', m: 'm', cm: 'cm', mm: 'mm', mi: '마일', yd: '야드', ft: '피트', in: '인치' },
    weight: { t: '톤', kg: 'kg', g: 'g', mg: 'mg', lb: 'lb', oz: 'oz' },
    volume: { kL: 'kL', L: 'L', mL: 'mL', gal: '갤런', qt: 'qt', pt: 'pt', cup: '컵' },
    area: { km2: 'km²', m2: 'm²', cm2: 'cm²', ha: '헥타르', a: 'a', pyeong: '평', ft2: 'ft²', in2: 'in²' },
  };

  static convert(category, fromUnit, toUnit, value) {
    const units = RATIOS[category];
    if (!units || units[fromUnit] === undefined || units[toUnit] === undefined) {
      throw new Error('지원하지 않는 단위입니다.');
    }
    const num = Number(value);
    if (isNaN(num)) throw new Error('숫자를 입력하세요.');
    const base = num * units[fromUnit];
    const result = base / units[toUnit];
    return result;
  }
}
