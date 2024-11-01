function extractWords() {
    const bodyText = document.body.innerText;
    const words = bodyText.match(/\b[a-zA-Z]+\b/g);
    // 去重
    const uniqueWords = words ? Array.from(new Set(words)) : [];
    // 过滤掉长度小于4个字母的单词
    const filteredWords = uniqueWords.filter(word => word.length >= 4);

    // 按字母排序
    const sortedWords = filteredWords.sort((a, b) => a.localeCompare(b));

    // 转换为全部小写
    return sortedWords.map(word => word.toLowerCase());

}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('Received message from background:', message);
    if (message.action === 'extractWords') {
        const words = extractWords();
        sendResponse({ words: words });
    }
});
