export class UserAgentParser {
  static parse(uaString) {
    const ua = (uaString || '').trim() || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const lines = [];

    const browser = UserAgentParser.detectBrowser(ua);
    const os = UserAgentParser.detectOS(ua);
    const device = UserAgentParser.detectDevice(ua);

    lines.push('브라우저: ' + (browser || '알 수 없음'));
    lines.push('OS: ' + (os || '알 수 없음'));
    lines.push('기기: ' + (device || '알 수 없음'));
    if (ua) lines.push('');
    lines.push('원본 UA:');
    lines.push(ua);

    return lines.join('\n');
  }

  static detectBrowser(ua) {
    if (/Edg\//i.test(ua)) return 'Edge (Chromium)';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
    if (/Chromium\//i.test(ua)) return 'Chromium';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    return null;
  }

  static detectOS(ua) {
    if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
    if (/Windows NT/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    return null;
  }

  static detectDevice(ua) {
    if (/Mobile/i.test(ua) && !/iPad/i.test(ua)) return '모바일';
    if (/Tablet|iPad/i.test(ua)) return '태블릿';
    return '데스크톱';
  }
}
