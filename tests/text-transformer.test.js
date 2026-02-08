import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TextTransformer } from '../modules/text-transformer.js';

describe('TextTransformer', () => {
  it('toUpperCase / toLowerCase', () => {
    assert.strictEqual(TextTransformer.toUpperCase('hello'), 'HELLO');
    assert.strictEqual(TextTransformer.toLowerCase('HELLO'), 'hello');
  });

  it('toCamelCase', () => {
    assert.strictEqual(TextTransformer.toCamelCase('hello world'), 'helloWorld');
    assert.strictEqual(TextTransformer.toCamelCase('hello_world'), 'helloWorld');
  });

  it('toSnakeCase', () => {
    assert.strictEqual(TextTransformer.toSnakeCase('helloWorld'), 'hello_world');
  });

  it('toKebabCase', () => {
    assert.strictEqual(TextTransformer.toKebabCase('helloWorld'), 'hello-world');
  });
});
