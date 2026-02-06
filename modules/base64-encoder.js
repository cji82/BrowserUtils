export class Base64Encoder {
  static encode(text) {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
      throw new Error('인코딩 실패: ' + e.message);
    }
  }

  static decode(text) {
    try {
      return decodeURIComponent(escape(atob(text)));
    } catch (e) {
      throw new Error('디코딩 실패: ' + e.message);
    }
  }
}
