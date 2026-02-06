// BrowserUtils - Content Script (페이지 상호작용)

let colorPickerActive = false;
let elementPickerActive = false;
let elementPickerPurpose = 'info';
let overlay = null;
let highlightEl = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startColorPicker') {
    removeColorPickerOverlay();
    colorPickerActive = true;
    elementPickerActive = false;
    cleanupElementPicker();
    const tabId = request.tabId;
    if (tabId) {
      showPageToast('화면 캡처 중…');
      chrome.runtime.sendMessage({ action: 'captureForColorPicker', tabId }, () => {
        if (chrome.runtime.lastError) {
          createColorPickerOverlay(null);
        }
      });
    } else {
      createColorPickerOverlay(null);
    }
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'screenshotReady') {
    if (request.error) {
      createColorPickerOverlay(null);
      return false;
    }
    const img = new Image();
    img.onload = () => {
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      createColorPickerOverlay(canvas, ratio);
    };
    img.onerror = () => createColorPickerOverlay(null);
    img.src = request.dataUrl;
    return false;
  }
  if (request.action === 'stopColorPicker') {
    colorPickerActive = false;
    removeColorPickerOverlay();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'startElementPicker') {
    document.removeEventListener('mouseover', onElementHover, true);
    document.removeEventListener('click', onElementClick, true);
    elementPickerActive = true;
    elementPickerPurpose = request.purpose || 'info';
    colorPickerActive = false;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', onElementHover, true);
    document.addEventListener('click', onElementClick, true);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'stopElementPicker') {
    elementPickerActive = false;
    elementPickerPurpose = 'info';
    cleanupElementPicker();
    document.body.style.cursor = '';
    document.removeEventListener('mouseover', onElementHover, true);
    document.removeEventListener('click', onElementClick, true);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'startScreenshotSelection') {
    screenshotSelectionCopyToClipboard = !!request.copyToClipboard;
    createScreenshotSelectionOverlay();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'cropScreenshotToRegion') {
    cropScreenshotToRegion(request.dataUrl, request.rect)
      .then((croppedDataUrl) => sendResponse({ dataUrl: croppedDataUrl }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (request.action === 'removeScreenshotSelectionOverlay') {
    removeScreenshotSelectionOverlay();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'writeScreenshotToClipboard' && request.dataUrl) {
    (async () => {
      try {
        const res = await fetch(request.dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showPageToast('클립보드에 복사됨');
        sendResponse({ ok: true });
      } catch (e) {
        showPageToast('클립보드 복사 실패');
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (request.action === 'captureFullPage') {
    captureFullPage().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (request.action === 'runAccessibilityCheck') {
    runAccessibilityCheck().then(sendResponse);
    return true;
  }
  if (request.action === 'highlightAccessibilityIssue') {
    const { selector, message } = request;
    if (selector) {
      clearAccessibilityHighlight();
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.setAttribute('data-browserutils-a11y-highlight', '1');
        const style = el.getAttribute('style') || '';
        el.setAttribute('data-browserutils-a11y-style', style);
        el.style.setProperty('outline', '3px solid #cb2431', 'important');
        el.style.setProperty('outline-offset', '2px', 'important');
        showAccessibilityIssueLabel(el, message || '접근성 이슈');
      }
    }
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'clearAccessibilityHighlight') {
    clearAccessibilityHighlight();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'getStorage') {
    const type = request.storageType || 'local';
    const storage = type === 'session' ? sessionStorage : localStorage;
    const items = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      items[key] = storage.getItem(key);
    }
    sendResponse({ items });
    return true;
  }
  if (request.action === 'getPerformanceMetrics') {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const metrics = {
        loadEventEnd: nav ? nav.loadEventEnd : 0,
        domContentLoadedEventEnd: nav ? nav.domContentLoadedEventEnd : 0,
        resourceCount: resources.length,
        totalSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0)
      };
      sendResponse({ metrics });
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true;
  }
  return false;
});

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function getColorFromScreenshot(screenshotCanvas, ratio, clientX, clientY) {
  if (!screenshotCanvas || !screenshotCanvas.getContext) return null;
  const x = Math.floor(clientX * ratio);
  const y = Math.floor(clientY * ratio);
  const w = screenshotCanvas.width;
  const h = screenshotCanvas.height;
  if (x < 0 || x >= w || y < 0 || y >= h) return null;
  const ctx = screenshotCanvas.getContext('2d');
  const data = ctx.getImageData(x, y, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2] };
}

function createColorPickerOverlay(screenshotCanvas, screenshotRatio) {
  removeColorPickerOverlay();
  const useScreenshot = screenshotCanvas && screenshotCanvas.width > 0;
  const ratio = screenshotRatio || window.devicePixelRatio || 1;

  const overlayDiv = document.createElement('div');
  overlayDiv.id = 'browserutils-colorpicker-overlay';
  overlayDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;cursor:crosshair;z-index:2147483646;pointer-events:auto;';

  const boxWidth = 110;
  const boxHeight = 82;
  const offset = 16;

  const box = document.createElement('div');
  box.id = 'browserutils-colorpicker-box';
  box.style.cssText = 'position:fixed;width:' + boxWidth + 'px;height:' + boxHeight + 'px;pointer-events:none;z-index:2147483647;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.25);background:#fff;border:1px solid rgba(0,0,0,0.15);overflow:hidden;font-family:system-ui,-apple-system,sans-serif;';
  const swatch = document.createElement('div');
  swatch.style.cssText = 'width:100%;height:36px;background:#888;';
  const label = document.createElement('div');
  label.style.cssText = 'padding:4px 8px;font-size:12px;font-weight:600;color:#333;text-align:center;letter-spacing:0.5px;';
  label.textContent = '#------';
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:10px;color:#888;text-align:center;padding-bottom:4px;';
  hint.textContent = '클릭하여 확정 · Esc 취소';
  box.appendChild(swatch);
  box.appendChild(label);
  box.appendChild(hint);

  let lastMove = 0;
  const throttleMs = 40;

  function updateBoxPosition(clientX, clientY) {
    const maxLeft = window.innerWidth - boxWidth - 8;
    const maxTop = window.innerHeight - boxHeight - 8;
    let left = clientX + offset;
    let top = clientY + offset;
    if (left > maxLeft) left = clientX - boxWidth - offset;
    if (top > maxTop) top = clientY - boxHeight - offset;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    box.style.left = left + 'px';
    box.style.top = top + 'px';
  }

  function updateColorAt(x, y) {
    let color;
    if (useScreenshot) {
      color = getColorFromScreenshot(screenshotCanvas, ratio, x, y);
    } else {
      overlayDiv.style.pointerEvents = 'none';
      color = getColorAtPoint(x, y);
      overlayDiv.style.pointerEvents = 'auto';
    }
    if (!color) color = { r: 128, g: 128, b: 128 };
    const hex = rgbToHex(color.r, color.g, color.b);
    swatch.style.background = hex;
    label.textContent = hex;
    return color;
  }

  function onMove(e) {
    const now = Date.now();
    if (now - lastMove < throttleMs) return;
    lastMove = now;
    const x = e.clientX;
    const y = e.clientY;
    updateBoxPosition(x, y);
    updateColorAt(x, y);
  }

  function onPick(e) {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    const y = e.clientY;
    let color;
    if (useScreenshot) {
      color = getColorFromScreenshot(screenshotCanvas, ratio, x, y);
    } else {
      overlayDiv.style.pointerEvents = 'none';
      color = getColorAtPoint(x, y);
      overlayDiv.style.pointerEvents = 'auto';
    }
    if (!color) color = { r: 128, g: 128, b: 128 };
    const hex = rgbToHex(color.r, color.g, color.b);
    navigator.clipboard.writeText(hex).catch(() => {});
    chrome.runtime.sendMessage({ action: 'colorPicked', color });
    colorPickerActive = false;
    removeColorPickerOverlay();
    chrome.runtime.sendMessage({ action: 'stopColorPicker' });
    showPageToast('색상 복사됨: ' + hex);
  }

  function onCancel() {
    colorPickerActive = false;
    removeColorPickerOverlay();
    chrome.runtime.sendMessage({ action: 'stopColorPicker' });
  }

  overlayDiv.addEventListener('mousemove', onMove, true);
  overlayDiv.addEventListener('click', onPick, true);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      document.removeEventListener('keydown', esc);
      onCancel();
    }
  }, true);

  document.body.appendChild(overlayDiv);
  document.body.appendChild(box);
  overlay = overlayDiv;

  const firstMove = (e) => {
    updateBoxPosition(e.clientX, e.clientY);
    updateColorAt(e.clientX, e.clientY);
    overlayDiv.removeEventListener('mousemove', firstMove);
  };
  overlayDiv.addEventListener('mousemove', firstMove, true);
}

