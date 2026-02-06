export class NetworkMonitor {
  static async start() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'startNetworkMonitor' }, (r) => {
        resolve(r && r.ok);
      });
    });
  }

  static async stop() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'stopNetworkMonitor' }, (r) => {
        resolve(r && r.ok);
      });
    });
  }

  static async getRequests() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getNetworkRequests' }, (r) => {
        resolve(r && r.requests ? r.requests : []);
      });
    });
  }

  static async getStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getNetworkMonitorStatus' }, (r) => {
        resolve(r && r.active);
      });
    });
  }

  static async clear() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'clearNetworkRequests' }, (r) => {
        resolve(r && r.ok);
      });
    });
  }
}
