export class ScreenshotManager {
  static async captureVisible() {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    return dataUrl;
  }

  static async captureFullPage(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return new Promise((resolve, reject) => {
          if (typeof window.html2canvas !== 'function') {
            reject(new Error('html2canvas를 먼저 로드해 주세요.'));
            return;
          }
          window.html2canvas(document.body, {
            allowTaint: true,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
          }).then(canvas => resolve(canvas.toDataURL('image/png'))).catch(reject);
        });
      }
    });
    if (results[0] && results[0].result) return results[0].result;
    throw new Error(results[0] && results[0].error ? results[0].error.message : '캡처 실패');
  }

  static async download(dataUrl, filename = 'screenshot.png') {
    const blob = await fetch(dataUrl).then(r => r.blob());
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename, saveAs: true });
    URL.revokeObjectURL(url);
  }
}
