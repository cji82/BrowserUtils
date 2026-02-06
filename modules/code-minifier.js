export class CodeMinifier {
  static minifyCSS(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*,\s*/g, ',')
      .trim();
  }

  static minifyJS(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';')
      .trim();
  }

  static minify(code, type) {
    if (type === 'css') return this.minifyCSS(code);
    return this.minifyJS(code);
  }

  /** CSS 뷰티파이: 줄바꿈·들여쓰기 */
  static beautifyCSS(code) {
    let out = '';
    let indent = 0;
    const indentStr = '  ';
    const s = code.replace(/\s+/g, ' ').trim();
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '{') {
        out += ' {\n';
        indent++;
        out += indentStr.repeat(indent);
      } else if (c === '}') {
        indent = Math.max(0, indent - 1);
        out += '\n' + indentStr.repeat(indent) + '}';
      } else if (c === ';') {
        out += ';\n' + indentStr.repeat(indent);
      } else {
        out += c;
      }
    }
    return out.trim();
  }

  /** JS 뷰티파이: 줄바꿈·들여쓰기 (문자열/주석 내부 보존) */
  static beautifyJS(code) {
    let out = '';
    let indent = 0;
    let parenDepth = 0;
    const indentStr = '  ';
    const s = code.trim();
    let i = 0;
    let inStr = null;
    let inBlockComment = false;
    let inLineComment = false;

    while (i < s.length) {
      const c = s[i];
      if (inLineComment) {
        out += c;
        if (c === '\n') inLineComment = false;
        i++;
        continue;
      }
      if (inBlockComment) {
        out += c;
        if (c === '*' && s[i + 1] === '/') { out += s[i + 1]; i += 2; inBlockComment = false; } else i++;
        continue;
      }
      if (inStr) {
        out += c;
        if (c === '\\') { i++; if (i < s.length) out += s[i]; }
        else if (c === inStr) inStr = null;
        i++;
        continue;
      }
      if (c === '/' && s[i + 1] === '*') {
        out += c + s[i + 1]; i += 2; inBlockComment = true;
        continue;
      }
      if (c === '/' && s[i + 1] === '/') {
        out += c + s[i + 1]; i += 2; inLineComment = true;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = c;
        out += c;
        i++;
        continue;
      }
      if (c === '(') { parenDepth++; out += c; i++; continue; }
      if (c === ')') { parenDepth = Math.max(0, parenDepth - 1); out += c; i++; continue; }
      if (c === '{') {
        out += ' {\n';
        indent++;
        out += indentStr.repeat(indent);
        i++;
        continue;
      }
      if (c === '}') {
        indent = Math.max(0, indent - 1);
        out += '\n' + indentStr.repeat(indent) + '}';
        i++;
        continue;
      }
      if (c === ';') {
        out += ';';
        if (parenDepth === 0) out += '\n' + indentStr.repeat(indent);
        else out += ' ';
        i++;
        continue;
      }
      out += c;
      i++;
    }
    return out.trim();
  }

  static beautify(code, type) {
    if (type === 'css') return this.beautifyCSS(code);
    return this.beautifyJS(code);
  }
}