function showPageToast(message) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;background:#24292e;color:#fff;border-radius:8px;font-size:13px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:system-ui,sans-serif;';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function removeColorPickerOverlay() {
  const o = document.getElementById('browserutils-colorpicker-overlay');
  const b = document.getElementById('browserutils-colorpicker-box');
  if (o && o.parentNode) o.parentNode.removeChild(o);
  if (b && b.parentNode) b.parentNode.removeChild(b);
  overlay = null;
}

let screenshotSelectionOverlay = null;
let screenshotSelectionRect = null;
let screenshotSelectionCopyToClipboard = false;

function createScreenshotSelectionOverlay() {
  removeScreenshotSelectionOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'browserutils-screenshot-selection-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;cursor:crosshair;z-index:2147483646;background:rgba(0,0,0,0.3);';
  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);padding:8px 16px;background:#24292e;color:#fff;border-radius:6px;font-size:13px;z-index:2147483647;font-family:system-ui,sans-serif;';
  hint.textContent = '드래그하여 영역 선택 · Esc 취소';
  overlay.appendChild(hint);

  const selectionBox = document.createElement('div');
  selectionBox.id = 'browserutils-screenshot-selection-box';
  selectionBox.style.cssText = 'position:fixed;border:2px solid #0366d6;background:rgba(3,102,214,0.1);pointer-events:none;z-index:2147483646;display:none;box-sizing:border-box;';
  overlay.appendChild(selectionBox);

  let startX = 0, startY = 0;
  let dragging = false;

  function normalizeRect(x1, y1, x2, y2) {
    const x = Math.max(0, Math.min(x1, x2));
    const y = Math.max(0, Math.min(y1, y2));
    const w = Math.min(window.innerWidth - x, Math.abs(x2 - x1));
    const h = Math.min(window.innerHeight - y, Math.abs(y2 - y1));
    return { x, y, width: Math.max(0, w), height: Math.max(0, h) };
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = w + 'px';
    selectionBox.style.height = h + 'px';
  });

  overlay.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || !dragging) return;
    dragging = false;
    const x1 = startX, y1 = startY, x2 = e.clientX, y2 = e.clientY;
    const rect = normalizeRect(x1, y1, x2, y2);
    if (rect.width < 5 || rect.height < 5) {
      selectionBox.style.display = 'none';
      return;
    }
    screenshotSelectionRect = rect;
    hint.textContent = '캡처할 영역을 선택했습니다. 캡처 버튼을 누르세요.';
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:2147483647;';
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '캡처';
    captureBtn.style.cssText = 'padding:10px 20px;background:#0366d6;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '취소';
    cancelBtn.style.cssText = 'padding:10px 20px;background:#6a737d;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;';
    captureBtn.addEventListener('click', () => {
      const rect = screenshotSelectionRect;
      const copyToClipboard = screenshotSelectionCopyToClipboard;
      removeScreenshotSelectionOverlay();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          chrome.runtime.sendMessage({ action: 'captureForScreenshotSelection', rect, copyToClipboard });
        });
      });
    });
    cancelBtn.addEventListener('click', () => removeScreenshotSelectionOverlay());
    btnWrap.appendChild(captureBtn);
    btnWrap.appendChild(cancelBtn);
    overlay.appendChild(btnWrap);
    overlay.style.cursor = 'default';
  });

  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', esc);
      removeScreenshotSelectionOverlay();
    }
  }, true);

  document.body.appendChild(overlay);
  screenshotSelectionOverlay = overlay;
}

