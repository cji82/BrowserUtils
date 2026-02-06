export class TabManager {
  static async getCurrentTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.map(t => ({ url: t.url, title: t.title }));
  }

  static async saveTabs() {
    const tabs = await this.getCurrentTabs();
    await chrome.storage.local.set({ savedTabs: tabs, savedAt: Date.now() });
    return tabs;
  }

  static async getSavedTabs() {
    const { savedTabs } = await chrome.storage.local.get('savedTabs');
    return savedTabs || [];
  }

  static async restoreTabs() {
    const saved = await this.getSavedTabs();
    for (const tab of saved) {
      await chrome.tabs.create({ url: tab.url });
    }
    return saved.length;
  }

  static async closeDuplicates() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const seen = new Set();
    let closed = 0;
    for (const tab of tabs) {
      if (seen.has(tab.url)) {
        await chrome.tabs.remove(tab.id);
        closed++;
      } else {
        seen.add(tab.url);
      }
    }
    return closed;
  }
}
