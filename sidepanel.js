
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
function fetchWords() {
  chrome.runtime.sendMessage(
    { action: "fetchWords" },
    (response) => {
      const words = response?.words || [];
      displayWords(words);
    }
  );
}

// 展示单词列表到页面
function displayWords(words) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = ""; // 清空内容

  if (words.length === 0) {
    container.textContent = "No words found!";
    return;
  }

  // 创建单词列表
  const list = document.createElement("ul");
  words.forEach((word) => {
    const item = document.createElement("li");
    item.textContent = word;
    list.appendChild(item);
  });
  container.appendChild(list);
}

// 页面加载后获取单词数据
document.addEventListener("DOMContentLoaded", fetchWords);

