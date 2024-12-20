// Description: 侧边栏的逻辑处理

// 向 Background 请求提取当前页面的单词
function fetchWords() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "fetchWords" }, (response) => {
      const words = response?.words || [];
      resolve(words);
    });
  });
}

// 向 Background 请求 GPT 翻译所有单词
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
        bookmarkButton.classList.add("bookmarked");
      }
      bookmarkButton.textContent = "☆";
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

function saveBookmarks(bookmarks) {
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
      button.classList.remove("bookmarked");
    } else {
      bookmarkSet.add(word); // 添加收藏
      button.classList.add("bookmarked");
    }

    saveBookmarks([...bookmarkSet]); // 保存更新后的收藏列表
  });
}


// 创建标签按钮
// 保存当前选中的标签
let selectedTags = new Set();
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

let isFilterStarredActive = false; // 用于记录是否处于过滤收藏状态

function toggleStarredFilter() {
  isFilterStarredActive = !isFilterStarredActive;

  const filterButton = document.getElementById("filterStarredButton");
  if (isFilterStarredActive) {
    filterButton.classList.add("active");
    filterButton.textContent = "显示收藏";
    // displayStarredWords(); // 显示收藏的单词
  } else {
    filterButton.classList.remove("active");
    filterButton.textContent = "显示全部";
    // refreshWordsList(); // 恢复显示全部单词
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

function displayStarredWords() {
  getBookmarks((bookmarks) => {
    const filteredWords = {};
    const allWords = window.translatedWords || {}; // 从全局变量中获取翻译的单词

    for (const word of bookmarks) {
      if (allWords[word]) {
        filteredWords[word] = allWords[word];
      }
    }

    displayTranslatedWords(filteredWords); // 调用已有函数，重新渲染单词列表
  });
}

function refreshWordsList() {
  if (window.translatedWords) {
    displayTranslatedWords(window.translatedWords); // 全部重新渲染
  }
}

// 绑定刷新按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshButton");

  document.getElementById("filterStarredButton").addEventListener("click", toggleStarredFilter);


  // 初次加载单词和翻译
  loadWordsAndTranslations();

  // 点击刷新按钮时重新加载
  refreshButton.addEventListener("click", () => {
    loadWordsAndTranslations();
  });

});