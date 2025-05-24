// src/components/LanguageExpert.js
import React, { useState, useEffect, useRef } from 'react';
import './LearningToolStyles.css'; // 引入學習工具專用樣式
import { getGeminiTextResponse } from '../services/geminiService'; // 確保引入 Gemini 服務
import { marked } from 'marked'; // 確保引入 marked 庫
import useConversationHistory from '../hooks/useConversationHistory'; // 導入自定義 Hook

function LanguageExpert({ onGoHome }) {
  // 語言選擇階段狀態
  const [selectedLanguage, setSelectedLanguage] = useState(null); // 當前選擇的語言
  const [otherLanguage, setOtherLanguage] = useState(''); // "其他語言"的具體內容

  // AI 對話相關狀態 (使用 useConversationHistory Hook)
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
  } = useConversationHistory('languageExpert'); // 為語言專家指定唯一 ID

  // 對話輸入與 AI 處理狀態
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState(null); // 追蹤正在編輯名稱的對話ID
  const conversationEndRef = useRef(null); // 用於對話區域自動捲動

  // 自我介紹卡片淡出效果 (只在第一次進入工具時顯示)
  const [showIntro, setShowIntro] = useState(true);
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
  }, [currentConversationMessages]);

  // 處理語言選擇
  const handleLanguageSelect = (lang) => {
    setSelectedLanguage(lang);
    setNewConversationName(`${lang} 學習筆記`); // 設定新對話的預設名稱
    // 如果是"其他語言"，清空對話，等待用戶輸入具體語言
    if (lang === '其他語言') {
      startNewConversation(); // 開始新對話，清空所有狀態
      setCurrentConversationMessages([]); // 確保對話紀錄清空
    } else {
      // 選擇特定語言後，可以自動開啟一個新對話
      const initialMessages = [{ role: 'ai', text: `您好！我是您的${lang}老師。請告訴我您的學習程度（例如：幾歲、等級、實際要學的內容等），我可以為您量身打造學習內容。`, html: marked.parse(`您好！我是您的${lang}老師。請告訴我您的學習程度（例如：幾歲、等級、實際要學的內容等），我可以為您量身打造學習內容。`) }];
      setCurrentConversationMessages(initialMessages);
      
      let convId = currentConversationId;
      if (!convId) {
        convId = addConversation(`${lang} 學習筆記`, initialMessages);
        setCurrentConversationId(convId);
      } else {
        updateConversation(convId, initialMessages);
      }
    }
  };

  // 處理提交問題/開始對話
  const handleSubmit = async () => {
    const langToUse = selectedLanguage === '其他語言' ? otherLanguage : selectedLanguage;
    if (!langToUse || !question.trim()) {
      alert("請先選擇學習語言並輸入您的問題！");
      return;
    }

    setIsLoading(true);
    const userQuestion = question;

    // 將用戶問題添加到當前對話歷史
    const updatedMessages = [...currentConversationMessages, { role: 'user', text: userQuestion, html: userQuestion }];
    setCurrentConversationMessages(updatedMessages);

    // 如果是新對話，先添加到 allConversations
    let convId = currentConversationId;
    if (!convId) {
      convId = addConversation(newConversationName || `${langToUse} 學習筆記`, updatedMessages);
      setCurrentConversationId(convId);
    } else {
      updateConversation(convId, updatedMessages);
    }

    setQuestion('');

    // 構造發送給 Gemini API 的對話歷史格式
    const geminiHistory = updatedMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 構建發送給 AI 的完整提示詞
    // 提示 AI 以 Markdown 表格形式回答（如果適用）
    let fullPromptForGemini = `您是我的 AI ${langToUse} 老師，請根據我的學習程度和需求，提供聽說讀寫訓練內容或考試題目。
    請用鼓勵和專業的語氣。當您提供課程內容、詞彙、練習題、對比或建議時，請盡可能以 **Markdown 表格** 的形式呈現，讓資訊更清晰易懂。
    \n\n我的問題或需求：${userQuestion}`;

    try {
      const responseText = await getGeminiTextResponse(geminiHistory, fullPromptForGemini);
      const renderedHtml = marked.parse(responseText);

      const finalMessages = [...updatedMessages, { role: 'ai', text: responseText, html: renderedHtml }];
      setCurrentConversationMessages(finalMessages);
      updateConversation(convId, finalMessages);

    } catch (error) {
      console.error("AI 語言專家回覆失敗:", error);
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

  // 側邊欄操作
  const handleStartNewConversation = () => {
    startNewConversation(); // 清空 Hook 狀態
    setSelectedLanguage(null); // 回到語言選擇畫面
    setOtherLanguage('');
  };

  const handleLoadConversation = (id) => {
    loadConversation(id);
    // 載入後，確保 selectedLanguage 和 otherLanguage 也同步
    const loadedConv = allConversations.find(conv => conv.id === id);
    if (loadedConv) {
      const langMatch = loadedConv.name.match(/^(英文|日文|韓文) 學習筆記$/);
      if (langMatch) {
        setSelectedLanguage(langMatch[1]);
        setOtherLanguage('');
      } else if (loadedConv.name.includes('學習筆記')) {
        setSelectedLanguage('其他語言');
        setOtherLanguage(loadedConv.name.replace(' 學習筆記', ''));
      } else {
        setSelectedLanguage(null); // 如果名稱不符合規則，清空選擇
        setOtherLanguage('');
      }
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
    if (currentConversationId === editingConversationId) {
      setNewConversationName(e.target.value);
    }
  };

  return (
    <div className="tool-container">
      <h2 className="tool-title">AI 語言專家</h2>

      {showIntro && (
        <div className="intro-card fade-out">
          <h3>歡迎來到 AI 語言專家！</h3>
          <p>
            無論您想學習哪種語言，我都能成為您的專屬老師。
            請先選擇您想學習的語言，讓我為您量身打造學習計畫。
          </p>
        </div>
      )}

      <div className="main-tool-interface">
        {/* 左側對話列表側邊欄 */}
        <div className="sidebar">
          <button onClick={handleStartNewConversation} className="new-conversation-button">
            + 新學習計畫
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
                    onChange={handleRenameChange}
                  />
                ) : (
                  <span onClick={() => handleLoadConversation(conv.id)}>
                    {conv.name}
                  </span>
                )}
                <div className="actions">
                  {editingConversationId !== conv.id && (
                    <button onClick={() => handleRenameClick(conv.id)} className="action-icon-button rename-button" title="重新命名">✏️</button>
                  )}
                  <button onClick={() => deleteConversation(conv.id)} className="action-icon-button delete-button" title="刪除計畫">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側語言專家介面 */}
        <div className="tool-card conversation-tool-card">
          {/* 對話名稱顯示和修改 */}
          <div className="current-conversation-header">
            {currentConversationId && editingConversationId !== currentConversationId ? (
              <h3 className="current-conversation-name" onClick={() => handleRenameClick(currentConversationId)}>
                {newConversationName || '未命名學習計畫'} ✏️
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

          {!selectedLanguage ? (
            // 語言選擇介面
            <div className="language-selection-area">
              <h3>請選擇您想學習的語言：</h3>
              <div className="language-buttons">
                <button onClick={() => handleLanguageSelect('英文')} className="language-button">英文老師</button>
                <button onClick={() => handleLanguageSelect('日文')} className="language-button">日文老師</button>
                <button onClick={() => handleLanguageSelect('韓文')} className="language-button">韓文老師</button>
                <button onClick={() => handleLanguageSelect('其他語言')} className="language-button">其他語言</button>
              </div>
              {selectedLanguage === '其他語言' && (
                <div className="input-group" style={{marginTop: '20px'}}>
                  <label htmlFor="other-lang">請輸入具體語言：</label>
                  <input
                    type="text"
                    id="other-lang"
                    value={otherLanguage}
                    onChange={(e) => setOtherLanguage(e.target.value)}
                    placeholder="例如：法文、西班牙文"
                    className="input-field"
                  />
                  <button onClick={() => {
                    if(otherLanguage.trim()) handleLanguageSelect(otherLanguage.trim());
                    else alert("請輸入具體語言！");
                  }} className="action-button" style={{marginTop: '10px'}}>確認語言</button>
                </div>
              )}
            </div>
          ) : (
            // 對話介面
            <>
              <div className="conversation-display">
                {currentConversationMessages.length === 0 && (
                  <div className="conversation-placeholder">
                    AI {selectedLanguage === '其他語言' ? otherLanguage : selectedLanguage} 老師：您好！有什麼可以為您服務的嗎？
                  </div>
                )}
                {currentConversationMessages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`}>
                    <span className="message-role">{msg.role === 'user' ? '您：' : `AI ${selectedLanguage === '其他語言' ? otherLanguage : selectedLanguage} 老師：`}</span>
                    <div
                      className="message-text"
                      dangerouslySetInnerHTML={{ __html: msg.html || msg.text }}
                    ></div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message ai is-loading">
                    <span className="message-role">AI {selectedLanguage === '其他語言' ? otherLanguage : selectedLanguage} 老師：</span>
                    <p className="message-text typing-indicator">思考中...</p>
                  </div>
                )}
                <div ref={conversationEndRef} />
              </div>

              <div className="input-submit-area">
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="請輸入您的問題或學習需求..."
                  className="input-textarea"
                  rows="3"
                ></textarea>
                <button onClick={handleSubmit} className="action-button" disabled={isLoading}>
                  {isLoading ? '發送中...' : '發送'}
                </button>
              </div>
            </>
          )}

          <button onClick={onGoHome} className="go-home-button">回首頁</button>
        </div>
      </div>
    </div>
  );
}

export default LanguageExpert;