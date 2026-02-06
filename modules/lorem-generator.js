const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

export class LoremGenerator {
  static generateWords(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(LOREM_WORDS[i % LOREM_WORDS.length]);
    }
    return result.join(' ');
  }

  static generateParagraphs(count) {
    const paragraphs = [];
    for (let p = 0; p < count; p++) {
      const sentenceCount = 4 + (p % 4);
      const sentences = [];
      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = 8 + Math.floor(Math.random() * 8);
        let sentence = LoremGenerator.generateWords(wordCount);
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
        sentences.push(sentence);
      }
      paragraphs.push(sentences.join(' '));
    }
    return paragraphs.join('\n\n');
  }

  static generate(mode, count) {
    if (mode === 'words') {
      return LoremGenerator.generateWords(Math.max(1, Math.min(500, count)));
    }
    return LoremGenerator.generateParagraphs(Math.max(1, Math.min(20, count)));
  }
}
