
// Allows users to open the side panel by clicking on the action toolbar icon
// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));


function setupContextMenu() {
  chrome.contextMenus.create({
    id: 'meet-word',
    title: '提取所有单词',
    contexts: ['all'],
  });
}

chrome.runtime.onInstalled.addListener(function () {
  setupContextMenu();
});

chrome.contextMenus.onClicked.addListener((data, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "extractWords" }, (response) => {
    chrome.storage.session.set({ words: response.words }, () => {
      console.log("Words saved to local storage:", response.words); // 打印存储信息
    });
  });

  // Make sure the side panel is open.
  chrome.sidePanel.open({ tabId: tab.id });

});

