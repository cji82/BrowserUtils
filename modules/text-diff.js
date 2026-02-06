import { JSONFormatter } from './json-formatter.js';

function formatForDiff(text, isJson) {
  if (!isJson) return text;
  try {
    return JSONFormatter.format(text);
  } catch (_) {
    return text;
  }
}

/** 줄이 "같은 줄"로 볼지 비교 (앞뒤 공백 무시). 출력은 원문 그대로. */
function lineMatch(a, b) {
  return (a || '').trim() === (b || '').trim();
}

/**
 * LCS(Longest Common Subsequence) 기반 줄 단위 diff.
 * 같은 줄(trim 기준 동일)은 한 행에 나란히, 추가/삭제만 별도 행.
 * 반환: { left, right, leftNum?, rightNum?, op }[]
 */
function lineDiffLCS(linesA, linesB) {
  const M = linesA.length;
  const N = linesB.length;
  if (M === 0 && N === 0) return [];

  const dp = Array(M + 1).fill(null).map(() => Array(N + 1).fill(0));
  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (lineMatch(linesA[i - 1], linesB[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rev = [];
  let i = M, j = N;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lineMatch(linesA[i - 1], linesB[j - 1])) {
      rev.push({ op: 'match', left: linesA[i - 1], right: linesB[j - 1], i, j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rev.push({ op: 'ins', left: null, right: linesB[j - 1], j });
      j--;
    } else {
      rev.push({ op: 'del', left: linesA[i - 1], right: null, i });
      i--;
    }
  }

  let rows = [];
  for (let k = rev.length - 1; k >= 0; k--) {
    const r = rev[k];
    rows.push({
      left: r.left,
      right: r.right,
      leftNum: r.i != null ? r.i : null,
      rightNum: r.j != null ? r.j : null,
      op: r.op
    });
  }

  // 연속된 del → ins 이고 내용(trim)이 같으면 한 행(수정)으로 합침 — 같은 줄이 두 줄로 나뉘는 것 방지
  const merged = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const cur = rows[idx];
    const next = rows[idx + 1];
    if (cur.op === 'del' && next && next.op === 'ins' && lineMatch(cur.left, next.right)) {
      merged.push({
        left: cur.left,
        right: next.right,
        leftNum: cur.leftNum,
        rightNum: next.rightNum,
        op: 'match'
      });
      idx++;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

/**
 * 같은 줄인데 내용이 다를 때, 차이나는 구간만 하이라이트 (공통 접두/접미 제거).
 * 반환: { leftHtml, rightHtml }
 */
function inlineDiffHighlight(left, right) {
  const esc = escapeHtml;
  if (left === right) {
    return { leftHtml: esc(left || ''), rightHtml: esc(right || '') };
  }
  const s1 = left || '';
  const s2 = right || '';
  let prefixLen = 0;
  while (prefixLen < s1.length && prefixLen < s2.length && s1[prefixLen] === s2[prefixLen]) {
    prefixLen++;
  }
  let suffixLen = 0;
  const maxSuffix = Math.min(s1.length - prefixLen, s2.length - prefixLen);
  while (suffixLen < maxSuffix && s1[s1.length - 1 - suffixLen] === s2[s2.length - 1 - suffixLen]) {
    suffixLen++;
  }
  const mid1 = s1.slice(prefixLen, s1.length - suffixLen || undefined);
  const mid2 = s2.slice(prefixLen, s2.length - suffixLen || undefined);
  const leftHtml = esc(s1.slice(0, prefixLen)) +
    (mid1 ? '<span class="diff-inline-del">' + esc(mid1) + '</span>' : '') +
    esc(s1.slice(s1.length - suffixLen));
  const rightHtml = esc(s2.slice(0, prefixLen)) +
    (mid2 ? '<span class="diff-inline-add">' + esc(mid2) + '</span>' : '') +
    esc(s2.slice(s2.length - suffixLen));
  return { leftHtml, rightHtml };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export class TextDiff {
  /**
   * 비교 결과: 한 행씩 { left, right, leftNum?, rightNum?, op }.
   * op: 'match' | 'del' | 'ins'
   */
  static compare(textA, textB, jsonMode = false) {
    const a = formatForDiff(textA || '', jsonMode);
    const b = formatForDiff(textB || '', jsonMode);
    const linesA = a.split(/\r?\n/);
    const linesB = b.split(/\r?\n/);
    return lineDiffLCS(linesA, linesB);
  }

  /** 위아래(unified) 뷰: - / + / 공백 접두로 표시 */
  static renderToHtml(rows) {
    const fragments = [];
    rows.forEach(({ left, right, op }) => {
      if (op === 'del' && left != null) {
        fragments.push('<div class="diff-del">- ' + escapeHtml(left) + '</div>');
      } else if (op === 'ins' && right != null) {
        fragments.push('<div class="diff-add">+ ' + escapeHtml(right) + '</div>');
      } else if (op === 'match' && left != null) {
        fragments.push('<div class="diff-same">  ' + escapeHtml(left) + '</div>');
      }
    });
    return fragments.join('');
  }

  /** 좌우 비교: 같은 줄은 한 행에 나란히, 수정된 줄은 줄 안 차이 하이라이트 */
  static renderToHtmlSideBySide(rows) {
    const leftParts = [];
    const rightParts = [];
    rows.forEach(({ left, right, leftNum, rightNum, op }) => {
      const numL = leftNum != null ? '<span class="diff-line-num">' + leftNum + '</span> ' : '<span class="diff-line-num"></span> ';
      const numR = rightNum != null ? '<span class="diff-line-num">' + rightNum + '</span> ' : '<span class="diff-line-num"></span> ';
      if (op === 'del') {
        leftParts.push('<div class="diff-del">' + numL + escapeHtml(left || '') + '</div>');
        rightParts.push('<div class="diff-empty"></div>');
      } else if (op === 'ins') {
        leftParts.push('<div class="diff-empty"></div>');
        rightParts.push('<div class="diff-add">' + numR + escapeHtml(right || '') + '</div>');
      } else {
        if (left === right) {
          const esc = escapeHtml(left || '');
          leftParts.push('<div class="diff-same">' + numL + esc + '</div>');
          rightParts.push('<div class="diff-same">' + numR + esc + '</div>');
        } else {
          const { leftHtml, rightHtml } = inlineDiffHighlight(left, right);
          leftParts.push('<div class="diff-mod-left">' + numL + leftHtml + '</div>');
          rightParts.push('<div class="diff-mod-right">' + numR + rightHtml + '</div>');
        }
      }
    });
    return {
      left: leftParts.join(''),
      right: rightParts.join('')
    };
  }
}
