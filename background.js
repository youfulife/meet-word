
// 向后端发送单词列表进行翻译
async function translateWords(words) {
  const apiUrl = "http://127.0.0.1:5000/translate";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ words }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error during translation API call:", error);
    return { error: "Failed to fetch translation. Please try again later." };
  }
}


// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchWords") {
    // 获取当前活动的 Tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        // 向 Content Script 发送消息
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "extractWords" },
          (response) => {
            // 将单词列表传回 Side Panel
            sendResponse({ words: response?.words || [] });
          }
        );
      } else {
        sendResponse({ words: [] });
      }
    });

    // 异步响应需要返回 true
    return true;
  } else if (message.action === "translateWords") {
    const words = message.words;

    // 翻译单词
    translateWords(words)
      .then((translations) => sendResponse({ translations }))
      .catch((error) => {
        console.error("Translation Error:", error);
        sendResponse({ translations: [] });
      });

    return true; // 异步响应
  }
});

