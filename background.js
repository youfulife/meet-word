
// // Allows users to open the side panel by clicking on the action toolbar icon
// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));


// function setupContextMenu() {
//   chrome.contextMenus.create({
//     id: 'meet-word',
//     title: '提取所有单词',
//     contexts: ['all'],
//   });
// }

// chrome.runtime.onInstalled.addListener(function () {
//   setupContextMenu();
// });

// chrome.contextMenus.onClicked.addListener((data, tab) => {
//   // chrome.tabs.sendMessage(tab.id, { action: "extractWords" }, (response) => {
//   //   chrome.storage.session.set({ words: response.words }, () => {
//   //     console.log("Words saved to local storage:", response.words); // 打印存储信息
//   //   });
//   // });

//   // Make sure the side panel is open.
//   chrome.sidePanel.open({ tabId: tab.id });

// });

const OPENAI_API_KEY = "sk-iO5je7DjCHusfAqzB0A8E50a9c7f4a4783B78c092000A1Db"; // 替换为你的 API 密钥

// 调用 OpenAI API 翻译所有单词
async function translateWords(words) {

  const url = "https://ai.ujing.com.cn/v1/chat/completions";

  const body = JSON.stringify({
    model: "gpt-4o",
    messages: [
      { role: 'system', content: "将所有以逗号分割的英文单词转换为包括中文翻译，帮助我过滤掉一些重复的，特别简单的单词，每个单词单独一行，每个单词的中英文之间通过:分割。请检查所有信息是否准确，并在回答时保持简洁，不需要任何其他反馈。" },
      { role: 'user', content:  `${words.join(", ")}` }
    ],
    max_tokens: 1000 // 根据需要调整
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: body
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();

  // 提取翻译结果
  const translationsRaw = data.choices[0].message.content.trim();
  return translationsRaw
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

