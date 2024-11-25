
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
  }
});