function removeScreenshotSelectionOverlay() {
  const o = document.getElementById('browserutils-screenshot-selection-overlay');
  if (o && o.parentNode) o.parentNode.removeChild(o);
  screenshotSelectionOverlay = null;
  screenshotSelectionRect = null;
}

function cropScreenshotToRegion(dataUrl, rect) {
  const dpr = window.devicePixelRatio || 1;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = Math.floor(rect.x * dpr);
      const sy = Math.floor(rect.y * dpr);
      const sw = Math.min(Math.floor(rect.width * dpr), img.width - sx);
      const sh = Math.min(Math.floor(rect.height * dpr), img.height - sy);
      if (sw <= 0 || sh <= 0) {
        reject(new Error('선택 영역이 너무 작습니다.'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
}

function getColorAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const canvas = document.createElement('canvas');
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const bg = style.backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: +match[1], g: +match[2], b: +match[3] };
    }
    const hexMatch = bg.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }
  }
  const ctx = canvas.getContext('2d');
  canvas.width = 1;
  canvas.height = 1;
  let node = el;
  while (node && node !== document.body) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      try {
        const html2canvas = window.html2canvas;
        if (typeof html2canvas === 'function') {
          html2canvas(node, { x: x - r.left, y: y - r.top, width: 1, height: 1 }).then(c => {
            const d = c.getContext('2d').getImageData(0, 0, 1, 1).data;
            chrome.runtime.sendMessage({ action: 'colorPicked', color: { r: d[0], g: d[1], b: d[2] } });
          });
          return null;
        }
      } catch (_) {}
    }
    node = node.parentElement;
  }
  return { r: 128, g: 128, b: 128 };
}

