export class PasswordGenerator {
  static generate(length, options = {}) {
    const { upper = true, lower = true, digit = true, special = true } = options;
    const charSets = [];
    if (upper) charSets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (lower) charSets.push('abcdefghijklmnopqrstuvwxyz');
    if (digit) charSets.push('0123456789');
    if (special) charSets.push('!@#$%^&*()_+-=[]{};:,.<>/?');

    if (charSets.length === 0) {
      throw new Error('하나 이상의 문자 종류를 선택하세요.');
    }

    const allChars = charSets.join('');
    if (allChars.length === 0) {
      throw new Error('생성할 문자 풀이 비어 있습니다.');
    }

    const password = [];
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      const randomIndex = randomValues[i] % allChars.length;
      password.push(allChars[randomIndex]);
    }

    return password.join('');
  }
}
