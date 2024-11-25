# Words in Page

A simple extension that helps you to learn new words from current page.

# 功能工作流程

1. 用户打开 Side Panel，sidepanel.js 向 background.js 请求当前页面的单词。
2. background.js 获取当前活动 Tab 的 ID，向该 Tab 的 content.js 发送消息。
3. content.js 提取页面的所有文本内容，生成单词列表并返回。
4. sidepanel.js 接收到单词列表后，展示到 Side Panel 的界面中


# 注意事项

Content Script 运行环境: 需要在页面 DOM 完全加载后运行，确保提取到完整的内容。如果页面是动态加载内容（如 SPA），可能需要监听 DOM 变化。



