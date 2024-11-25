
// chrome.storage.session.get('words', ({ wordList }) => {
//     displayWords(wordList);
// });

// chrome.storage.session.onChanged.addListener((changes) => {
//     displayWords(changes.words.newValue);
// });

// function displayWords(words) {
//     if (!words) {
//         return;
//     }
//     const wordList = document.getElementById('wordList');
//     // 清空了该元素的所有现有内容
//     wordList.innerHTML = '';
//     words.forEach(word => {
//         const li = document.createElement('li');
//         li.textContent = word;
//         wordList.appendChild(li);
//     });
// }

// 向 Background 请求单词数据
// function fetchWords() {
//   chrome.runtime.sendMessage(
//     { action: "fetchWords" },
//     (response) => {
//       const words = response?.words || [];
//       displayWords(words);
//     }
//   );
// }

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

// 显示单词及其翻译
function displayTranslations(translations) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空内容

  if (Object.keys(translations).length === 0) {
    container.textContent = "No words found!";
    return;
  }

  const list = document.createElement("ul");
  Object.entries(translations).forEach(([word, translation]) => {
    const item = document.createElement("li");
    item.textContent = `${word}: ${translation}`;
    list.appendChild(item);
  });
  container.appendChild(list);
}

// 加载单词并翻译
async function loadWordsAndTranslations() {
  const container = document.getElementById("wordsContainer");
  container.textContent = "Loading...";

  try {
    // 1. 提取单词
    const words = await fetchWords();

    // 2. 请求翻译
    const translations = await translateWords(words);

    // 3. 显示翻译结果
    displayTranslations(translations);
  } catch (error) {
    console.error("Error loading words and translations:", error);
    container.textContent = "Failed to load words. Please try again.";
  }
}

// 绑定刷新按钮事件
document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refreshButton");

  // 初次加载单词和翻译
  loadWordsAndTranslations();

  // 点击刷新按钮时重新加载
  refreshButton.addEventListener("click", () => {
    loadWordsAndTranslations();
  });
});