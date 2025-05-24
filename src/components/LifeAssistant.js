// src/components/LifeAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import './ToolStyles.css'; // 確保引入共用樣式
import { getGeminiTextResponse } from '../services/geminiService'; // 確保引入 Gemini 服務
import { marked } from 'marked'; // 確保引入 marked 庫，用於解析 Markdown

function LifeAssistant({ onGoHome }) {
  // 狀態管理
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [question, setQuestion] = useState(''); // 用戶當前輸入的問題
  // 對話歷史：每個元素是一個對話訊息物件 { role: 'user'/'ai', text: '原始文本', html: '轉換後的HTML' }
  const [conversation, setConversation] = useState([]);
  const [showIntro, setShowIntro] = useState(true); // 控制自我介紹卡片顯示
  const [isLoading, setIsLoading] = useState(false); // 控制 AI 回應的載入狀態

  const conversationEndRef = useRef(null); // 用於對話區域自動捲動

  // 自我介紹卡片淡出效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3000); // 3秒後隱藏自我介紹
    return () => clearTimeout(timer); // 清除定時器以避免記憶體洩漏
  }, []);

  // 對話更新時自動捲動到最新訊息
  useEffect(() => {
    if (conversationEndRef.current) {
      // 使用 setTimeout 確保 DOM 更新完成後再捲動
      setTimeout(() => {
        conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [conversation]); // 依賴 conversation 狀態，當其更新時觸發

  // 處理用戶提交問題
  const handleSubmit = async () => {
    if (!question.trim()) { // 檢查輸入框是否為空
      alert("請輸入您的問題或需求！");
      return;
    }

    setIsLoading(true); // 開始載入，禁用按鈕
    const userQuestion = question; // 保存用戶當前問題

    // 將用戶問題添加到對話歷史，並清空輸入框
    setConversation(prevConv => [...prevConv, { role: 'user', text: userQuestion, html: userQuestion }]); // 用戶輸入沒有特殊 HTML
    setQuestion('');

    // 構造發送給 Gemini API 的對話歷史格式 (Gemini 要求的 contents 格式)
    // 需要將我們前端的 conversation 狀態轉換為 Gemini API 要求的 role/parts 格式
    const geminiHistory = conversation.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model', // 確保角色名稱符合 API 要求
      parts: [{ text: msg.text }] // 只傳遞原始文本給 AI 作為上下文
    }));

    // 構建發送給 AI 的完整提示詞，包含初始設定和用戶問題
    // 提示 AI 以 Markdown 表格形式回答，以利前端渲染
    let fullPromptForGemini = `您是一位專業的生活管家AI，請根據用戶提供的個人資料和後續的對話，提供飲食或運動方面的詳細規劃和建議，並保持專業和鼓勵的語氣。
    當您提供數值化、清單化或規劃類型的資訊時（例如熱量、食譜、運動計畫等），請盡可能以 **Markdown 表格** 的形式呈現，讓資訊更清晰。如果表格不適用，則使用條列式清單。
    用戶姓名: ${name || '未提供'}
    身高: ${height ? height + ' cm' : '未提供'}
    體重: ${weight ? weight + ' kg' : '未提供'}
    \n\n用戶提問：${userQuestion}`; // 將用戶提問明確指出

    try {
      // 呼叫 Gemini API，傳遞完整的對話歷史和當前用戶問題
      const responseText = await getGeminiTextResponse(geminiHistory, fullPromptForGemini);
      
      // 使用 marked 庫將 AI 返回的 Markdown 文本轉換為 HTML
      const renderedHtml = marked.parse(responseText);

      // 將 AI 回答 (包含原始文本和轉換後的 HTML) 添加到對話歷史
      setConversation(prevConv => [...prevConv, { role: 'ai', text: responseText, html: renderedHtml }]);
    } catch (error) {
      console.error("生活管家 AI 回覆失敗:", error);
      // 如果發生錯誤，也將錯誤訊息添加到對話歷史中
      setConversation(prevConv => [...prevConv, { role: 'ai', text: "很抱歉，AI 服務目前遇到問題，請稍後再試。" }]);
    } finally {
      setIsLoading(false); // 結束載入，啟用按鈕
    }
  };

  // 處理輸入框 Enter 鍵提交問題，Shift + Enter 換行
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 阻止 Enter 鍵的預設行為（換行）
      handleSubmit(); // 提交問題
    }
  };

  return (
    <div className="tool-container">
      <h2 className="tool-title">AI 生活管家</h2>

      {/* 自我介紹卡片 - 載入時顯示，3秒後淡出 */}
      {showIntro && (
        <div className="intro-card fade-out">
          <h3>大家好！我是您的專屬 AI 生活管家。</h3>
          <p>
            無論是飲食規劃、運動建議，還是日常習慣養成，我都能為您量身打造！
            請先輸入您的基本資料，讓我更好地了解您。
          </p>
        </div>
      )}

      {/* 主要工具卡片 - 包含個人資料輸入、對話顯示、問題輸入 */}
      <div className="tool-card conversation-tool-card">
        {/* 個人資料輸入區域 */}
        <div className="personal-info-inputs">
          <div className="input-group">
            <label htmlFor="name">您的稱呼:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              className="input-field"
            />
          </div>
          <div className="input-group">
            <label htmlFor="height">身高 (cm):</label>
            <input
              type="number"
              id="height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="例如：170"
              className="input-field"
            />
          </div>
          <div className="input-group">
            <label htmlFor="weight">體重 (kg):</label>
            <input
              type="number"
              id="weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="例如：65"
              className="input-field"
            />
          </div>
        </div>

        {/* 對話顯示區域 - 所有對話訊息會在這裡呈現 */}
        <div className="conversation-display">
          {/* 如果沒有對話，顯示預設提示 */}
          {conversation.length === 0 && (
            <div className="conversation-placeholder">
              AI 生活管家：您好！有什麼可以為您服務的嗎？
            </div>
          )}
          {/* 遍歷對話歷史，渲染每一條訊息 */}
          {conversation.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <span className="message-role">{msg.role === 'user' ? '您：' : 'AI 管家：'}</span>
              {/* 使用 dangerouslySetInnerHTML 渲染 AI 回應的 HTML (包含表格) */}
              <div
                className="message-text"
                dangerouslySetInnerHTML={{ __html: msg.html || msg.text }} // 如果有 HTML 則渲染 HTML，否則渲染純文字
              ></div>
            </div>
          ))}
          {/* AI 思考中的載入指示 */}
          {isLoading && (
            <div className="message ai is-loading">
              <span className="message-role">AI 管家：</span>
              <p className="message-text typing-indicator">思考中...</p>
            </div>
          )}
          <div ref={conversationEndRef} /> {/* 用於自動捲動到對話底部 */}
        </div>

        {/* 輸入與提交區域 */}
        <div className="input-submit-area">
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress} // 監聽 Enter 鍵提交
            placeholder="請輸入您的問題..."
            className="input-textarea"
            rows="3" // 預設顯示 3 行
          ></textarea>
          <button onClick={handleSubmit} className="action-button" disabled={isLoading}>
            {isLoading ? '發送中...' : '發送'}
          </button>
        </div>

        {/* 回首頁按鈕 */}
        <button onClick={onGoHome} className="go-home-button">回首頁</button>
      </div>
    </div>
  );
}

export default LifeAssistant;