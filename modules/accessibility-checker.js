const A11Y_ATTR = 'data-browserutils-a11y-id';

export class AccessibilityChecker {
  static async check(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (attrName) => {
        const issues = [];
        let id = 0;
        document.querySelectorAll('[' + attrName + ']').forEach(el => el.removeAttribute(attrName));

        document.querySelectorAll('img:not([alt])').forEach(img => {
          img.setAttribute(attrName, String(id));
          issues.push({
            type: 'missingAlt',
            message: 'Alt 속성 없는 이미지',
            selector: '[' + attrName + '="' + id + '"]',
            snippet: img.outerHTML.substring(0, 80).replace(/</g, '&lt;')
          });
          id++;
        });
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length === 0) {
          issues.push({ type: 'noHeadings', message: '헤딩 요소 없음', selector: null, snippet: null });
        }
        document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
          const forId = input.id;
          const hasLabel = forId && Array.from(document.querySelectorAll('label')).some(lab => lab.htmlFor === input.id);
          const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
          if (!hasLabel && !hasAria) {
            input.setAttribute(attrName, String(id));
            issues.push({
              type: 'missingLabel',
              message: '레이블 없음',
              selector: '[' + attrName + '="' + id + '"]',
              snippet: input.outerHTML.substring(0, 60).replace(/</g, '&lt;')
            });
            id++;
          }
        });
        return { issues };
      },
      args: [A11Y_ATTR]
    });
    return results[0] && results[0].result ? results[0].result : { issues: [] };
  }
}
