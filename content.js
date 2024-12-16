// 提取页面所有文本内容中的单词
function extractWords() {
    const bodyText = document.body.innerText;
    let words = bodyText.match(/\b[a-zA-Z]+\b/g);
    // 去重
    words = words ? Array.from(new Set(words)) : [];
    // 过滤掉长度小于4个字母的单词
    // words = words.filter(word => word.length >= 4);

    // 按字母排序
    // words = words.sort((a, b) => a.localeCompare(b));

    // 转换为全部小写
    return words.map(word => word.toLowerCase());

}

// 监听来自 Background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractWords') {
        const words = extractWords();
        sendResponse({ words }); // 返回提取的单词
    }
});
