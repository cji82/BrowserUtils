export class JSONFormatter {
  static format(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      throw new Error('JSON 파싱 오류: ' + e.message);
    }
  }

  static minify(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj);
    } catch (e) {
      throw new Error('JSON 파싱 오류: ' + e.message);
    }
  }

  static validate(jsonString) {
    try {
      JSON.parse(jsonString);
      return { valid: true, message: '유효한 JSON입니다.' };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }
}
