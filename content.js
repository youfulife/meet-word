function extractSentences() {
    const bodyText = document.body.innerText;
  
    // 匹配完整的英文句子（句末标点为 . ! ?）
    const sentences = bodyText.match(/[A-Z][^.?!]*[a-zA-Z][^.?!]*[.?!]/g);
  
    // 去除句子中非字母、非空格字符的干扰
    const cleanedSentences = sentences
      ? sentences.map(sentence => sentence.replace(/[^a-zA-Z\s.,!?\"']/g, "").trim())
      : [];
  
    return cleanedSentences;
  }
  

// 分割文本为句子，并提取单词
function extractWordsAndSentences() {
    const sentences = extractSentences();
    const wordSentenceMap = {};

    sentences.forEach((sentence) => {
        // 提取句子中的单词
        const words = sentence.match(/\b[a-zA-Z]+\b/g) || [];
        words.forEach((word) => {
            const lowerWord = word.toLowerCase(); // 转为小写
            if (!wordSentenceMap[lowerWord]) {
                wordSentenceMap[lowerWord] = [];
            }
            wordSentenceMap[lowerWord].push(sentence.trim());
        });
    });

    console.log("Word-Sentence Map:", wordSentenceMap);
    return wordSentenceMap;
}

// 响应消息请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractWordsAndSentences") {
        const result = extractWordsAndSentences();
        sendResponse({ wordSentenceMap: result });
    }
});



// 提取页面所有文本内容中的单词
function extractWords() {
    const bodyText = document.body.innerText;
    let words = bodyText.match(/\b[a-zA-Z]+\b/g);
    // 去重
    words = words ? Array.from(new Set(words)) : [];
    return words

}


// 监听来自 Background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractWords') {
        const words = extractWords();
        sendResponse({ words }); // 返回提取的单词
    }
});
