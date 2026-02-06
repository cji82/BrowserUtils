export class PerformanceMetrics {
  static async getMetrics(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return {
            loadEventEnd: nav ? nav.loadEventEnd : 0,
            domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
            resourceCount: resources.length,
            totalTransferSize: resources.reduce((a, r) => a + (r.transferSize || 0), 0)
          };
        } catch (e) {
          return { error: e.message };
        }
      }
    });
    return results[0] && results[0].result ? results[0].result : {};
  }
}
