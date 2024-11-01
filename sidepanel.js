
chrome.storage.session.get('words', ({ wordList }) => {
    displayWords(wordList);
});

chrome.storage.session.onChanged.addListener((changes) => {
    displayWords(changes.words.newValue);
});

function displayWords(words) {
    if (!words) {
        return;
    }
    const wordList = document.getElementById('wordList');
    // 清空了该元素的所有现有内容
    wordList.innerHTML = '';
    words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        wordList.appendChild(li);
    });
}

