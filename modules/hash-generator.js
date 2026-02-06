export class HashGenerator {
  static async generate(text, algorithm = 'SHA-256') {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'generateHash', text, algorithm },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            reject(new Error(response.error));
          } else if (response && response.hash) {
            resolve(response.hash);
          } else {
            reject(new Error('해시 생성 실패'));
          }
        }
      );
    });
  }
}
