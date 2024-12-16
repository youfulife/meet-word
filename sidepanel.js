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

// 显示单词
function displayWords(words) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空内容

  if (Object.keys(words).length === 0) {
    container.textContent = "No words found!";
    return;
  }

   // 显示单词总数量
  const wordCountContainer = document.getElementById("wordCount");
  wordCountContainer.textContent = `Total words: ${words.length}`;


  const list = document.createElement("ul");

  words.forEach((word) => {
    const item = document.createElement("li"); // 创建一个 <li> 元素
    item.textContent = word; // 设置 <li> 元素的文本内容为当前的单词
    list.appendChild(item); // 将 <li> 元素添加到 <ul> 元素中
  });
  
  container.appendChild(list);
}

// 显示翻译
function displayTranslate(translate) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空内容
  const pre = document.createElement("pre");
  pre.textContent = translate;
  container.appendChild(pre);
}

// 显示翻译结果（每个单词一行显示）
function displayTranslatedWords(translations, filterTag = null) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空容器
  let displayedCount = 0; // 计数器

  if (translations.error) {
    container.textContent = translations.error;
    return;
  }

  for (const [word, details] of Object.entries(translations)) {
    // 如果当前过滤标签不为空且单词不属于该标签，则跳过
    if (filterTag && !details.tags.includes(filterTag)) continue;

    // 单词容器
    const wordItem = document.createElement("div");
    wordItem.className = "word-item";

    // 单词标题
    const wordTitle = document.createElement("div");
    wordTitle.className = "word-title";
    wordTitle.textContent = word;

    // 单词翻译
    const wordTranslation = document.createElement("div");
    wordTranslation.className = "word-translation";
    wordTranslation.textContent = details.translation;

    // 组装单词内容
    wordItem.appendChild(wordTitle);
    wordItem.appendChild(wordTranslation);

    // 添加到主容器
    container.appendChild(wordItem);
    displayedCount++;
  }

  // 更新单词总数
  const wordCountContainer = document.getElementById("wordCount");
  wordCountContainer.textContent = `Total words: ${displayedCount}`;

}

// 创建标签按钮
function displayTagButtons(tags, translations) {
  const tagsContainer = document.getElementById("tagsContainer");
  tagsContainer.innerHTML = ""; // 清空标签容器

  // 创建“全部”按钮
  const allButton = document.createElement("button");
  allButton.className = "tag-button";
  allButton.textContent = "全部";
  allButton.addEventListener("click", () => {
    displayTranslatedWords(translations); // 显示所有单词
  });
  tagsContainer.appendChild(allButton);

  // 根据标签动态创建按钮
  tags.forEach((tag) => {
    const tagButton = document.createElement("button");
    tagButton.className = "tag-button";
    tagButton.textContent = tag; // 中文标签直接显示
    tagButton.addEventListener("click", () => {
      displayTranslatedWords(translations, tag); // 过滤单词
    });
    tagsContainer.appendChild(tagButton);
  });
}

// 加载单词并翻译
async function loadWordsAndTranslations() {
  try {
    // 1. 提取单词
    const words = await fetchWords();
    // displayWords(words);

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

    // 显示标签按钮和翻译结果
    displayTagButtons(tags, translateResult);
    displayTranslatedWords(translateResult);

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

// 绑定刷新按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshButton");
  const translateButton = document.getElementById("translateButton");

  // 初次加载单词和翻译
  loadWordsAndTranslations();

  // 点击刷新按钮时重新加载
  refreshButton.addEventListener("click", () => {
    loadWordsAndTranslations();
  });

});