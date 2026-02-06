import { URLEncoder } from './modules/url-encoder.js';
import { Base64Encoder } from './modules/base64-encoder.js';
import { JSONFormatter } from './modules/json-formatter.js';
import { TextTransformer } from './modules/text-transformer.js';
import { HashGenerator } from './modules/hash-generator.js';
import { CodeMinifier } from './modules/code-minifier.js';
import { ScreenshotManager } from './modules/screenshot.js';
import { ColorPicker } from './modules/colorpicker.js';
import { ImageOptimizer } from './modules/image-optimizer.js';
import { CookieManager } from './modules/cookie-manager.js';
import { StorageManager } from './modules/storage-manager.js';
import { ElementPicker } from './modules/element-picker.js';
import { NetworkMonitor } from './modules/network-monitor.js';
import { QRGenerator } from './modules/qr-generator.js';
import { TimeConverter } from './modules/time-converter.js';
import { UnitConverter } from './modules/unit-converter.js';
import { PercentageCalculator } from './modules/percentage-calculator.js';
import { TabManager } from './modules/tab-manager.js';
import { PerformanceMetrics } from './modules/performance-metrics.js';
import { AccessibilityChecker } from './modules/accessibility-checker.js';
import { PasswordGenerator } from './modules/password-generator.js';
import { LoremGenerator } from './modules/lorem-generator.js';
import { JwtDecoder } from './modules/jwt-decoder.js';
import { RegexTester } from './modules/regex-tester.js';
import { TextDiff } from './modules/text-diff.js';
import { UserAgentParser } from './modules/user-agent-parser.js';
import { GAME_REGISTRY } from './modules/easter_egg/index.js';

let currentTabId = null;
let networkMonitorRunning = false;
let currentFeatureId = null;

function showToast(message, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function setButtonLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = '처리 중...';
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}

async function withLoading(buttonId, fn) {
  setButtonLoading(buttonId, true);
  try {
    const result = await fn();
    return result;
  } finally {
    setButtonLoading(buttonId, false);
  }
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab ? tab.id : null;
  return tab;
}

function isInjectablePage(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isCapturablePage(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Chrome Web Store, chrome://, 확장 페이지 등은 캡처 불가
    if (u.hostname === 'chrome.google.com' && u.pathname.includes('/webstore')) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        const err = chrome.runtime.lastError.message || '';
        if (err.includes('Receiving end does not exist') || err.includes('Could not establish connection')) {
          chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, (injResult) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
              if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
              resolve(retryResponse);
            });
          });
        } else {
          reject(new Error(chrome.runtime.lastError.message));
        }
      } else {
        resolve(response);
      }
    });
  });
}

const BASE_TABS = ['media', 'text', 'dev', 'utils', 'help'];
let gameTabEnabled = false;
function getValidTabs() {
  return gameTabEnabled ? [...BASE_TABS, 'game'] : BASE_TABS;
}

function showGridView(panel) {
  if (!panel) return;
  const gridView = panel.querySelector('.grid-view');
  const featureViews = panel.querySelectorAll('.feature-view');
  if (gridView) gridView.classList.remove('hide-grid');
  featureViews.forEach(el => el.classList.remove('active'));
}

function showFeatureView(panel, featureId) {
  if (!panel || !featureId) return;
  const gridView = panel.querySelector('.grid-view');
  const target = panel.querySelector('.feature-view[data-feature-id="' + featureId + '"]');
  panel.querySelectorAll('.feature-view').forEach(el => el.classList.remove('active'));
  if (target) target.classList.add('active');
  if (gridView) gridView.classList.add('hide-grid');
}

function showBackButton() {
  const header = document.getElementById('main-header');
  if (header) header.classList.add('with-back');
}

function hideBackButton() {
  const header = document.getElementById('main-header');
  if (header) header.classList.remove('with-back');
}

function switchToTab(tabName) {
  if (!tabName || !getValidTabs().includes(tabName)) return;
  const panel = document.getElementById('panel-' + tabName);
  if (!panel) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
  panel.classList.add('active');
  currentFeatureId = null;
  showGridView(panel);
  hideBackButton();
  if (tabName === 'dev') loadNetworkRequestsFromDevTools();
}

function showGameTab() {
  const wrap = document.getElementById('game-tab-wrap');
  if (wrap) wrap.style.display = 'inline-flex';
}

function hideGameTab() {
  const wrap = document.getElementById('game-tab-wrap');
  if (wrap) wrap.style.display = 'none';
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchToTab(tab);
      chrome.storage.local.set({ lastActiveTab: tab, lastActiveFeatureId: null });
    });
  });
}

function setupEasterEgg() {
  let questionCount = 0;
  let questionTimer = null;
  document.addEventListener('keydown', (e) => {
    if (e.key !== '?' || e.repeat) return;
    questionCount++;
    if (questionTimer) clearTimeout(questionTimer);
    questionTimer = setTimeout(() => { questionCount = 0; questionTimer = null; }, 5000);
    if (questionCount >= 3) {
      questionCount = 0;
      if (questionTimer) clearTimeout(questionTimer);
      questionTimer = null;
      if (gameTabEnabled) return;
      gameTabEnabled = true;
      chrome.storage.local.set({ gameTabEnabled: true });
      showGameTab();
      showToast('🎮 게임 카테고리가 추가되었습니다!');
    }
  });
}

function setupGameTabDelete() {
  safeOn('game-tab-delete', 'click', (e) => {
    e.stopPropagation();
    if (!gameTabEnabled) return;
    gameTabEnabled = false;
    chrome.storage.local.set({ gameTabEnabled: false });
    hideGameTab();
    const panel = document.querySelector('.tab-panel.active');
    if (panel && panel.id === 'panel-game') switchToTab('media');
    showToast('게임 카테고리를 삭제했습니다.');
  });
}

function setupGridAndBackButton() {
  document.addEventListener('click', (e) => {
    const gridItem = e.target.closest('.grid-item');
    if (gridItem) {
      const featureId = gridItem.dataset.featureId;
      const panel = document.querySelector('.tab-panel.active');
      if (featureId && panel) {
        currentFeatureId = featureId;
        showFeatureView(panel, featureId);
        if (featureId === 'clip-record') updateClipRecordAvailability();
        if (panel.id === 'panel-game' && GAME_REGISTRY[featureId]) GAME_REGISTRY[featureId].init({ safeOn });
        showBackButton();
        chrome.storage.local.set({ lastActiveFeatureId: featureId });
      }
      return;
    }
    const backBtn = e.target.closest('#back-from-feature');
    if (backBtn) {
      const panel = document.querySelector('.tab-panel.active');
      currentFeatureId = null;
      showGridView(panel);
      hideBackButton();
      chrome.storage.local.set({ lastActiveFeatureId: null });
    }
  });
}

