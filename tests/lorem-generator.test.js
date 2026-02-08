import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LoremGenerator } from '../modules/lorem-generator.js';

describe('LoremGenerator', () => {
  it('generate words: 요청한 개수만큼 단어', () => {
    const s = LoremGenerator.generate('words', 5);
    const words = s.split(/\s+/);
    assert.strictEqual(words.length, 5);
  });

  it('generate paragraphs: 문단 수', () => {
    const s = LoremGenerator.generate('paragraphs', 2);
    const paras = s.split(/\n\n/);
    assert.strictEqual(paras.length, 2);
  });

  it('generateWords 직접 호출', () => {
    assert.strictEqual(LoremGenerator.generateWords(1), 'lorem');
    assert.ok(LoremGenerator.generateWords(3).split(/\s+/).length === 3);
  });
});
