// BrowserUtils - Background Service Worker

const networkRequests = [];
let networkMonitorActive = false;

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!networkMonitorActive) return;
    networkRequests.push({
      id: details.requestId,
      url: details.url,
      method: details.method || 'GET',
      startTime: Date.now(),
      status: null,
      endTime: null
    });
  },
  { urls: ['<all_urls>'] }
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!networkMonitorActive) return;
    const req = networkRequests.find(r => r.id === details.requestId);
    if (req) {
      req.status = details.statusCode;
      req.endTime = Date.now();
      req.duration = req.endTime - req.startTime;
    }
  },
  { urls: ['<all_urls>'] }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startNetworkMonitor') {
    networkMonitorActive = true;
    networkRequests.length = 0;
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'stopNetworkMonitor') {
    networkMonitorActive = false;
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'getNetworkRequests') {
    sendResponse({ requests: [...networkRequests] });
    return true;
  }
  if (request.action === 'getNetworkMonitorStatus') {
    sendResponse({ active: networkMonitorActive });
    return true;
  }
  if (request.action === 'clearNetworkRequests') {
    networkRequests.splice(0, networkRequests.length);
    networkMonitorActive = false;
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'generateHash') {
    const { text, algorithm } = request;
    hashWithCrypto(text, algorithm)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (request.action === 'captureForColorPicker' && request.tabId) {
    const tabId = request.tabId;
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.windowId) {
        chrome.tabs.sendMessage(tabId, { action: 'screenshotReady', error: '캡처 실패' });
        return;
      }
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          chrome.tabs.sendMessage(tabId, { action: 'screenshotReady', error: '캡처 실패' });
          return;
        }
        chrome.tabs.sendMessage(tabId, { action: 'screenshotReady', dataUrl });
      });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'captureForScreenshotSelection' && request.rect && sender.tab) {
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;
    const rect = request.rect;
    const copyToClipboard = !!request.copyToClipboard;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        chrome.tabs.sendMessage(tabId, { action: 'removeScreenshotSelectionOverlay' });
        return;
      }
      chrome.tabs.sendMessage(tabId, { action: 'cropScreenshotToRegion', dataUrl, rect }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.tabs.sendMessage(tabId, { action: 'removeScreenshotSelectionOverlay' });
          return;
        }
        if (response && response.dataUrl) {
          if (copyToClipboard) {
            chrome.tabs.sendMessage(tabId, { action: 'writeScreenshotToClipboard', dataUrl: response.dataUrl });
          } else {
            chrome.downloads.download({
              url: response.dataUrl,
              filename: 'screenshot-selection.png',
              saveAs: true
            });
          }
        }
        chrome.tabs.sendMessage(tabId, { action: 'removeScreenshotSelectionOverlay' });
      });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'startClipCapture' && request.duration) {
    const duration = Math.min(120, Math.max(3, parseInt(request.duration, 10) || 10));
    const url = chrome.runtime.getURL('clip-recorder.html?duration=' + duration);
    chrome.tabs.create({ url }, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.id) {
        sendResponse({ error: '탭을 열 수 없습니다.' });
        return;
      }
      sendResponse({ ok: true, tabId: tab.id });
    });
    return true;
  }
  if (request.action === 'clipRecorderReady' && sender.tab && sender.tab.id) {
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'setScreenCaptureUnavailable') {
    chrome.storage.local.set({ screenCaptureUnavailable: !!request.value }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (request.action === 'colorPicked' && request.color) {
    const { r, g, b } = request.color;
    const hex = '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
    chrome.storage.local.set({
      lastPickedColor: {
        hex,
        rgb: `rgb(${r}, ${g}, ${b})`,
        r, g, b
      }
    });
  }
  return false;
});

async function hashWithCrypto(text, algorithm) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const algo = algorithm === 'SHA-512' ? 'SHA-512' : 'SHA-256';
  const hashBuffer = await crypto.subtle.digest(algo, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex };
}
