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

// 加载单词并翻译
async function loadWordsAndTranslations(isTranslate = false) {
  try {
    // 1. 提取单词
    const words = await fetchWords();
    displayWords(words);

    // 2. 请求翻译
    if(isTranslate) {
      const translateResult = await translateWords(words);
      displayTranslate(translateResult);
    }

  } catch (error) {
    console.error("Error loading words or translations:", error);
    const container = document.getElementById("wordsContainer");
    container.textContent = "An error occurred. Please try again.";
  }
}

// 绑定刷新按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshButton");
  const translateButton = document.getElementById("translateButton");

  // 初次加载单词和翻译
  loadWordsAndTranslations(false);

  // 点击刷新按钮时重新加载
  refreshButton.addEventListener("click", () => {
    loadWordsAndTranslations(false);
  });

  // 点击翻译按钮时加载单词并翻译
  translateButton.addEventListener("click", () => {
    loadWordsAndTranslations(true);
  });
});