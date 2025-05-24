// src/components/FortuneTeller.js
import React, { useState, useEffect, useRef } from 'react';
import './ToolStyles.css'; // 確保引入共用樣式
import { getGeminiTextResponse } from '../services/geminiService'; // 確保引入 Gemini 服務
import { marked } from 'marked'; // 確保引入 marked 庫，用於解析 Markdown
import useConversationHistory from '../hooks/useConversationHistory'; // 導入自定義 Hook

function FortuneTeller({ onGoHome }) {
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
  } = useConversationHistory('fortuneTeller'); // 為命理大師指定唯一 ID

  // 其他狀態管理
  const [question, setQuestion] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState(null); // 追蹤正在編輯名稱的對話ID

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
      setTimeout(() => { // 使用 setTimeout 確保 DOM 更新完成後再捲動
        conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentConversationMessages]); // 依賴 currentConversationMessages

  // 處理用戶提交問題
  const handleSubmit = async () => {
    if (!question.trim()) { // 檢查輸入框是否為空
      alert("請輸入您的問題！");
      return;
    }

    setIsLoading(true); // 開始載入，禁用按鈕
    const userQuestion = question; // 保存用戶當前問題

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

    // 構造發送給 Gemini API 的對話歷史格式
    const geminiHistory = updatedMessages.map(msg => ({ // 注意：這裡使用 updatedMessages
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 構建發送給 AI 的完整提示詞
    // 提示 AI 以 Markdown 表格形式回答（如果適用）
    let fullPromptForGemini = `您是一位精通生辰年月日、八字命盤、人類圖、阿卡西紀錄的命理大師AI，請根據用戶的問題和後續對話給予指引與建議。
    請在回答中展現專業和智慧，並提供小至生活小事，大至人生目標的建議。
    當您提供相關的數值、日期、或分析結果時，請盡可能以 **Markdown 表格** 的形式呈現，讓資訊更清晰。
    \n\n用戶提問：${userQuestion}`;

    try {
      // 呼叫 Gemini API，傳遞完整的對話歷史和當前用戶問題
      const responseText = await getGeminiTextResponse(geminiHistory, fullPromptForGemini);
      
      // 使用 marked 庫將 AI 返回的 Markdown 文本轉換為 HTML
      const renderedHtml = marked.parse(responseText);

      // 將 AI 回答添加到當前對話歷史
      const finalMessages = [...updatedMessages, { role: 'ai', text: responseText, html: renderedHtml }];
      setCurrentConversationMessages(finalMessages);
      updateConversation(convId, finalMessages); // 更新 allConversations 中的對話

    } catch (error) {
      console.error("命理大師 AI 回覆失敗:", error);
      const errorMessages = [...updatedMessages, { role: 'ai', text: "很抱歉，AI 服務目前遇到問題，請稍後再試。" }];
      setCurrentConversationMessages(errorMessages);
      updateConversation(convId, errorMessages);
    } finally {
      setIsLoading(false); // 結束載入，啟用按鈕
    }
  };

  // 處理輸入框 Enter 鍵提交問題，Shift + Enter 換行
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
    // 如果是當前對話，也更新 newConversationName
    if (currentConversationId === editingConversationId) {
      setNewConversationName(e.target.value);
    }
  };

  return (
    <div className="tool-container">
      <h2 className="tool-title">AI 算命師</h2>

      {/* 自我介紹卡片 */}
      {showIntro && (
        <div className="intro-card fade-out">
          <h3>您好，我是 AI 算命師，專為您提供人生指引。</h3>
          <p>
            精通生辰八字、人類圖、阿卡西紀錄，助您釐清困惑，洞察先機。
            請誠心說出您的問題，讓智慧之光為您指引方向。
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
                AI 命理大師：您好！有什麼可以為您服務的嗎？
              </div>
            )}
            {currentConversationMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <span className="message-role">{msg.role === 'user' ? '您：' : 'AI 大師：'}</span>
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: msg.html || msg.text }}
                ></div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai is-loading">
                <span className="message-role">AI 大師：</span>
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
              placeholder="請輸入您的問題..."
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

export default FortuneTeller;