function safeOn(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

function setupCopyButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy');
    if (!btn) return;
    const id = btn.dataset.copyTarget;
    const el = id ? document.getElementById(id) : null;
    if (!el || !el.value) {
      showToast('복사할 내용이 없습니다', 'error');
      return;
    }
    navigator.clipboard.writeText(el.value).then(() => {
      showToast('클립보드에 복사되었습니다');
      btn.textContent = '복사됨';
      setTimeout(() => { btn.textContent = '복사'; }, 1500);
    }).catch(() => showToast('복사 실패', 'error'));
  });
}

function setupImageQualityLabel() {
  const range = document.getElementById('image-quality');
  const valueEl = document.getElementById('image-quality-value');
  const formatSel = document.getElementById('image-format');
  const qualityWrap = document.querySelector('.image-quality-wrap');
  if (!range || !valueEl) return;
  range.addEventListener('input', () => { valueEl.textContent = range.value; });
  valueEl.textContent = range.value;
  function toggleQualityForFormat() {
    if (qualityWrap && formatSel) {
      qualityWrap.classList.toggle('hidden', formatSel.value === 'png');
    }
  }
  if (formatSel) formatSel.addEventListener('change', toggleQualityForFormat);
  toggleQualityForFormat();
}

function setupTextTools() {
  safeOn('url-encode', 'click', () => {
    try {
      const v = document.getElementById('url-input').value;
      document.getElementById('url-output').value = URLEncoder.encode(v);
      showToast('인코드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
  safeOn('url-decode', 'click', () => {
    try {
      const v = document.getElementById('url-input').value;
      document.getElementById('url-output').value = URLEncoder.decode(v);
      showToast('디코드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('base64-encode', 'click', () => {
    try {
      const v = document.getElementById('base64-input').value;
      document.getElementById('base64-output').value = Base64Encoder.encode(v);
      showToast('인코드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
  safeOn('base64-decode', 'click', () => {
    try {
      const v = document.getElementById('base64-input').value;
      document.getElementById('base64-output').value = Base64Encoder.decode(v);
      showToast('디코드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('json-format', 'click', () => {
    try {
      const v = document.getElementById('json-input').value;
      document.getElementById('json-output').value = JSONFormatter.format(v);
      showToast('포맷 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
  safeOn('json-minify', 'click', () => {
    try {
      const v = document.getElementById('json-input').value;
      document.getElementById('json-output').value = JSONFormatter.minify(v);
      showToast('미니파이 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
  safeOn('json-validate', 'click', () => {
    const v = document.getElementById('json-input').value;
    const r = JSONFormatter.validate(v);
    document.getElementById('json-output').value = r.message;
    showToast(r.valid ? '유효한 JSON' : '오류', r.valid ? 'success' : 'error');
  });

  const textActions = {
    'text-uppercase': (v) => TextTransformer.toUpperCase(v),
    'text-lowercase': (v) => TextTransformer.toLowerCase(v),
    'text-camelcase': (v) => TextTransformer.toCamelCase(v),
    'text-snakecase': (v) => TextTransformer.toSnakeCase(v),
    'text-kebabcase': (v) => TextTransformer.toKebabCase(v)
  };
  Object.entries(textActions).forEach(([id, fn]) => {
    safeOn(id, 'click', () => {
      try {
        const v = document.getElementById('text-input').value;
        document.getElementById('text-output').value = fn(v);
        showToast('변환 완료');
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  safeOn('generate-hash', 'click', async () => {
    try {
      setButtonLoading('generate-hash', true);
      const v = document.getElementById('hash-input').value;
      const algo = document.getElementById('hash-algorithm').value;
      const hash = await HashGenerator.generate(v, algo);
      document.getElementById('hash-output').value = hash;
      showToast('해시 생성 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : '해시 생성 실패', 'error');
    } finally {
      setButtonLoading('generate-hash', false);
    }
  });

  safeOn('minify-code', 'click', () => {
    try {
      const v = document.getElementById('code-input').value.trim();
      const type = document.getElementById('code-type').value;
      document.getElementById('code-output').value = CodeMinifier.minify(v, type);
      showToast('미니파이 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  (function initRegexTabs() {
    const listPanel = document.getElementById('regex-result-list');
    const replacePanel = document.getElementById('regex-result-replace');
    const detailsPanel = document.getElementById('regex-result-details');
    document.querySelectorAll('.regex-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.regex-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.regexTab;
        if (listPanel) listPanel.style.display = tab === 'list' ? 'block' : 'none';
        if (replacePanel) replacePanel.style.display = tab === 'replace' ? 'block' : 'none';
        if (detailsPanel) detailsPanel.style.display = tab === 'details' ? 'block' : 'none';
      });
    });
  })();

  (function initRegexHelpOverlay() {
    const overlay = document.getElementById('regex-help-overlay');
    const openBtn = document.getElementById('regex-help-btn');
    const closeBtn = overlay && overlay.querySelector('.regex-help-close');
    const modal = overlay && overlay.querySelector('.regex-help-modal');

    function showHelp() {
      if (!overlay) return;
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', onEscape);
    }
    function hideHelp() {
      if (!overlay) return;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onEscape);
    }
    function onEscape(e) {
      if (e.key === 'Escape') hideHelp();
    }

    if (openBtn) openBtn.addEventListener('click', showHelp);
    if (closeBtn) closeBtn.addEventListener('click', hideHelp);
    if (overlay && modal) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) hideHelp(); });
      modal.addEventListener('click', (e) => e.stopPropagation());
    }
  })();

  safeOn('regex-test-btn', 'click', () => {
    const pattern = document.getElementById('regex-pattern').value;
    const flags = document.getElementById('regex-flags').value;
    const input = document.getElementById('regex-input').value;
    const replacement = (document.getElementById('regex-replace-input') || {}).value || '';
    const listEl = document.getElementById('regex-result-list');
    const replaceOutputEl = document.getElementById('regex-replace-output');
    const detailsEl = document.getElementById('regex-result-details');
    if (!listEl) return;
    const r = RegexTester.test(pattern, flags, input, replacement);
    if (r.error) {
      listEl.textContent = r.error;
      if (replaceOutputEl) replaceOutputEl.textContent = '';
      if (detailsEl) detailsEl.innerHTML = '';
    } else {
      listEl.textContent = (r.listLines || []).join('\n');
      if (replaceOutputEl) {
        replaceOutputEl.textContent = r.replaceResult != null ? r.replaceResult : '(교체 문자열을 입력한 뒤 테스트하면 결과가 표시됩니다)';
      }
      if (detailsEl && r.matches && r.matches.length) {
        let table = '<table class="regex-details-table"><thead><tr><th>#</th><th>위치</th><th>매칭</th><th>그룹</th></tr></thead><tbody>';
        r.matches.forEach((m, i) => {
          const groups = (m.groups || []).map(g => escapeHtml(JSON.stringify(g))).join(', ') || '—';
          table += '<tr><td>' + (i + 1) + '</td><td>' + m.index + '</td><td>' + escapeHtml(JSON.stringify(m.full)) + '</td><td>' + groups + '</td></tr>';
        });
        table += '</tbody></table>';
        detailsEl.innerHTML = table;
      } else {
        detailsEl.textContent = r.matches && r.matches.length === 0 ? '매칭 없음.' : '';
      }
    }
    showToast(r.error ? '오류' : '테스트 완료', r.error ? 'error' : 'success');
  });

  safeOn('diff-btn', 'click', () => {
    const textA = document.getElementById('diff-a').value;
    const textB = document.getElementById('diff-b').value;
    const jsonMode = document.getElementById('diff-json-mode').checked;
    const resultEl = document.getElementById('diff-result');
    if (!resultEl) return;
    try {
      const diff = TextDiff.compare(textA, textB, jsonMode);
      resultEl.innerHTML = TextDiff.renderToHtml(diff);
      showToast('비교 완료');
    } catch (e) {
      resultEl.textContent = '오류: ' + e.message;
      showToast(e.message, 'error');
    }
  });

  safeOn('diff-open-window', 'click', () => {
    const textA = document.getElementById('diff-a').value;
    const textB = document.getElementById('diff-b').value;
    const jsonMode = document.getElementById('diff-json-mode').checked;
    try {
      const diff = TextDiff.compare(textA, textB, jsonMode);
      chrome.storage.local.set({
        diffViewerData: { textA, textB, jsonMode, diff }
      }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL('diff-viewer.html'),
          type: 'popup',
          width: 900,
          height: 700
        });
        showToast('별도 창에서 열림');
      });
    } catch (e) {
      showToast(e.message || '먼저 비교를 실행하세요', 'error');
    }
  });

  safeOn('beautify-code', 'click', async () => {
    const inputEl = document.getElementById('code-input');
    const outputEl = document.getElementById('code-output');
    const type = document.getElementById('code-type').value;
    let raw = inputEl.value.trim();
    if (!raw) {
      showToast('코드 또는 URL을 입력하세요', 'error');
      return;
    }
    const isUrl = /^https?:\/\/\S+$/i.test(raw);
    if (isUrl) {
      try {
        setButtonLoading('beautify-code', true);
        const res = await fetch(raw, { method: 'GET' });
        if (!res.ok) throw new Error('URL 로드 실패: ' + res.status);
        raw = await res.text();
      } catch (e) {
        showToast(e.message || 'URL을 불러올 수 없습니다. CORS 제한일 수 있습니다.', 'error');
        return;
      } finally {
        setButtonLoading('beautify-code', false);
      }
    }
    try {
      outputEl.value = CodeMinifier.beautify(raw, type);
      showToast('뷰티파이 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

async function updateClipRecordAvailability() {
  const notice = document.getElementById('clip-record-disabled-notice');
  const startBtn = document.getElementById('clip-start');
  const controls = document.querySelector('.feature-view[data-feature-id="clip-record"] .clip-controls');
  if (!notice || !startBtn) return;
  const { screenCaptureUnavailable } = await chrome.storage.local.get('screenCaptureUnavailable');
  if (screenCaptureUnavailable) {
    notice.style.display = 'block';
    startBtn.disabled = true;
    if (controls) controls.style.opacity = '0.5';
  } else {
    notice.style.display = 'none';
    startBtn.disabled = false;
    if (controls) controls.style.opacity = '';
  }
}

function setupMediaTools() {
  let clipWindow = null;
  let clipInProgress = false;
  function setClipStatus(text, isRecording = false) {
    const statusEl = document.getElementById('clip-status');
    const startBtn = document.getElementById('clip-start');
    const stopBtn = document.getElementById('clip-stop');
    if (statusEl) statusEl.textContent = text;
    if (startBtn) startBtn.disabled = isRecording;
    if (stopBtn) stopBtn.disabled = !isRecording;
  }

  safeOn('clip-start', 'click', async () => {
    if (clipInProgress && clipWindow && !clipWindow.closed) {
      showToast('이미 녹화 중입니다', 'error');
      return;
    }
    const { screenCaptureUnavailable } = await chrome.storage.local.get('screenCaptureUnavailable');
    if (screenCaptureUnavailable) {
      showToast('이 환경에서는 화면 녹화가 제한되어 있습니다.', 'error');
      return;
    }
    const durationInput = document.getElementById('clip-duration');
    let duration = parseInt((durationInput && durationInput.value) || '10', 10);
    if (isNaN(duration)) duration = 10;
    duration = Math.min(120, Math.max(3, duration));
    if (durationInput) durationInput.value = String(duration);

    try {
      const res = await chrome.runtime.sendMessage({ action: 'startClipCapture', duration });
      if (res && res.error) {
        showToast(res.error, 'error');
        return;
      }
      clipWindow = null;
      clipInProgress = true;
      setClipStatus('녹화 탭이 열렸습니다. 곧 「공유할 대상 선택」 창이 뜹니다. 탭/창/화면을 고른 뒤 공유를 누르세요.', true);
      showToast('곧 공유할 대상 선택 창이 뜹니다. 탭을 고른 뒤 「공유」를 누르세요.');
    } catch (e) {
      showToast('녹화를 시작할 수 없습니다.', 'error');
    }
  });

  safeOn('clip-stop', 'click', () => {
    if (clipWindow && !clipWindow.closed) {
      clipWindow.postMessage({ type: 'recorder-stop' }, '*');
      setClipStatus('녹화 중지 요청...', true);
    } else {
      showToast('녹화 중이 아닙니다', 'error');
    }
  });

  safeOn('clip-record-retry', 'click', async () => {
    await chrome.storage.local.set({ screenCaptureUnavailable: false });
    await updateClipRecordAvailability();
    showToast('기능을 다시 사용할 수 있습니다. 녹화 시작을 눌러 보세요.');
  });

  if (!window._clipRecorderMsgBound) {
    window._clipRecorderMsgBound = true;
    window.addEventListener('message', (e) => {
      if (!e.data || e.data.source !== 'clip-recorder') return;
      const { type, payload } = e.data;
      if (type === 'recorder-started') {
        setClipStatus('녹화 중입니다...', true);
        clipInProgress = true;
      } else if (type === 'recorder-stopped') {
        setClipStatus('대기 중', false);
        clipInProgress = false;
        clipWindow = null;
      } else if (type === 'recorder-cancel') {
        setClipStatus('대기 중', false);
        clipInProgress = false;
        clipWindow = null;
        const msg = (payload && payload.notAllowed)
          ? '화면/탭을 선택해 주세요. 별도 창에서 다시 「녹화 시작」을 눌러 보세요.'
          : '녹화를 시작하지 못했습니다. 별도 창에서 다시 시도해 보세요.';
        showToast(msg, 'error');
      } else if (type === 'recorder-error') {
        setClipStatus('대기 중', false);
        clipInProgress = false;
        clipWindow = null;
        showToast('녹화 실패: ' + (payload && payload.message ? payload.message : ''), 'error');
      } else if (type === 'recorder-closed') {
        setClipStatus('대기 중', false);
        clipInProgress = false;
        clipWindow = null;
      }
    });
  }

  safeOn('screenshot-visible', 'click', async () => {
    try {
      const dataUrl = await ScreenshotManager.captureVisible();
      await ScreenshotManager.download(dataUrl, 'screenshot-visible.png');
      showToast('다운로드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('screenshot-full', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      setButtonLoading('screenshot-full', true);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['libs/html2canvas.min.js']
      });
      const dataUrl = await ScreenshotManager.captureFullPage(tab.id);
      await ScreenshotManager.download(dataUrl, 'screenshot-full.png');
      showToast('다운로드 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : '캡처 실패', 'error');
    } finally {
      setButtonLoading('screenshot-full', false);
    }
  });

  safeOn('screenshot-selection', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    if (!isInjectablePage(tab.url)) {
      showToast('일반 웹 페이지(http/https)에서만 사용할 수 있습니다.', 'error');
      return;
    }
    try {
      await sendMessageToTab(tab.id, { action: 'startScreenshotSelection' });
      showToast('페이지에서 영역을 드래그하여 선택한 뒤 「캡처」를 누르세요.');
    } catch (e) { showToast(e.message || '영역 선택 모드 시작 실패', 'error'); }
  });

  safeOn('screenshot-selection-clipboard', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    if (!isInjectablePage(tab.url)) {
      showToast('일반 웹 페이지(http/https)에서만 사용할 수 있습니다.', 'error');
      return;
    }
    try {
      await sendMessageToTab(tab.id, { action: 'startScreenshotSelection', copyToClipboard: true });
      showToast('페이지에서 영역을 드래그하여 선택한 뒤 「캡처」를 누르면 클립보드에 복사됩니다.');
    } catch (e) { showToast(e.message || '영역 선택 모드 시작 실패', 'error'); }
  });

  safeOn('image-base64-input', 'change', (e) => {
    const file = e.target.files && e.target.files[0];
    const outputEl = document.getElementById('image-base64-output');
    if (!outputEl) return;
    if (!file || !file.type.startsWith('image/')) {
      outputEl.value = '';
      if (file) showToast('이미지 파일을 선택하세요', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      outputEl.value = reader.result;
      showToast('Base64 변환 완료');
    };
    reader.onerror = () => showToast('파일 읽기 실패', 'error');
    reader.readAsDataURL(file);
  });

  safeOn('image-extract-clear', 'click', () => {
    const listEl = document.getElementById('image-extract-list');
    const targetEl = document.getElementById('image-extract-target');
    if (listEl) {
      listEl.classList.add('empty-state');
      listEl.innerHTML = '<p>추출된 이미지가 없습니다. 요소를 선택해 주세요.</p>';
    }
    if (targetEl) targetEl.textContent = '선택된 요소 없음';
  });

  safeOn('image-extract-pick', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    if (!isInjectablePage(tab.url)) {
      showToast('일반 웹 페이지(http/https)에서만 사용할 수 있습니다.', 'error');
      return;
    }
    try {
      await ElementPicker.startPicking(tab.id, { purpose: 'image-extract' });
      showToast('추출할 요소를 클릭하세요');
    } catch (e) {
      const msg = '요소 선택을 시작할 수 없습니다. ' + (e && e.message ? e.message : '페이지를 새로고침한 뒤 다시 시도하거나, 일반 웹 페이지에서 사용해 주세요.');
      showToast(msg, 'error');
    }
  });

  function renderImageExtractResult(payload) {
    const listEl = document.getElementById('image-extract-list');
    const targetEl = document.getElementById('image-extract-target');
    if (!listEl || !targetEl) return;
    const images = payload && payload.images ? payload.images : [];
    const target = payload && payload.target ? payload.target : null;

    if (target) {
      const parts = [];
      if (target.tagName) parts.push(target.tagName.toLowerCase());
      if (target.id) parts.push('#' + target.id);
      if (target.className) parts.push('.' + String(target.className).trim().split(/\s+/).join('.'));
      targetEl.textContent = parts.length ? parts.join('') : '선택된 요소';
    } else {
      targetEl.textContent = '선택된 요소 없음';
    }

    if (!images.length) {
      listEl.classList.add('empty-state');
      listEl.innerHTML = '<p>추출된 이미지가 없습니다.</p>';
      return;
    }
    listEl.classList.remove('empty-state');
    listEl.innerHTML = images.map((img, idx) => {
      const safeUrl = escapeAttr(img.url || '');
      const badge = img.type === 'background' ? '배경' : 'IMG';
      return '<div class="image-extract-item" data-url="' + safeUrl + '">' +
        '<div class="image-extract-thumb" style="background-image:url(\'' + safeUrl + '\')"></div>' +
        '<div class="image-extract-meta">' +
        '<span class="image-extract-badge">' + badge + '</span>' +
        '<div class="image-extract-url">' + escapeHtml(img.url || '') + '</div>' +
        '<div class="image-extract-actions">' +
          '<button type="button" class="btn-copy image-extract-copy" data-copy-url="' + safeUrl + '">복사</button>' +
          '<button type="button" class="image-extract-download" data-download-url="' + safeUrl + '" data-index="' + (idx + 1) + '">다운로드</button>' +
        '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('.image-extract-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.copyUrl || '';
        try {
          await navigator.clipboard.writeText(url);
          showToast('URL 복사 완료');
        } catch (_) { showToast('클립보드 복사 실패', 'error'); }
      });
    });
    listEl.querySelectorAll('.image-extract-download').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.downloadUrl;
        const idx = btn.dataset.index || '1';
        if (!url) return;
        let ext = 'png';
        const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
        if (m && m[1]) ext = m[1].toLowerCase();
        try {
          await chrome.downloads.download({ url, filename: 'extracted-image-' + idx + '.' + ext, saveAs: true });
          showToast('다운로드 시작');
        } catch (e) { showToast('다운로드 실패: ' + (e && e.message ? e.message : ''), 'error'); }
      });
    });
  }

  safeOn('color-picker-btn', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    if (!isInjectablePage(tab.url)) {
      showToast('일반 웹 페이지(http/https)에서만 사용할 수 있습니다. 웹 사이트를 연 탭에서 다시 시도해 주세요.', 'error');
      return;
    }
    try {
      await sendMessageToTab(tab.id, { action: 'startColorPicker', tabId: tab.id });
      showToast('페이지에서 색상을 클릭하세요');
    } catch (e) {
      showToast('로드에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.', 'error');
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'colorPicked' && request.color) {
      const formatted = ColorPicker.format(request.color);
      if (formatted) {
        document.getElementById('color-preview').style.backgroundColor = formatted.hex;
        document.getElementById('color-value').value = formatted.hex + ' ' + formatted.rgb;
      }
    }
    if (request.action === 'elementPicked' && request.info) {
      document.getElementById('element-info').innerHTML = '<pre>' + JSON.stringify(request.info, null, 2) + '</pre>';
    }
    if (request.action === 'imagesExtracted') {
      renderImageExtractResult(request);
      const count = (request.images || []).length;
      showToast(count ? ('이미지 ' + count + '개를 찾았습니다') : '이미지를 찾지 못했습니다');
    }
  });

  safeOn('image-input', 'change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.createElement('img');
      img.src = ev.target.result;
      document.getElementById('image-preview').innerHTML = '';
      document.getElementById('image-preview').appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  safeOn('optimize-image', 'click', async () => {
    const input = document.getElementById('image-input');
    if (!input.files || !input.files[0]) { showToast('이미지를 선택하세요', 'error'); return; }
    const format = document.getElementById('image-format').value || 'jpeg';
    const quality = parseFloat(document.getElementById('image-quality').value) || 0.8;
    try {
      const { blob, format: outFormat } = await ImageOptimizer.optimize(input.files[0], { format, quality });
      const ext = ImageOptimizer.FORMATS[outFormat].ext;
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({ url, filename: 'optimized.' + ext, saveAs: true });
      URL.revokeObjectURL(url);
      showToast('다운로드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function setupDevTools() {
  safeOn('load-cookies', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.url) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      setButtonLoading('load-cookies', true);
      const list = await CookieManager.getAllCookies(tab.url);
      const el = document.getElementById('cookies-list');
      el.dataset.tabUrl = tab.url;
      if (!list.length) {
        el.innerHTML = '<p>쿠키 없음</p>';
      } else {
        el.innerHTML = list.map(c => {
          const val = (c.value || '').length > 40 ? (c.value || '').slice(0, 40) + '…' : (c.value || '');
          return '<div class="item-row" data-name="' + escapeAttr(c.name) + '" data-value="' + escapeAttr(c.value || '') + '">' +
            '<span class="item-key" title="' + escapeAttr(c.name) + '">' + escapeHtml(c.name) + '</span>' +
            '<span class="item-value" title="' + escapeAttr(c.value || '') + '">' + escapeHtml(val) + '</span>' +
            '<span class="item-actions"><button type="button" class="cookie-edit-btn">수정</button><button type="button" class="cookie-delete-btn">삭제</button></span></div>';
        }).join('');
        el.querySelectorAll('.cookie-edit-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('.item-row');
            const name = row.dataset.name;
            const currentVal = row.dataset.value || '';
            const newVal = window.prompt('값 수정:', currentVal);
            if (newVal === null) return;
            const tab = await getCurrentTab();
            if (!tab || !tab.url) { showToast('탭을 찾을 수 없음', 'error'); return; }
            try {
              await CookieManager.set(tab.url, { name, value: newVal });
              showToast('수정됨');
              const _lc = document.getElementById('load-cookies'); if (_lc) _lc.click();
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
        el.querySelectorAll('.cookie-delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('.item-row');
            const name = row.dataset.name;
            const tab = await getCurrentTab();
            if (!tab || !tab.url) { showToast('탭을 찾을 수 없음', 'error'); return; }
            if (!window.confirm("쿠키 \"" + name + "\"를 삭제할까요?")) return;
            try {
              await CookieManager.remove(name, tab.url);
              showToast('삭제됨');
              row.remove();
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
      }
      showToast('로드 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : '쿠키 로드 실패', 'error');
    } finally {
      setButtonLoading('load-cookies', false);
    }
  });

  safeOn('add-cookie', 'click', async () => {
    const name = (document.getElementById('new-cookie-name').value || '').trim();
    const value = (document.getElementById('new-cookie-value').value || '').trim();
    if (!name) { showToast('이름을 입력하세요', 'error'); return; }
    const tab = await getCurrentTab();
    if (!tab || !tab.url) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      await CookieManager.set(tab.url, { name, value });
      document.getElementById('new-cookie-name').value = '';
      document.getElementById('new-cookie-value').value = '';
      showToast('추가됨');
      const _lc = document.getElementById('load-cookies'); if (_lc) _lc.click();
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('load-storage', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      setButtonLoading('load-storage', true);
      const type = document.getElementById('storage-type').value;
      const items = await StorageManager.getStorage(tab.id, type);
      const el = document.getElementById('storage-list');
      el.dataset.tabId = String(tab.id);
      el.dataset.storageType = type;
      if (!Object.keys(items).length) {
        el.innerHTML = '<p>비어 있음</p>';
      } else {
        el.innerHTML = Object.entries(items).map(([k, v]) => {
          const valStr = (v == null ? '' : String(v));
          const val = valStr.length > 40 ? valStr.slice(0, 40) + '…' : valStr;
          return '<div class="item-row" data-key="' + escapeAttr(k) + '" data-value="' + escapeAttr(valStr) + '">' +
            '<span class="item-key" title="' + escapeAttr(k) + '">' + escapeHtml(k) + '</span>' +
            '<span class="item-value" title="' + escapeAttr(valStr) + '">' + escapeHtml(val) + '</span>' +
            '<span class="item-actions"><button type="button" class="storage-edit-btn">수정</button><button type="button" class="storage-delete-btn">삭제</button></span></div>';
        }).join('');
        el.querySelectorAll('.storage-edit-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('.item-row');
            const key = row.dataset.key;
            const currentVal = row.dataset.value || '';
            const newVal = window.prompt('값 수정:', currentVal);
            if (newVal === null) return;
            const tab = await getCurrentTab();
            if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
            const type = document.getElementById('storage-type').value;
            try {
              await StorageManager.setItem(tab.id, type, key, newVal);
              showToast('수정됨');
              const _ls = document.getElementById('load-storage'); if (_ls) _ls.click();
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
        el.querySelectorAll('.storage-delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('.item-row');
            const key = row.dataset.key;
            const tab = await getCurrentTab();
            if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
            const type = document.getElementById('storage-type').value;
            if (!window.confirm("키 \"" + key + "\"를 삭제할까요?")) return;
            try {
              await StorageManager.removeItem(tab.id, type, key);
              showToast('삭제됨');
              row.remove();
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
      }
      showToast('로드 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : '스토리지 로드 실패', 'error');
    } finally {
      setButtonLoading('load-storage', false);
    }
  });

  safeOn('add-storage', 'click', async () => {
    const key = (document.getElementById('new-storage-key').value || '').trim();
    const value = (document.getElementById('new-storage-value').value || '').trim();
    if (!key) { showToast('키를 입력하세요', 'error'); return; }
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    const type = document.getElementById('storage-type').value;
    try {
      await StorageManager.setItem(tab.id, type, key, value);
      document.getElementById('new-storage-key').value = '';
      document.getElementById('new-storage-value').value = '';
      showToast('추가됨');
      const _ls = document.getElementById('load-storage'); if (_ls) _ls.click();
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('ua-parse-btn', 'click', () => {
    const input = document.getElementById('ua-input').value.trim();
    const ua = input || navigator.userAgent;
    const resultEl = document.getElementById('ua-result');
    if (!resultEl) return;
    resultEl.textContent = UserAgentParser.parse(ua);
    showToast('파싱 완료');
  });

  safeOn('element-picker-btn', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    if (!isInjectablePage(tab.url)) {
      showToast('일반 웹 페이지(http/https)에서만 사용할 수 있습니다.', 'error');
      return;
    }
    try {
      await sendMessageToTab(tab.id, { action: 'startElementPicker' });
      showToast('페이지에서 요소를 클릭하세요');
    } catch (e) {
      showToast('로드에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.', 'error');
    }
  });

  async function loadNetworkRequests() {
    await loadNetworkRequestsFromDevTools();
  }

  safeOn('network-monitor-btn', 'click', async () => {
    if (networkMonitorRunning) {
      await NetworkMonitor.stop();
      networkMonitorRunning = false;
      document.getElementById('network-monitor-btn').textContent = '모니터 시작';
      showToast('모니터 중지');
    } else {
      await NetworkMonitor.start();
      networkMonitorRunning = true;
      document.getElementById('network-monitor-btn').textContent = '모니터 중지';
      showToast('모니터 시작 - 요청을 수집합니다');
    }
    await loadNetworkRequests();
  });

  safeOn('network-monitor-clear', 'click', async () => {
    await NetworkMonitor.clear();
    if (networkMonitorRunning) {
      await NetworkMonitor.stop();
      networkMonitorRunning = false;
      const btn = document.getElementById('network-monitor-btn');
      if (btn) btn.textContent = '모니터 시작';
    }
    document.getElementById('network-requests').innerHTML = '<p class="network-list-placeholder">모니터 시작 후 다른 탭·페이지를 사용하면 요청이 여기에 표시됩니다.</p>';
    showToast('목록 비움 · 모니터 중지됨');
  });

  async function refreshNetworkList() {
    if (!networkMonitorRunning) return;
    await loadNetworkRequests();
  }

  setInterval(refreshNetworkList, 2000);

  safeOn('performance-btn', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      setButtonLoading('performance-btn', true);
      const m = await PerformanceMetrics.getMetrics(tab.id);
      const el = document.getElementById('performance-metrics');
      if (m.error) { el.innerHTML = '<p>오류: ' + m.error + '</p>'; showToast('측정 실패', 'error'); return; }
      el.innerHTML = '<pre>리소스 수: ' + m.resourceCount + '\n전송 크기: ' + (m.totalTransferSize || 0) + ' bytes\nDOMContentLoaded: ' + m.domContentLoaded + ' ms\nloadEventEnd: ' + m.loadEventEnd + ' ms</pre>';
      showToast('측정 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : '측정 실패', 'error');
    } finally {
      setButtonLoading('performance-btn', false);
    }
  });

  let lastAccessibilityTabId = null;
  let lastAccessibilityIssues = [];

  safeOn('accessibility-btn', 'click', async () => {
    const tab = await getCurrentTab();
    if (!tab || !tab.id) { showToast('탭을 찾을 수 없음', 'error'); return; }
    try {
      setButtonLoading('accessibility-btn', true);
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'clearAccessibilityHighlight' });
      } catch (_) {}
      const r = await AccessibilityChecker.check(tab.id);
      lastAccessibilityTabId = tab.id;
      lastAccessibilityIssues = r.issues || [];
      const el = document.getElementById('accessibility-results');
      if (!lastAccessibilityIssues.length) {
        el.innerHTML = '<p>이슈 없음</p>';
        showToast('검사 완료');
        return;
      }
      el.innerHTML = lastAccessibilityIssues.map((issue, idx) => {
        const num = idx + 1;
        const snippet = issue.snippet ? '<code class="a11y-snippet">' + issue.snippet + '</code>' : '';
        const btn = issue.selector
          ? '<button type="button" class="btn-a11y-locate" data-index="' + idx + '">위치 보기</button>'
          : '';
        return '<div class="a11y-issue-item" data-index="' + idx + '">' +
          '<span class="a11y-issue-num">' + num + '.</span> ' +
          '<span class="a11y-issue-msg">' + escapeHtml(issue.message) + '</span> ' +
          btn + (snippet ? '<br>' + snippet : '') + '</div>';
      }).join('');
      el.querySelectorAll('.btn-a11y-locate').forEach(btn => {
        btn.addEventListener('click', async () => {
          const idx = parseInt(btn.dataset.index, 10);
          const issue = lastAccessibilityIssues[idx];
          if (!issue || !issue.selector || !lastAccessibilityTabId) return;
          try {
            await sendMessageToTab(lastAccessibilityTabId, {
              action: 'highlightAccessibilityIssue',
              selector: issue.selector,
              message: issue.message
            });
            showToast('페이지에서 해당 요소를 확인하세요');
          } catch (e) {
            showToast('위치 보기 실패. 해당 탭을 새로고침한 뒤 다시 시도해 주세요.', 'error');
          }
        });
      });
      showToast('이슈 ' + lastAccessibilityIssues.length + '건');
    } catch (e) {
      showToast(e && e.message ? e.message : '검사 실패', 'error');
    } finally {
      setButtonLoading('accessibility-btn', false);
    }
  });

  // URL 파라미터: 현재 탭 URL 로드 → 키·값 카드 표시, 순서 변경 시 URL 출력
  let urlParamsState = { base: '', params: [] };

  function buildUrlParamsOutput() {
    const out = document.getElementById('url-params-output');
    if (!out) return;
    if (urlParamsState.params.length === 0) {
      out.value = urlParamsState.base || '';
      return;
    }
    const q = urlParamsState.params.map(function (p) {
      return encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value);
    }).join('&');
    out.value = urlParamsState.base + '?' + q;
  }

  function renderUrlParamsCards() {
    const container = document.getElementById('url-params-cards');
    if (!container) return;
    const list = urlParamsState.params;
    if (list.length === 0) {
      container.innerHTML = '<p class="network-list-placeholder">파라미터 없음. 현재 탭 URL 로드를 누르세요.</p>';
      buildUrlParamsOutput();
      return;
    }
    container.innerHTML = list.map(function (p, i) {
      const key = escapeHtml(p.key);
      const val = escapeHtml(p.value);
      return '<div class="url-params-card" draggable="true" data-index="' + i + '">' +
        '<span class="card-drag-handle" title="드래그하여 순서 변경">⋮⋮</span>' +
        '<span class="card-key" title="' + escapeAttr(p.key) + '">' + key + '</span>' +
        '<span class="card-value" title="' + escapeAttr(p.value) + '">' + val + '</span>' +
        '<span class="card-actions">' +
        '<button type="button" class="url-params-edit" data-index="' + i + '" title="편집">편집</button>' +
        '<button type="button" class="url-params-delete" data-index="' + i + '" title="삭제">삭제</button>' +
        '</span></div>';
    }).join('');
    var cards = container.querySelectorAll('.url-params-card');
    cards.forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', card.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('url-params-dragging');
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('url-params-dragging');
        container.querySelectorAll('.url-params-card').forEach(function (c) { c.classList.remove('url-params-drag-over'); });
      });
      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('url-params-drag-over');
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('url-params-drag-over');
      });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        card.classList.remove('url-params-drag-over');
        var fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        var toIndex = parseInt(card.dataset.index, 10);
        if (fromIndex === toIndex) return;
        var arr = urlParamsState.params.slice();
        var item = arr.splice(fromIndex, 1)[0];
        arr.splice(toIndex, 0, item);
        urlParamsState.params = arr;
        renderUrlParamsCards();
        buildUrlParamsOutput();
      });
    });
    container.querySelectorAll('.url-params-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = parseInt(btn.dataset.index, 10);
        var p = urlParamsState.params[i];
        var newKey = window.prompt('키', p.key);
        if (newKey === null) return;
        var newVal = window.prompt('값', p.value);
        if (newVal === null) return;
        urlParamsState.params[i] = { key: newKey.trim(), value: newVal };
        renderUrlParamsCards();
        buildUrlParamsOutput();
      });
    });
    container.querySelectorAll('.url-params-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = parseInt(btn.dataset.index, 10);
        urlParamsState.params.splice(i, 1);
        renderUrlParamsCards();
        buildUrlParamsOutput();
      });
    });
    buildUrlParamsOutput();
  }

  safeOn('url-params-add', 'click', function () {
    var keyInput = document.getElementById('url-params-new-key');
    var valInput = document.getElementById('url-params-new-value');
    if (!keyInput || !valInput) return;
    var key = (keyInput.value || '').trim();
    if (!key) {
      showToast('키를 입력하세요', 'error');
      return;
    }
    urlParamsState.params.push({ key: key, value: valInput.value || '' });
    keyInput.value = '';
    valInput.value = '';
    renderUrlParamsCards();
    buildUrlParamsOutput();
    showToast('추가됨');
  });

  safeOn('url-params-load', 'click', async function () {
    const tab = await getCurrentTab();
    if (!tab || !tab.url) {
      showToast('탭을 찾을 수 없음', 'error');
      return;
    }
    try {
      const u = new URL(tab.url);
      urlParamsState.base = u.origin + u.pathname;
      urlParamsState.params = [];
      u.searchParams.forEach(function (value, key) {
        urlParamsState.params.push({
          key: key,
          value: value
        });
      });
      renderUrlParamsCards();
      showToast('로드 완료');
    } catch (e) {
      showToast(e && e.message ? e.message : 'URL 파싱 실패', 'error');
    }
  });
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  if (s == null) return '';
  const str = String(s);
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setupUnitConverter() {
  const categorySel = document.getElementById('unit-category');
  const fromSel = document.getElementById('unit-from');
  const toSel = document.getElementById('unit-to');
  const valueInput = document.getElementById('unit-value');
  const resultInput = document.getElementById('unit-result');
  if (!categorySel || !fromSel || !toSel || !valueInput || !resultInput) return;

  function fillUnitOptions() {
    const cat = categorySel.value;
    const labels = UnitConverter.unitLabels[cat] || {};
    const units = Object.keys(UnitConverter.categories[cat].units);
    fromSel.innerHTML = units.map(u => '<option value="' + u + '">' + (labels[u] || u) + '</option>').join('');
    toSel.innerHTML = units.map(u => '<option value="' + u + '">' + (labels[u] || u) + '</option>').join('');
    if (units.length > 1) toSel.value = units[1];
    runUnitConvert();
  }

  function runUnitConvert() {
    const val = valueInput.value.trim();
    if (val === '') { resultInput.value = ''; return; }
    try {
      const r = UnitConverter.convert(categorySel.value, fromSel.value, toSel.value, val);
      resultInput.value = Number.isInteger(r) ? r : Number(r.toFixed(6));
    } catch (e) {
      resultInput.value = '';
    }
  }

  categorySel.addEventListener('change', fillUnitOptions);
  fromSel.addEventListener('change', runUnitConvert);
  toSel.addEventListener('change', runUnitConvert);
  valueInput.addEventListener('input', runUnitConvert);
  fillUnitOptions();
}

function setupPercentageCalculator() {
  const ids = {
    r1: ['percent1-total', 'percent1-ratio', 'percent1-result'],
    r2: ['percent2-total', 'percent2-part', 'percent2-result'],
    r3: ['percent3-from', 'percent3-to', 'percent3-result'],
    r4: ['percent4-from', 'percent4-rate', 'percent4-result'],
  };
  const resetBtn = document.getElementById('percent-reset');
  const calcBtn = document.getElementById('percent-calc');
  if (!calcBtn) return;

  function formatResult(n) {
    if (n == null || isNaN(n)) return '';
    return Number.isInteger(n) ? String(n) : Number(n.toFixed(6));
  }

  function runCalc() {
    const v = (id) => (document.getElementById(id) && document.getElementById(id).value.trim()) || '';
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const r1 = PercentageCalculator.percentOf(v(ids.r1[0]), v(ids.r1[1]));
    set(ids.r1[2], r1 != null ? formatResult(r1) : '');
    const r2 = PercentageCalculator.whatPercent(v(ids.r2[0]), v(ids.r2[1]));
    set(ids.r2[2], r2 != null ? formatResult(r2) + '%' : '');
    const r3 = PercentageCalculator.changeRate(v(ids.r3[0]), v(ids.r3[1]));
    set(ids.r3[2], r3 != null ? formatResult(r3) + '%' : '');
    const r4 = PercentageCalculator.increaseBy(v(ids.r4[0]), v(ids.r4[1]));
    set(ids.r4[2], r4 != null ? formatResult(r4) : '');
    showToast('계산 완료');
  }

  function resetAll() {
    ['percent1-total', 'percent1-ratio', 'percent1-result', 'percent2-total', 'percent2-part', 'percent2-result', 'percent3-from', 'percent3-to', 'percent3-result', 'percent4-from', 'percent4-rate', 'percent4-result'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showToast('초기화됨');
  }

  calcBtn.addEventListener('click', runCalc);
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
}

function setupUtils() {
  setupUnitConverter();
  setupPercentageCalculator();

  safeOn('pw-generate', 'click', () => {
    try {
      const length = parseInt(document.getElementById('pw-length').value, 10) || 12;
      const upper = document.getElementById('pw-upper').checked;
      const lower = document.getElementById('pw-lower').checked;
      const digit = document.getElementById('pw-digit').checked;
      const special = document.getElementById('pw-special').checked;
      const pw = PasswordGenerator.generate(length, { upper, lower, digit, special });
      document.getElementById('pw-output').value = pw;
      showToast('비밀번호 생성 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('lorem-generate', 'click', () => {
    try {
      const mode = document.getElementById('lorem-mode').value;
      const count = parseInt(document.getElementById('lorem-count').value, 10) || 5;
      const text = LoremGenerator.generate(mode, count);
      document.getElementById('lorem-output').value = text;
      showToast('Lorem Ipsum 생성 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('jwt-decode-btn', 'click', () => {
    try {
      const input = document.getElementById('jwt-input').value.trim();
      const { headerFormatted, payloadFormatted } = JwtDecoder.decode(input);
      document.getElementById('jwt-header').value = headerFormatted;
      document.getElementById('jwt-payload').value = payloadFormatted;
      showToast('디코드 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('generate-qr', 'click', () => {
    const text = document.getElementById('qr-input').value.trim();
    if (!text) { showToast('텍스트를 입력하세요', 'error'); return; }
    const container = document.getElementById('qrcode-container');
    if (!container) return;
    try {
      if (typeof QRCode !== 'undefined') {
        container.innerHTML = '';
        new QRCode(container, { text: text, width: 200, height: 200 });
        showToast('QR 생성 완료');
      } else {
        showToast('QRCode 라이브러리 로드 필요', 'error');
      }
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('download-qr', 'click', async () => {
    const container = document.getElementById('qrcode-container');
    if (!container) return;
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    let dataUrl = null;
    if (canvas && canvas.width > 0) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src && img.src.startsWith('data:')) {
      dataUrl = img.src;
    }
    if (!dataUrl) {
      showToast('먼저 QR 코드를 생성하세요', 'error');
      return;
    }
    try {
      await chrome.downloads.download({ url: dataUrl, filename: 'qrcode.png', saveAs: true });
      showToast('다운로드 완료');
    } catch (e) { showToast(e.message || '다운로드 실패', 'error'); }
  });

  safeOn('convert-time', 'click', () => {
    try {
      const v = document.getElementById('time-input').value.trim();
      const r = TimeConverter.convert(v);
      document.getElementById('time-output').textContent = r.type + ': ' + r.value;
      showToast('변환 완료');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('save-tabs', 'click', async () => {
    try {
      const tabs = await TabManager.saveTabs();
      document.getElementById('saved-tabs-list').innerHTML = '<p>저장됨: ' + tabs.length + '개 탭</p>';
      showToast(tabs.length + '개 탭 저장됨');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('restore-tabs', 'click', async () => {
    try {
      const n = await TabManager.restoreTabs();
      showToast(n + '개 탭 복원됨');
    } catch (e) { showToast(e.message, 'error'); }
  });

  safeOn('close-duplicates', 'click', async () => {
    try {
      const closed = await TabManager.closeDuplicates();
      showToast(closed + '개 중복 탭 닫음');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function loadLastPickedColor() {
  chrome.storage.local.get('lastPickedColor', (data) => {
    const c = data.lastPickedColor;
    if (!c) return;
    const preview = document.getElementById('color-preview');
    const valueEl = document.getElementById('color-value');
    if (preview) preview.style.backgroundColor = c.hex;
    if (valueEl) valueEl.value = c.hex + ' ' + c.rgb;
  });
}

async function restoreNetworkMonitorState() {
  const active = await NetworkMonitor.getStatus();
  networkMonitorRunning = !!active;
  const btn = document.getElementById('network-monitor-btn');
  if (btn) btn.textContent = networkMonitorRunning ? '모니터 중지' : '모니터 시작';
  await loadNetworkRequestsFromDevTools();
}

function loadNetworkRequestsFromDevTools() {
  return NetworkMonitor.getRequests().then(requests => {
    const el = document.getElementById('network-requests');
    if (!el) return;
    if (!requests.length) {
      el.innerHTML = '<p class="network-list-placeholder">모니터 시작 후 다른 탭·페이지를 사용하면 요청이 여기에 표시됩니다.</p>';
      return;
    }
    el.innerHTML = '<pre>' + requests.slice(-80).reverse().map(r => `${r.method} ${r.status || '-'} ${r.url}`).join('\n') + '</pre>';
  });
}

function init() {
  getCurrentTab();
  setupTabs();
  setupGridAndBackButton();
  chrome.storage.local.get(['lastActiveTab', 'lastActiveFeatureId', 'gameTabEnabled'], (data) => {
    gameTabEnabled = !!data.gameTabEnabled;
    if (gameTabEnabled) showGameTab();
    const savedTab = data.lastActiveTab;
    const savedFeature = data.lastActiveFeatureId;
    if (savedTab && getValidTabs().includes(savedTab) && document.getElementById('panel-' + savedTab)) {
      switchToTab(savedTab);
    } else {
      const panel = document.querySelector('.tab-panel.active');
      if (panel) {
        showGridView(panel);
        hideBackButton();
      }
    }
    const panel = document.querySelector('.tab-panel.active');
    if (panel && savedFeature) {
      const featureEl = panel.querySelector('.feature-view[data-feature-id="' + savedFeature + '"]');
      if (featureEl) {
        currentFeatureId = savedFeature;
        showFeatureView(panel, savedFeature);
        if (savedFeature === 'clip-record') updateClipRecordAvailability();
        if (panel.id === 'panel-game' && GAME_REGISTRY[savedFeature]) GAME_REGISTRY[savedFeature].init({ safeOn });
        showBackButton();
      }
    }
  });
  setupCopyButtons();
  setupImageQualityLabel();
  loadLastPickedColor();
  try { setupTextTools(); } catch (e) { console.error('setupTextTools', e); showToast('텍스트 도구 설정 오류', 'error'); }
  try { setupMediaTools(); } catch (e) { console.error('setupMediaTools', e); showToast('미디어 도구 설정 오류', 'error'); }
  try { setupDevTools(); } catch (e) { console.error('setupDevTools', e); showToast('개발 도구 설정 오류', 'error'); }
  try { setupUtils(); } catch (e) { console.error('setupUtils', e); showToast('기타 도구 설정 오류', 'error'); }
  setupEasterEgg();
  setupGameTabDelete();
  restoreNetworkMonitorState();
}

init();
