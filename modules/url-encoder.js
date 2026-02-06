export class URLEncoder {
  static encode(text) {
    try {
      return encodeURIComponent(text);
    } catch (e) {
      throw new Error('인코딩 실패: ' + e.message);
    }
  }

  static decode(text) {
    try {
      return decodeURIComponent(text.replace(/\+/g, ' '));
    } catch (e) {
      throw new Error('디코딩 실패: ' + e.message);
    }
  }
}
