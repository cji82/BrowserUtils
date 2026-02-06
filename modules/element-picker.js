export class ElementPicker {
  static async startPicking(tabId, options = {}) {
    const message = { action: 'startElementPicker', ...options };
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || '';
          if (err.includes('Receiving end does not exist') || err.includes('Could not establish connection')) {
            // 컨텐츠 스크립트가 아직 주입되지 않은 경우 재주입 후 재시도
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
              if (chrome.runtime.lastError) {
                return reject(new Error('스크립트 주입 실패: ' + (chrome.runtime.lastError.message || '')));
              }
              chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                resolve(retryResponse);
              });
            });
          } else {
            reject(new Error(err));
          }
        } else {
          resolve(response);
        }
      });
    });
  }

  static async stopPicking(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'stopElementPicker' });
    } catch (_) {}
  }
}
