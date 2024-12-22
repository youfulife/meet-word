// Description: 侧边栏的逻辑处理
let isFilterStarredActive = false; // 用于记录是否处于过滤收藏状态
let selectedTags = new Set(); // 用于记录选中的标签

// 向 Background 请求提取当前页面的单词
function fetchWords() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "fetchWords" }, (response) => {
      const words = response?.words || [];
      resolve(words);
    });
  });
}

// 向 Background 请求翻译所有单词
function translateWords(words) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "translateWords", words }, (response) => {
      resolve(response?.translations || {});
    });
  });
}



// 显示翻译结果（每个单词一行显示）
function displayTranslatedWords(translations, activeTags = null) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空容器
  let displayedCount = 0; // 计数器

  if (translations.error) {
    container.textContent = translations.error;
    return;
  }

  getBookmarks((bookmarks) => {
    const bookmarkSet = new Set(bookmarks);

    for (const [word, details] of Object.entries(translations)) {
      // 如果当前有选中标签，过滤不匹配的单词
      if (activeTags && !details.tags.some((tag) => activeTags.includes(tag))) {
        continue;
      }

      // 单词容器
      const wordItem = document.createElement("div");
      wordItem.className = "word-item";


      // 单词收藏
      const bookmarkButton = document.createElement("button");
      bookmarkButton.classList.add("bookmark-button");
      bookmarkButton.dataset.word = word;
      bookmarkButton.title = "收藏";
      // 设置收藏状态
      if (bookmarkSet.has(word)) {
        bookmarkButton.textContent = "★"; // 实心星
        bookmarkButton.classList.add("bookmarked");
      } else {
        bookmarkButton.textContent = "☆"; // 空心星
        bookmarkButton.classList.remove("bookmarked");
      }

      // 绑定点击事件
      bookmarkButton.addEventListener("click", (event) => toggleBookmark(event));


      // 单词
      const wordTitle = document.createElement("div");
      wordTitle.className = "word-title";
      wordTitle.textContent = word;

      // 单词翻译
      const wordTranslation = document.createElement("div");
      wordTranslation.className = "word-translation";
      wordTranslation.textContent = details.translation;

      // 组装单词内容
      wordItem.appendChild(bookmarkButton);
      wordItem.appendChild(wordTitle);
      wordItem.appendChild(wordTranslation);

      // 添加到主容器
      container.appendChild(wordItem);
      displayedCount++;
    }
  });

}

function saveBookmarksToStorage(bookmarks) {
  chrome.storage.sync.set({ bookmarks });
}

function getBookmarks(callback) {
  chrome.storage.sync.get("bookmarks", (result) => {
    callback(result.bookmarks || []);
  });
}

// 切换收藏状态
function toggleBookmark(event) {
  const button = event.target;
  const word = button.dataset.word;

  getBookmarks((bookmarks) => {
    const bookmarkSet = new Set(bookmarks);

    if (bookmarkSet.has(word)) {
      bookmarkSet.delete(word); // 取消收藏
      button.textContent = "☆"; // 空心星
      button.classList.remove("bookmarked");
    } else {
      bookmarkSet.add(word); // 添加收藏
      button.textContent = "★"; // 实心星
      button.classList.add("bookmarked");
    }

    saveBookmarksToStorage([...bookmarkSet]); // 保存更新后的收藏列表
    saveBookmarksToServer([...bookmarkSet]);

  });
}

// 创建标签按钮
function displayTagButtons(tags, translations) {
  const tagsContainer = document.getElementById("tagsContainer");
  tagsContainer.innerHTML = ""; // 清空标签容器

  // 选中的按钮引用
  let activeButton = null;

  // 创建“全部”按钮
  const allButton = document.createElement("button");
  allButton.className = "tag-button";
  allButton.textContent = "全部";
  allButton.addEventListener("click", () => {
    selectedTags.clear(); // 清空所有选中标签

    // 更新按钮样式
    const buttons = tagsContainer.querySelectorAll(".tag-button");
    buttons.forEach((btn) => btn.classList.remove("active"));

    displayTranslatedWords(translations);
  });
  tagsContainer.appendChild(allButton);

  // 根据标签动态创建按钮
  // 普通标签（去掉 "其他" 标签后处理）

  tags.forEach((tag) => {
    const tagButton = document.createElement("button");
    tagButton.className = "tag-button";
    tagButton.textContent = tag; // 中文标签直接显示
    tagButton.addEventListener("click", () => {
      toggleTagFilter(tag, tagButton); // 调用过滤逻辑
    });
    tagsContainer.appendChild(tagButton);
  });

}