function onElementHover(e) {
  if (!elementPickerActive) return;
  e.stopPropagation();
  cleanupHighlight();
  highlightEl = e.target;
  highlightEl.style.outline = '2px solid #0366d6';
  highlightEl.style.outlineOffset = '2px';
}

function onElementClick(e) {
  if (!elementPickerActive) return;
  e.preventDefault();
  e.stopPropagation();
  const targetEl = e.target;
  if (elementPickerPurpose === 'image-extract') {
    const result = collectImagesFromElement(targetEl);
    chrome.runtime.sendMessage({ action: 'imagesExtracted', ...result });
  } else {
    const info = getElementInfo(targetEl);
    chrome.runtime.sendMessage({ action: 'elementPicked', info });
  }
  cleanupElementPicker();
  document.body.style.cursor = '';
  elementPickerActive = false;
  elementPickerPurpose = 'info';
  document.removeEventListener('mouseover', onElementHover, true);
  document.removeEventListener('click', onElementClick, true);
}

function cleanupHighlight() {
  if (highlightEl) {
    highlightEl.style.outline = '';
    highlightEl.style.outlineOffset = '';
    highlightEl = null;
  }
}

function cleanupElementPicker() {
  cleanupHighlight();
}

function getElementInfo(el) {
  const rect = el.getBoundingClientRect();
  const styles = getComputedStyle(el);
  return {
    tagName: el.tagName,
    id: el.id || '',
    className: el.className || '',
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    display: styles.display,
    position: styles.position
  };
}

