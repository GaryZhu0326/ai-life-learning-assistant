// src/components/NumberGuessingGame.js
import React, { useState, useEffect, useRef } from 'react';
import './ToolStyles.css'; // 引入通用樣式，因為遊戲工具也會使用側邊欄和對話樣式
import { getGeminiTextResponse } from '../services/geminiService'; // 引入 Gemini 服務 (可選，但讓AI說話更自然)
import { marked } from 'marked'; // 確保引入 marked 庫
import useConversationHistory from '../hooks/useConversationHistory'; // 導入自定義 Hook

function NumberGuessingGame({ onGoHome }) {
  // 遊戲相關狀態
  const [secretNumber, setSecretNumber] = useState(null); // AI 想的數字
  const [guess, setGuess] = useState(''); // 用戶的猜測
  const [guessCount, setGuessCount] = useState(0); // 猜測次數
  const [gameEnded, setGameEnded] = useState(false); // 遊戲是否結束

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
  } = useConversationHistory('numberGuessingGame'); // 為遊戲指定唯一 ID

  // 對話輸入與 AI 處理狀態
  const [isLoading, setIsLoading] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState(null); // 追蹤正在編輯名稱的對話ID
  const conversationEndRef = useRef(null); // 用於對話區域自動捲動

  // 自我介紹卡片淡出效果
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

  // 遊戲初始化
  useEffect(() => {
    if (!secretNumber) {
      // 首次載入組件或開始新遊戲時，生成秘密數字
      const newSecret = Math.floor(Math.random() * 100) + 1; // 1 到 100
      setSecretNumber(newSecret);
      setGuessCount(0);
      setGameEnded(false);
      
      // 添加遊戲開始的歡迎語到對話中
      const welcomeMessage = { role: 'ai', text: `AI 遊戲管理員：您好！歡迎來到猜數字遊戲！我已經在 1 到 100 之間想好了一個數字，請開始猜吧！`, html: marked.parse(`AI 遊戲管理員：您好！歡迎來到猜數字遊戲！我已經在 1 到 100 之間想好了一個數字，請開始猜吧！`) };
      
      // 如果是新的遊戲計畫，先添加歡迎訊息
      if (!currentConversationId) {
        setCurrentConversationMessages([welcomeMessage]);
        const convId = addConversation(newConversationName || '猜數字遊戲', [welcomeMessage]);
        setCurrentConversationId(convId);
      } else {
        // 如果是載入舊遊戲，確保狀態同步
        if (currentConversationMessages.length === 0) {
            setCurrentConversationMessages([welcomeMessage]);
            updateConversation(currentConversationId, [welcomeMessage]);
        }
      }
    }
  }, [secretNumber, currentConversationId, currentConversationMessages, addConversation, updateConversation, newConversationName]);


  // 處理用戶猜測
  const handleGuess = async () => {
    const parsedGuess = parseInt(guess);

    if (isNaN(parsedGuess) || parsedGuess < 1 || parsedGuess > 100) {
      alert("請輸入 1 到 100 之間的一個有效數字！");
      setGuess('');
      return;
    }

    setGuessCount(prevCount => prevCount + 1);
    setGuess(''); // 清空輸入框

    // 將用戶猜測添加到對話歷史
    const userGuessMessage = { role: 'user', text: `我猜 ${parsedGuess}`, html: `我猜 ${parsedGuess}` };
    const updatedMessages = [...currentConversationMessages, userGuessMessage];
    setCurrentConversationMessages(updatedMessages);

    let aiResponseMessage = "";

    if (parsedGuess === secretNumber) {
      aiResponseMessage = `恭喜你！你猜對了！秘密數字就是 ${secretNumber}。你總共猜了 ${guessCount + 1} 次。`;
      setGameEnded(true);
    } else if (parsedGuess < secretNumber) {
      aiResponseMessage = `太低了！請再猜一次。`;
    } else {
      aiResponseMessage = `太高了！請再猜一次。`;
    }

    setIsLoading(true);

    // AI 可以用更自然的方式回應
    const geminiPrompt = `你是一個猜數字遊戲的遊戲管理員AI。根據用戶的猜測和遊戲狀態，用簡潔友善的語言回應。
    秘密數字是：${secretNumber}
    用戶猜測了：${parsedGuess}
    當前是第 ${guessCount + 1} 次猜測。

    請根據結果給出提示（太高、太低或恭喜猜對），並引導用戶繼續。`;

    try {
      const geminiHistory = updatedMessages.map(msg => ({ // 傳遞對話歷史給AI
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      const geminiResponse = await getGeminiTextResponse(geminiHistory, geminiPrompt);
      aiResponseMessage = geminiResponse; // 使用 AI 生成的回應

    } catch (error) {
      console.error("AI 遊戲管理員回覆失敗:", error);
      aiResponseMessage = "很抱歉，AI 服務目前遇到問題，請稍後再試。";
    } finally {
      const renderedHtml = marked.parse(aiResponseMessage);
      const finalMessages = [...updatedMessages, { role: 'ai', text: aiResponseMessage, html: renderedHtml }];
      setCurrentConversationMessages(finalMessages);
      updateConversation(currentConversationId, finalMessages); // 更新儲存的對話
      setIsLoading(false);
    }
  };

  // 處理重新開始遊戲
  const handleRestartGame = () => {
    setSecretNumber(null); // 清空秘密數字，觸發 useEffect 重新生成
    setGuess('');
    setGuessCount(0);
    setGameEnded(false);
    startNewConversation(); // 開始新的對話歷史
  };

  // 處理輸入框 Enter 鍵提交猜測
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!gameEnded) { // 遊戲未結束才能猜測
        handleGuess();
      }
    }
  };

  // 側邊欄操作
  const handleStartNewConversation = () => {
    handleRestartGame(); // 開始新對話時也重設遊戲
  };

  const handleLoadConversation = (id) => {
    loadConversation(id);
    // 載入舊對話時，需要確保遊戲狀態也能部分同步
    // 這部分會比較複雜，因為秘密數字無法從歷史對話中恢復。
    // 對於遊戲，建議每次載入舊對話時，都提示用戶開始新遊戲，舊對話僅供參考。
    setSecretNumber(Math.floor(Math.random() * 100) + 1); // 載入舊對話時，也重新生成新數字
    setGuessCount(0);
    setGameEnded(false);
    alert("已載入舊的對話紀錄。遊戲已經重新開始，我已經想好了一個新的數字！");
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
      <h2 className="tool-title">AI 猜數字遊戲</h2>

      {showIntro && (
        <div className="intro-card fade-out">
          <h3>歡迎來到 AI 猜數字遊戲！</h3>
          <p>
            我已經在 1 到 100 之間想好了一個數字。您有機會猜出它！
            每次猜測後，我會給您提示。祝您好運！
          </p>
        </div>
      )}

      <div className="main-tool-interface">
        {/* 左側對話列表側邊欄 */}
        <div className="sidebar">
          <button onClick={handleStartNewConversation} className="new-conversation-button">
            + 新遊戲
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
                  <button onClick={() => deleteConversation(conv.id)} className="action-icon-button delete-button" title="刪除遊戲">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側遊戲介面 */}
        <div className="tool-card conversation-tool-card">
          {/* 對話名稱顯示和修改 */}
          <div className="current-conversation-header">
            {currentConversationId && editingConversationId !== currentConversationId ? (
              <h3 className="current-conversation-name" onClick={() => handleRenameClick(currentConversationId)}>
                {newConversationName || '未命名遊戲'} ✏️
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

          {/* 遊戲對話顯示區域 */}
          <div className="conversation-display">
            {currentConversationMessages.length === 0 && (
              <div className="conversation-placeholder">
                AI 遊戲管理員：您好！歡迎來到猜數字遊戲！我已經想好了一個數字，請開始猜吧！
              </div>
            )}
            {currentConversationMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <span className="message-role">{msg.role === 'user' ? '您：' : 'AI 遊戲管理員：'}</span>
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: msg.html || msg.text }}
                ></div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai is-loading">
                <span className="message-role">AI 遊戲管理員：</span>
                <p className="message-text typing-indicator">思考中...</p>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* 遊戲輸入與控制區域 */}
          <div className="input-submit-area">
            {!gameEnded ? (
              <>
                <label htmlFor="guess-input" style={{textAlign: 'center', marginBottom: '10px'}}>請猜一個 1 到 100 之間的數字：</label>
                <input
                  type="number"
                  id="guess-input"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="輸入您的猜測"
                  className="input-field"
                  disabled={isLoading}
                  min="1"
                  max="100"
                  style={{textAlign: 'center'}}
                />
                <button onClick={handleGuess} className="action-button" disabled={isLoading}>
                  {isLoading ? '猜測中...' : '提交猜測'}
                </button>
                <p style={{textAlign: 'center', fontSize: '0.9em', color: '#666'}}>已猜測次數：{guessCount}</p>
              </>
            ) : (
              <button onClick={handleRestartGame} className="action-button">
                重新開始遊戲
              </button>
            )}
          </div>

          <button onClick={onGoHome} className="go-home-button">回首頁</button>
        </div>
      </div>
    </div>
  );
}

export default NumberGuessingGame;