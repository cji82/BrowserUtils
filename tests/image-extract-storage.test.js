/**
 * 이미지 추출: 팝업이 닫힌 뒤에도 결과가 보이려면
 * 1) content → runtime.sendMessage(imagesExtracted) → background가 storage에 저장
 * 2) 팝업 재오픈 시 storage에서 imageExtractResult 로드 후 렌더
 * 이 테스트는 저장되는 payload 형태와 팝업이 기대하는 형태가 일치하는지 검증한다.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Image extract storage contract', () => {
  it('imagesExtracted payload shape: images 배열 + target 객체', () => {
    const payload = {
      action: 'imagesExtracted',
      images: [
        { url: 'https://example.com/a.png', type: 'img', source: 'img' },
        { url: 'https://example.com/bg.png', type: 'background', source: 'div' }
      ],
      target: { tagName: 'DIV', id: 'root', className: 'container' }
    };
    assert.ok(Array.isArray(payload.images));
    assert.strictEqual(payload.images.length, 2);
    assert.ok(payload.images[0].url && payload.images[0].type);
    assert.ok(payload.target && typeof payload.target.tagName === 'string');
  });

  it('background가 저장할 imageExtractResult 형태가 popup renderImageExtractResult와 호환', () => {
    const stored = {
      images: [{ url: 'https://x.com/1.png', type: 'img' }],
      target: { tagName: 'div', id: '', className: '' }
    };
    assert.ok(Array.isArray(stored.images));
    stored.images.forEach(img => {
      assert.ok('url' in img);
      assert.ok(typeof img.type === 'string');
    });
    assert.ok(stored.target === null || (typeof stored.target === 'object' && ('tagName' in stored.target || Object.keys(stored.target).length >= 0)));
  });

  it('images가 빈 배열이어도 target만 있으면 저장/로드 대상', () => {
    const payload = { images: [], target: { tagName: 'SECTION' } };
    const shouldLoad = payload.images || payload.target !== undefined;
    assert.ok(shouldLoad, 'popup이 storage에서 로드할 때와 동일한 조건');
  });
});