function collectImagesFromElement(el) {
  const images = [];
  const seen = new Set();
  const target = getElementInfo(el);

  function add(url, type, sourceTag) {
    if (!url) return;
    let resolved = url;
    try {
      resolved = new URL(url, location.href).toString();
    } catch (_) {}
    const key = type + '|' + resolved;
    if (seen.has(key)) return;
    seen.add(key);
    images.push({ url: resolved, type, source: sourceTag || '' });
  }

  function extractBackgrounds(node, styles) {
    const bg = styles.backgroundImage;
    if (!bg || bg === 'none') return;
    const matches = bg.match(/url\(([^)]+)\)/g);
    if (!matches) return;
    matches.forEach(m => {
      const raw = m.replace(/^url\(/, '').replace(/\)$/, '').trim().replace(/^['"]|['"]$/g, '');
      if (!raw) return;
      // Skip gradients or data that are not images? allow data:
      if (raw.toLowerCase().includes('gradient(')) return;
      add(raw, 'background', node.tagName.toLowerCase());
    });
  }

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, null);
  let node = el;
  while (node) {
    if (node.tagName === 'IMG' && node.src) {
      add(node.currentSrc || node.src, 'img', node.tagName.toLowerCase());
    }
    const styles = getComputedStyle(node);
    extractBackgrounds(node, styles);
    node = walker.nextNode();
  }
  return { images, target };
}

let a11yLabelEl = null;

function clearAccessibilityHighlight() {
  document.querySelectorAll('[data-browserutils-a11y-highlight="1"]').forEach(el => {
    el.removeAttribute('data-browserutils-a11y-highlight');
    const saved = el.getAttribute('data-browserutils-a11y-style');
    el.removeAttribute('data-browserutils-a11y-style');
    el.style.cssText = saved || '';
  });
  if (a11yLabelEl && a11yLabelEl.parentNode) a11yLabelEl.parentNode.removeChild(a11yLabelEl);
  a11yLabelEl = null;
}

function showAccessibilityIssueLabel(element, message) {
  if (a11yLabelEl && a11yLabelEl.parentNode) a11yLabelEl.parentNode.removeChild(a11yLabelEl);
  const rect = element.getBoundingClientRect();
  a11yLabelEl = document.createElement('div');
  a11yLabelEl.setAttribute('data-browserutils-a11y-label', '1');
  a11yLabelEl.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + (rect.top - 32) + 'px;max-width:320px;padding:6px 10px;background:#cb2431;color:#fff;font-size:12px;font-family:system-ui,sans-serif;border-radius:6px;z-index:2147483647;box-shadow:0 2px 8px rgba(0,0,0,0.2);pointer-events:none;';
  a11yLabelEl.textContent = message;
  document.body.appendChild(a11yLabelEl);
  const scrollHandler = () => {
    const r = element.getBoundingClientRect();
    a11yLabelEl.style.left = r.left + 'px';
    a11yLabelEl.style.top = (r.top - 32) + 'px';
  };
  window.addEventListener('scroll', scrollHandler, true);
  setTimeout(() => window.removeEventListener('scroll', scrollHandler, true), 5000);
}

function runAccessibilityCheck() {
  const issues = [];
  document.querySelectorAll('img:not([alt])').forEach(img => {
    issues.push({ type: 'missingAlt', message: 'Alt 속성 없는 이미지', element: img.outerHTML.substring(0, 80) });
  });
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    issues.push({ type: 'noHeadings', message: '헤딩 요소 없음' });
  }
  document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
    const id = input.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    if (!hasLabel && !hasAria) {
      issues.push({ type: 'missingLabel', message: '레이블 없음', element: input.outerHTML.substring(0, 60) });
    }
  });
  return Promise.resolve({ issues });
}

function captureFullPage() {
  return new Promise((resolve, reject) => {
    if (typeof window.html2canvas !== 'function') {
      reject(new Error('html2canvas 로드 필요'));
      return;
    }
    window.html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    }).then(canvas => {
      resolve(canvas.toDataURL('image/png'));
    }).catch(reject);
  });
}
