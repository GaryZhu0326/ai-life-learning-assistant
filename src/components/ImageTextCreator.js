// src/components/ImageTextCreator.js
import React, { useState, useEffect, useRef } from 'react';
import './ToolStyles.css'; // 確保引入共用樣式
import { getGeminiTextResponse } from '../services/geminiService'; // 確保引入 Gemini 服務
import { marked } from 'marked'; // 確保引入 marked 庫，用於解析 Markdown
import useConversationHistory from '../hooks/useConversationHistory'; // 導入自定義 Hook

function ImageTextCreator({ onGoHome }) {
  // 從自定義 Hook 獲取對話管理相關的狀態和方法
  const {
    allConversations,
    currentConversationMessages,
    setCurrentConversationMessages,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    updateConversation,
    loadConversation,
    startNewConversation,
    deleteConversation,
    renameConversation,
    newConversationName,
    setNewConversationName,
  } = useConversationHistory('imageTextCreator'); // 為圖文創作家指定唯一 ID

  // 其他狀態管理
  const [question, setQuestion] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [editingConversationId, setEditingConversationId] = useState(null); // 追蹤正在編輯名稱的對話ID

  const conversationEndRef = useRef(null); // 用於對話區域自動捲動

  // 自我介紹卡片淡出效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 對話更新時自動捲動到最新訊息
  useEffect(() => {
    if (conversationEndRef.current) {
      setTimeout(() => {
        conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentConversationMessages]); // 依賴 currentConversationMessages

  // 處理用戶提交問題
  const handleSubmit = async () => {
    if (!question.trim()) {
      alert("請輸入您的文案創作需求！");
      return;
    }

    setIsLoading(true);
    const userQuestion = question;

    // 將用戶問題添加到當前對話歷史
    const updatedMessages = [...currentConversationMessages, { role: 'user', text: userQuestion, html: userQuestion }];
    setCurrentConversationMessages(updatedMessages); // 更新當前顯示的訊息

    // 如果是新對話，先添加到 allConversations
    let convId = currentConversationId;
    if (!convId) {
      convId = addConversation(newConversationName || '新對話', updatedMessages);
      setCurrentConversationId(convId);
    } else {
      updateConversation(convId, updatedMessages); // 更新已存在的對話
    }

    setQuestion(''); // 清空輸入框
    setRating(0); // 重置評價

    // 構造發送給 Gemini API 的對話歷史格式
    const geminiHistory = updatedMessages.map(msg => ({ // 注意：這裡使用 updatedMessages
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 構建發送給 AI 的完整提示詞
    let fullPromptForGemini = `您是一位專業的AI圖文創作家，請根據用戶的需求和後續對話，提供富有創意和吸引力的文案、表格內容、學習企劃或圖片生成提示詞。
    當您提供清單、對比或具體建議時，請盡可能以 **Markdown 表格** 的形式呈現，讓資訊更清晰。
    在每次回答的最後，請禮貌地反問用戶：「請問這次的協助能夠幫助到您多少呢？」並引導用戶給予 1-5 顆星的評價。
    \n\n用戶需求：${userQuestion}`;

    try {
      const responseText = await getGeminiTextResponse(geminiHistory, fullPromptForGemini);
      const renderedHtml = marked.parse(responseText);

      // 將 AI 回答添加到當前對話歷史
      const finalMessages = [...updatedMessages, { role: 'ai', text: responseText, html: renderedHtml }];
      setCurrentConversationMessages(finalMessages);
      updateConversation(convId, finalMessages); // 更新 allConversations 中的對話

    } catch (error) {
      console.error("圖文創作家 AI 回覆失敗:", error);
      const errorMessages = [...updatedMessages, { role: 'ai', text: "很抱歉，AI 服務目前遇到問題，請稍後再試。" }];
      setCurrentConversationMessages(errorMessages);
      updateConversation(convId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理輸入框 Enter 鍵提交問題，Shift + Enter 換行
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRating = (stars) => {
    setRating(stars);
    alert(`感謝您的 ${stars} 顆星評價！我們會繼續努力。`);
    // AI 接收到評價後，可以發送一個簡短的確認訊息
    const finalMessages = [...currentConversationMessages, { role: 'ai', text: `感謝您的 ${stars} 顆星評價！您的寶貴意見是我們進步的動力。` }];
    setCurrentConversationMessages(finalMessages);
    updateConversation(currentConversationId, finalMessages);
  };

  const handleRenameClick = (id) => {
    setEditingConversationId(id);
  };

  const handleRenameConfirm = (id, newName) => {
    if (newName.trim() && newName !== allConversations.find(conv => conv.id === id)?.name) {
      renameConversation(id, newName);
    }
    setEditingConversationId(null);
  };

  const handleRenameChange = (e) => {
    // 這裡需要修改 setAllConversations 中的 name，但更建議直接在 handleRenameConfirm 中處理
    // 如果是當前對話，也更新 newConversationName
    if (currentConversationId === editingConversationId) {
      setNewConversationName(e.target.value);
    }
  };

  return (
    <div className="tool-container">
      <h2 className="tool-title">AI 文案創作家</h2>

      {/* 自我介紹卡片 */}
      {showIntro && (
        <div className="intro-card fade-out">
          <h3>哈囉！我是您的 AI 文案創作家。</h3>
          <p>
            從精美圖片到吸睛文案，我都能為您輕鬆打造。請告訴我您的創意發想！
          </p>
        </div>
      )}

      {/* 主要工具介面 - 包含側邊欄和對話區 */}
      <div className="main-tool-interface">
        {/* 左側對話列表側邊欄 */}
        <div className="sidebar">
          <button onClick={startNewConversation} className="new-conversation-button">
            + 新對話
          </button>
          <div className="conversation-list">
            {allConversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
              >
                {editingConversationId === conv.id ? (
                  <input
                    type="text"
                    defaultValue={conv.name}
                    onBlur={(e) => handleRenameConfirm(conv.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameConfirm(conv.id, e.target.value);
                      }
                    }}
                    autoFocus
                    className="rename-input"
                    onChange={handleRenameChange} // 更新臨時名稱
                  />
                ) : (
                  <span onClick={() => loadConversation(conv.id)}>
                    {conv.name}
                  </span>
                )}
                <div className="actions">
                  {editingConversationId !== conv.id && (
                    <button onClick={() => handleRenameClick(conv.id)} className="action-icon-button rename-button" title="重新命名">✏️</button>
                  )}
                  <button onClick={() => deleteConversation(conv.id)} className="action-icon-button delete-button" title="刪除對話">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側對話卡片區域 */}
        <div className="tool-card conversation-tool-card">
          {/* 對話名稱顯示和修改 */}
          <div className="current-conversation-header">
            {currentConversationId && editingConversationId !== currentConversationId ? (
              <h3 className="current-conversation-name" onClick={() => handleRenameClick(currentConversationId)}>
                {newConversationName || '未命名對話'} ✏️
              </h3>
            ) : (
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
                onBlur={(e) => handleRenameConfirm(currentConversationId, e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm(currentConversationId, e.target.value);
                  }
                }}
                className="current-conversation-rename-input"
                autoFocus={editingConversationId === currentConversationId}
              />
            )}
          </div>

          {/* 對話顯示區域 */}
          <div className="conversation-display">
            {currentConversationMessages.length === 0 && (
              <div className="conversation-placeholder">
                AI 文案創作家：您好！有什麼可以為您服務的嗎？
              </div>
            )}
            {currentConversationMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <span className="message-role">{msg.role === 'user' ? '您：' : 'AI 創作家：'}</span>
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: msg.html || msg.text }}
                ></div>
                {/* 評價星星只在 AI 的最後一條訊息且包含評價提示，且用戶尚未評價時顯示 */}
                {msg.role === 'ai' && index === currentConversationMessages.length - 1 && rating === 0 && msg.text.includes('請問這次的協助能夠幫助到您多少呢？') && (
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className="star"
                        onClick={() => handleRating(star)}
                        style={{ cursor: 'pointer', fontSize: '2em', color: '#ffc107', margin: '0 5px' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message ai is-loading">
                <span className="message-role">AI 創作家：</span>
                <p className="message-text typing-indicator">思考中...</p>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* 輸入與提交區域 */}
          <div className="input-submit-area">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="請輸入您的需求..."
              className="input-textarea"
              rows="3"
            ></textarea>
            <button onClick={handleSubmit} className="action-button" disabled={isLoading}>
              {isLoading ? '發送中...' : '發送'}
            </button>
          </div>
          <button onClick={onGoHome} className="go-home-button">回首頁</button>
        </div>
      </div>
    </div>
  );
}

export default ImageTextCreator;