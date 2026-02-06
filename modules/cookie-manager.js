export class CookieManager {
  static async getAllCookies(url) {
    if (!url) return [];
    try {
      const domain = new URL(url).hostname;
      const cookies = await chrome.cookies.getAll({ domain });
      return cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : 'Session'
      }));
    } catch (e) {
      throw new Error(e.message);
    }
  }

  static async remove(name, url) {
    const u = new URL(url);
    await chrome.cookies.remove({ name, url: u.origin });
  }

  static async set(url, cookie) {
    const u = new URL(url);
    const details = {
      url: u.origin,
      name: cookie.name,
      value: cookie.value
    };
    if (cookie.domain) details.domain = cookie.domain;
    if (cookie.path) details.path = cookie.path;
    await chrome.cookies.set(details);
  }
}
