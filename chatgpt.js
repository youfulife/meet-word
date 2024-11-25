async function fetchChatGPTResponse(inputText) {
    const apiKey = 'sk-iO5je7DjCHusfAqzB0A8E50a9c7f4a4783B78c092000A1Db'; // 请确保将此替换为你的实际API密钥

    try {
        const response = await fetch('https://ai.ujing.com.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: "将所有英文单词转换为包括中文翻译、英文释义和一个例句的完整解释。请检查所有信息是否准确，并在回答时保持简洁，不需要任何其他反馈。" },
                    { role: 'user', content: inputText }
                ]
            })
        });

        const data = await response.json();

        console.log(data);

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            throw new Error('No response from API.');
        }
    } catch (error) {
        throw new Error(`Error: ${error.message}`);
    }
}
