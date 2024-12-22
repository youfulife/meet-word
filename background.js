const API_BASE_URL = "http://127.0.0.1:5000"; // 后端服务的基础 URL
const userId = "user123"; // 假设从存储或登录信息中获取

// saveBookmarksToServer 函数用于将收藏保存到服务器
function saveBookmarksToServer(bookmarks) {
  fetch(`${API_BASE_URL}/saveBookmarks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      bookmarks: Array.from(bookmarks),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        console.log("Bookmarks saved successfully.");
      } else {
        console.error("Failed to save bookmarks:", data.message);
      }
    })
    .catch((error) => console.error("Error saving bookmarks:", error));
}

async function loadBookmarksFromServer(callback) {
  
  try {
    const response = await fetch(`${API_BASE_URL}/getBookmarks?userId=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Background Bookmarks loaded from server:", data);
    return data;
  } catch (error) {
    console.error("Error loading bookmarks:", error);
    return { status: "error", message: "Failed to load bookmarks" };
  }
}

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
  } else if (message.action === "saveBookmarks") {
    // 保存收藏到服务器
    saveBookmarksToServer(message.bookmarks);
    return true; // 异步响应
  } else if (message.action === "loadBookmarks") {
    loadBookmarksFromServer()
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error("Error loading bookmarks:", error);
        sendResponse({ status: "error", message: "Failed to load bookmarks" });
      });
    return true; // 异步响应
  }
});