// 加载单词并翻译
async function loadWordsAndTranslations() {
  try {
    // 1. 提取单词
    const words = await fetchWords();

    // 2. 请求翻译
    const translateResult = await translateWords(words);

    if (translateResult.error) {
      updateWordsContainer(translateResult.error);
      return;
    }

    // 提取唯一标签
    const tags = new Set();
    for (const details of Object.values(translateResult)) {
      details.tags.forEach((tag) => tags.add(tag));
    }

    window.translatedWords = translateResult; // 存储翻译结果到全局变量

    // 显示标签按钮和翻译结果
    displayTagButtons(tags, translateResult);
    applyFilters(); // 应用过滤条件

  } catch (error) {
    console.error("Error loading words or translations:", error);
    const container = document.getElementById("wordsContainer");
    container.textContent = "An error occurred. Please try again.";
  }
}

// 更新单词容器内容
function updateWordsContainer(content) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = content;
}

function toggleStarredFilter() {
  isFilterStarredActive = !isFilterStarredActive;

  const filterButton = document.getElementById("filterStarredButton");
  if (isFilterStarredActive) {
    filterButton.classList.add("active");
    filterButton.textContent = "显示收藏";
  } else {
    filterButton.classList.remove("active");
    filterButton.textContent = "显示全部";
  }

  applyFilters(); // 重新应用过滤条件
}

// 标签过滤逻辑
function toggleTagFilter(tag, button) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
    button.classList.remove("active");
  } else {
    selectedTags.add(tag);
    button.classList.add("active");
  }
  applyFilters(); // 重新应用过滤条件
}

// 过滤逻辑整合
function applyFilters() {
  const allWords = window.translatedWords || {}; // 获取翻译结果
  let filteredWords = { ...allWords };

  // 标签过滤
  if (selectedTags.size > 0) {
    filteredWords = Object.entries(filteredWords).reduce((result, [word, data]) => {
      if (data.tags.some((tag) => selectedTags.has(tag))) {
        result[word] = data;
      }
      return result;
    }, {});
  }

  // 收藏过滤
  if (isFilterStarredActive) {
    getBookmarks((bookmarks) => {
      const bookmarkSet = new Set(bookmarks);
      filteredWords = Object.entries(filteredWords).reduce((result, [word, data]) => {
        if (bookmarkSet.has(word)) {
          result[word] = data;
        }
        return result;
      }, {});
      updateWordCount(filteredWords); // 更新单词总数

      displayTranslatedWords(filteredWords); // 更新显示
    });
  } else {
    updateWordCount(filteredWords); // 更新单词总数

    displayTranslatedWords(filteredWords); // 无收藏过滤时直接显示
  }
}

// 更新单词总数显示
function updateWordCount(words) {
  const wordCountDisplay = document.getElementById("wordCount");
  const count = Object.keys(words).length;
  wordCountDisplay.textContent = `总数: ${count}`;
}

// 保存收藏到服务器
function saveBookmarksToServer(bookmarks) {
  chrome.runtime.sendMessage({
    action: "saveBookmarks", bookmarks
  }, (response) => {
    console.log("Bookmarks saved to server:", response);
  });
}

// 封装 chrome.runtime.sendMessage 为 Promise
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// 封装 chrome.storage.sync.set 为 Promise
function saveBookmarksToStorageSync(bookmarks) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ bookmarks: Array.from(bookmarks) }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

async function loadBookmarksFromServer() {
  try {
    const response = await sendMessageToBackground({ action: "loadBookmarks" });
    if (response && response.status === "success") {
      bookmarkSet = new Set(response.bookmarks || []);
      await saveBookmarksToStorageSync(bookmarkSet); // 同步到本地存储
      console.log("Bookmarks loaded from server:", response.bookmarks);

      // 更新 UI
      applyFilters();
    } else {
      console.error("Failed to load bookmarks:", response ? response.message : "No response");
    }
  } catch (error) {
    console.error("Error loading bookmarks from server:", error);
  }
}



// 绑定刷新按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshButton");

  document.getElementById("filterStarredButton").addEventListener("click", toggleStarredFilter);

  loadBookmarksFromServer();

  // 初次加载单词和翻译
  loadWordsAndTranslations();

  // 点击刷新按钮时重新加载
  refreshButton.addEventListener("click", () => {
    loadWordsAndTranslations();
  });

});
