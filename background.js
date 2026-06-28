const MDCC_MATCHES = [
  /^https:\/\/chatgpt\.com\//,
  /^https:\/\/chat\.openai\.com\//,
  /^https:\/\/claude\.ai\//,
  /^https:\/\/gemini\.google\.com\//,
  /^https:\/\/www\.perplexity\.ai\//,
  /^https:\/\/poe\.com\//,
  /^https:\/\/chat\.deepseek\.com\//,
  /^https:\/\/www\.doubao\.com\//,
  /^https:\/\/kimi\.moonshot\.cn\//,
  /^https:\/\/tongyi\.aliyun\.com\//,
  /^https:\/\/yuanbao\.tencent\.com\//,
  /^https:\/\/chatglm\.cn\//
];

function isSupportedUrl(url = "") {
  return MDCC_MATCHES.some((pattern) => pattern.test(url));
}

async function injectConverter(tabId, url) {
  if (!tabId || !isSupportedUrl(url)) return;
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (error) {
    console.debug("MDCC inject skipped:", error?.message || error);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    injectConverter(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    injectConverter(tabId, tab.url);
  } catch (error) {
    console.debug("MDCC activate skipped:", error?.message || error);
  }
});
