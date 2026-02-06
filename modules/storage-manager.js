export class StorageManager {
  static async getStorage(tabId, type = 'local') {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType) => {
        const storage = storageType === 'session' ? sessionStorage : localStorage;
        const items = {};
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          items[key] = storage.getItem(key);
        }
        return items;
      },
      args: [type]
    });
    if (results[0] && results[0].result) return results[0].result;
    return {};
  }

  static async setItem(tabId, type, key, value) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType, k, v) => {
        const storage = storageType === 'session' ? sessionStorage : localStorage;
        storage.setItem(k, v);
      },
      args: [type, key, value]
    });
  }

  static async removeItem(tabId, type, key) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (storageType, k) => {
        const storage = storageType === 'session' ? sessionStorage : localStorage;
        storage.removeItem(k);
      },
      args: [type, key]
    });
  }
}
