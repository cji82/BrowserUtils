export class TextTransformer {
  static toUpperCase(text) {
    return String(text).toUpperCase();
  }

  static toLowerCase(text) {
    return String(text).toLowerCase();
  }

  static toCamelCase(text) {
    const s = String(text).trim().replace(/[^\w\s-]/g, '');
    return s.split(/[\s_-]+/).map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }

  static toSnakeCase(text) {
    const s = String(text).trim();
    return s.replace(/([A-Z])/g, '_$1').replace(/[\s-]+/g, '_').replace(/^_/, '').toLowerCase();
  }

  static toKebabCase(text) {
    const s = String(text).trim();
    return s.replace(/([A-Z])/g, '-$1').replace(/[\s_]+/g, '-').replace(/^-/, '').toLowerCase();
  }
}
