import { TextDiff } from './modules/text-diff.js';

const STORAGE_KEY = 'diffViewerData';

function render() {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const payload = data[STORAGE_KEY];
    const placeholder = document.getElementById('viewer-placeholder');
    const verticalEl = document.getElementById('diff-result-vertical');
    const horizontalEl = document.getElementById('diff-result-horizontal');
    const leftEl = document.getElementById('diff-result-left');
    const rightEl = document.getElementById('diff-result-right');

    if (!payload || !payload.diff || !Array.isArray(payload.diff)) {
      if (placeholder) placeholder.style.display = 'block';
      if (verticalEl) verticalEl.style.display = 'none';
      if (horizontalEl) horizontalEl.style.display = 'none';
      return;
    }

    if (placeholder) placeholder.style.display = 'none';
    const diff = payload.diff;
    const layout = document.querySelector('input[name="viewer-layout"]:checked')?.value || 'vertical';

    verticalEl.innerHTML = TextDiff.renderToHtml(diff);
    const { left, right } = TextDiff.renderToHtmlSideBySide(diff);
    leftEl.innerHTML = left;
    rightEl.innerHTML = right;

    if (layout === 'horizontal') {
      verticalEl.style.display = 'none';
      horizontalEl.style.display = 'flex';
      document.body.classList.add('layout-horizontal');
    } else {
      verticalEl.style.display = 'block';
      horizontalEl.style.display = 'none';
      document.body.classList.remove('layout-horizontal');
    }
  });
}

document.querySelectorAll('input[name="viewer-layout"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const layout = document.querySelector('input[name="viewer-layout"]:checked')?.value || 'vertical';
    const verticalEl = document.getElementById('diff-result-vertical');
    const horizontalEl = document.getElementById('diff-result-horizontal');
    if (layout === 'horizontal') {
      verticalEl.style.display = 'none';
      horizontalEl.style.display = 'flex';
      document.body.classList.add('layout-horizontal');
    } else {
      verticalEl.style.display = 'block';
      horizontalEl.style.display = 'none';
      document.body.classList.remove('layout-horizontal');
    }
  });
});

render();
