export class JwtDecoder {
  static base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '===='.slice(0, 4 - pad);
    try {
      const decoded = atob(base64);
      return decodeURIComponent(escape(decoded));
    } catch (e) {
      throw new Error('Base64 디코딩 실패: ' + e.message);
    }
  }

  static decode(jwtString) {
    const trimmed = (jwtString || '').trim();
    if (!trimmed) throw new Error('JWT 문자열을 입력하세요.');

    const parts = trimmed.split('.');
    if (parts.length !== 3) throw new Error('JWT는 header.payload.signature 세 부분으로 구성되어야 합니다.');

    let headerJson, payloadJson;
    try {
      headerJson = JwtDecoder.base64UrlDecode(parts[0]);
      payloadJson = JwtDecoder.base64UrlDecode(parts[1]);
    } catch (e) {
      throw new Error('디코딩 오류: ' + e.message);
    }

    let header, payload;
    try {
      header = JSON.parse(headerJson);
      payload = JSON.parse(payloadJson);
    } catch (e) {
      throw new Error('JSON 파싱 오류: ' + e.message);
    }

    return {
      header,
      payload,
      headerFormatted: JSON.stringify(header, null, 2),
      payloadFormatted: JSON.stringify(payload, null, 2)
    };
  }
}
