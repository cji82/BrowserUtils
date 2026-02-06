export class QRGenerator {
  static generate(text, canvasElement) {
    if (!window.QRCode) {
      throw new Error('QRCode 라이브러리를 로드해 주세요.');
    }
    return new Promise((resolve, reject) => {
      QRCode.toCanvas(canvasElement, text, { width: 200 }, (err) => {
        if (err) reject(err);
        else resolve(canvasElement.toDataURL('image/png'));
      });
    });
  }
}
