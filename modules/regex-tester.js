/** 슬래시 형식 /패턴/플래그 를 파싱. 예: /([0-9]{2,})/g → { pattern: '([0-9]{2,})', flags: 'g' } */
function parsePatternInput(str) {
  const s = (str || '').trim();
  if (s.startsWith('/')) {
    const endSlash = s.indexOf('/', 1);
    if (endSlash !== -1) {
      const pattern = s.slice(1, endSlash);
      const after = s.slice(endSlash + 1).replace(/\s/g, '');
      const flagChars = after.match(/[gimsuy]+/);
      const parsedFlags = flagChars ? flagChars[0] : '';
      return { pattern, parsedFlags };
    }
  }
  return { pattern: s, parsedFlags: '' };
}

export class RegexTester {
  /**
   * @param {string} patternStr
   * @param {string} flagsStr
   * @param {string} inputStr
   * @param {string} [replacementStr] - 있으면 Replace 결과 반환
   * @returns {{ error?: string, ok?: boolean, matches?: Array<{index:number, full:string, groups:string[]}>, listLines?: string[], replaceResult?: string }}
   */
  static test(patternStr, flagsStr, inputStr, replacementStr) {
    const { pattern: parsedPattern, parsedFlags } = parsePatternInput(patternStr || '');
    const pattern = parsedPattern || (patternStr || '').trim();
    const flagsInput = (flagsStr || '').trim();
    const flags = [...new Set((parsedFlags + flagsInput).split('').filter(c => /[gimsuy]/i.test(c)))].join('');
    const input = inputStr ?? '';

    if (!pattern) {
      return { error: '패턴을 입력하세요.' };
    }

    try {
      const re = new RegExp(pattern, flags);
      const listLines = [];
      const matches = [];

      if (flags.includes('g')) {
        const matchArr = [...input.matchAll(re)];
        if (matchArr.length === 0) {
          listLines.push('매칭 없음.');
        } else {
          listLines.push('매칭 수: ' + matchArr.length);
          matchArr.forEach((m, i) => {
            matches.push({
              index: m.index,
              full: m[0],
              groups: Array.from(m).slice(1)
            });
            listLines.push('  [' + (i + 1) + '] 전체: ' + JSON.stringify(m[0]));
            if (m.length > 1) {
              for (let g = 1; g < m.length; g++) {
                if (m[g] !== undefined) {
                  listLines.push('      그룹 ' + g + ': ' + JSON.stringify(m[g]));
                }
              }
            }
          });
        }
      } else {
        const m = re.exec(input);
        if (!m) {
          listLines.push('매칭 없음.');
        } else {
          matches.push({
            index: m.index,
            full: m[0],
            groups: Array.from(m).slice(1)
          });
          listLines.push('매칭됨.');
          listLines.push('  전체: ' + JSON.stringify(m[0]));
          for (let g = 1; g < m.length; g++) {
            if (m[g] !== undefined) {
              listLines.push('  그룹 ' + g + ': ' + JSON.stringify(m[g]));
            }
          }
        }
      }

      let replaceResult;
      if (replacementStr != null && replacementStr !== '') {
        replaceResult = input.replace(re, replacementStr);
      }

      return {
        ok: true,
        matches,
        listLines,
        replaceResult
      };
    } catch (e) {
      return { error: '정규식 오류: ' + e.message };
    }
  }
}
