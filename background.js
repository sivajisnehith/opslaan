chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query(
    {
      url: [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*"
      ]
    },
    (tabs) => {
      for (const tab of tabs) {
        if (!tab.id) continue;

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
      }
    }
  );
});
