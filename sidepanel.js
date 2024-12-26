// Description: 侧边栏的逻辑处理
let isFilterStarredActive = false; // 用于记录是否处于过滤收藏状态
let selectedTags = new Set(); // 用于记录选中的标签
let wordSentenceMap = {}; // 用于存储单词对应的句子

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
function displayTranslatedWords(translations) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空容器
  let displayedCount = 0; // 计数器

  getBookmarks((bookmarks) => {
    const bookmarkSet = new Set(bookmarks);

    for (const [word, details] of Object.entries(translations)) {
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

      // 添加展开/收起图标
      const toggleButton = document.createElement("button");
      toggleButton.classList.add("toggle-button");
      toggleButton.textContent = "▼"; // 初始状态为收起
      toggleButton.dataset.word = word;

      // 句子容器
      const sentenceContainer = document.createElement("div");
      sentenceContainer.classList.add("sentence-container");
      sentenceContainer.style.display = "none"; // 初始隐藏
      // 添加对应的句子
      const sentences = wordSentenceMap[word] || [];
      sentences.forEach((sentence, index) => {
        const sentenceElement = document.createElement("p");
        // 高亮目标单词
        const highlightedSentence = sentence.replace(
          new RegExp(`\\b(${word})\\b`, "gi"), // 匹配整个单词，忽略大小写
          `<span class="highlight">$1</span>`  // 用高亮样式包裹
        );
        sentenceElement.innerHTML = `${index + 1}. ${highlightedSentence}`;
        sentenceElement.classList.add("sentence-item");
        sentenceContainer.appendChild(sentenceElement);
      });


      // 点击切换显示
      toggleButton.addEventListener("click", () => {
        const isHidden = sentenceContainer.style.display === "none";
        sentenceContainer.style.display = isHidden ? "block" : "none";
        toggleButton.textContent = isHidden ? "▲" : "▼"; // 更新图标
      });

      wordTitle.appendChild(toggleButton); // 添加图标到单词标题

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
      container.appendChild(sentenceContainer); // 添加句子容器到单词容器
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

    // 提取句子
    wordSentenceMap = await fetchWordsAndSentences();

    // 2. 请求翻译
    const translateResult = await translateWords(words);

    // console.log("Translation Result:", translateResult);

    if (translateResult.error && Object.keys(translateResult).length === 1) {
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

function getBookmarksFromStorageSync() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["bookmarks"], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(new Set(result.bookmarks || [])); // 返回一个 Set 数据结构
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

async function fetchWordsAndSentences() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "extractWordsAndSentences" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            reject(chrome.runtime.lastError || "No response from content script");
          } else {
            resolve(response.wordSentenceMap);
          }
        }
      );
    });
  });
}

async function loadFontAsBase64(url) {
  const response = await fetch(url);
  const fontBuffer = await response.arrayBuffer();

  // 使用 FileReader 来避免堆栈溢出
  return new Promise((resolve, reject) => {
    const blob = new Blob([fontBuffer]);
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]); // 只提取 Base64 部分
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

async function exportToPDF() {
  const fontURL = chrome.runtime.getURL("fonts/SourceHanSans-Normal.ttf");
  const base64Font = await loadFontAsBase64(fontURL);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // 检查 autoTable 是否加载
  if (!doc.autoTable) {
    console.error("jsPDF autoTable plugin not loaded!");
    return;
  }

  // 添加字体到 jsPDF
  doc.addFileToVFS("SourceHanSans-Normal.ttf", base64Font);
  doc.addFont("SourceHanSans-Normal.ttf", "SourceHanSans", "normal");
  doc.setFont("SourceHanSans");

  // 获取当前活动标签页的标题和 URL
  const [activeTab] = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs));
  });
  const pageTitle = activeTab.title || "未知";
  const pageURL = activeTab.url || "未知";

  // 添加标题
  const today = new Date().toLocaleDateString();
  doc.setFontSize(18);
  doc.text("Words in Page", 10, 20);
  doc.setFontSize(12);
  doc.text(`日期: ${today}`, 10, 30);
  doc.text(`页面标题: ${pageTitle}`, 10, 40);
  doc.text(`页面地址: ${pageURL}`, 10, 50);


  // 准备表格数据
  const bookmarks = await getBookmarksFromStorageSync(); // 获取收藏的单词
  // 添加单词数量信息
  doc.text(`单词数量: ${bookmarks.size}`, 10, 60);
  const tableData = [];
  bookmarks.forEach((word) => {
    const sentences = wordSentenceMap[word] || [];
    const translation = window.translatedWords[word]?.translation; // 获取翻译

    // 忽略没有翻译的单词
    if (!translation) {
      return;
    }

    // 整理表格行数据，例句用黑点列表
    const formattedSentences = sentences.map(
      (sentence) => `${sentence}`
    ).join("\n\n");

    // 整理表格行数据
    tableData.push({
      单词: word,
      翻译: translation,
      例句: formattedSentences, // 多个句子用换行分隔
    });
  });

  // 使用 jspdf-autotable 绘制表格
  doc.autoTable({
    head: [["单词", "翻译", "例句"]],
    body: tableData.map((row) => [row.单词, row.翻译, row.例句]),
    styles: { font: "SourceHanSans", fontSize: 13 }, // 字体稍微大一点
    startY: 70, // 表格起始位置
    margin: { left: 10, right: 10 },
    columnStyles: {
      0: { cellWidth: 40 }, // 单词列宽度
      1: { cellWidth: 60 }, // 翻译列宽度
      2: { cellWidth: 80 }, // 例句列宽度
    },
    bodyStyles: { valign: "top" },
    headStyles: { fillColor: [52, 73, 94], textColor: 255 }, // 表头样式 
    theme: "grid",
  });



  // 在 doc.save 调用前生成带日期的文件名
  const todayDate = new Date().toISOString().split("T")[0]; // 格式化日期为 YYYY-MM-DD
  const fileName = `生词本_${todayDate}.pdf`;

  // 保存 PDF
  doc.save(fileName);
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

  // 绑定导出按钮点击事件
  document.getElementById("exportButton").addEventListener("click", exportToPDF);

});
