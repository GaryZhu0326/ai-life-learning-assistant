// src/components/NoteMaster.js
import React, { useState, useEffect, useRef } from 'react';
import './LearningToolStyles.css'; // <-- 這裡改為引入新的 CSS 檔案
import { getGeminiTextResponse } from '../services/geminiService';
import { marked } from 'marked';
import useConversationHistory from '../hooks/useConversationHistory';

function NoteMaster({ onGoHome }) {
  // 筆記相關狀態
  const [noteContent, setNoteContent] = useState(''); // 筆記欄內容
  const [organizedContent, setOrganizedContent] = useState(''); // 整理欄內容
  const [summaryContent, setSummaryContent] = useState(''); // 摘要欄內容
  const [isLoading, setIsLoading] = useState(false); // 處理 AI 載入狀態

  // 對話歷史 Hook (這裡用來儲存筆記的歷史版本，而不是對話)
  // 將其重新命名為 noteHistory 相關變數
  const {
    allConversations: allNotes, // 將 allConversations 改名為 allNotes
    currentConversationMessages: currentNoteContent, // 將 currentConversationMessages 改名為 currentNoteContent
    setCurrentConversationMessages: setCurrentNoteContent, // 同步修改 set 方法
    currentConversationId: currentNoteId, // 將 currentConversationId 改名為 currentNoteId
    setCurrentConversationId: setCurrentNoteId, // 同步修改 set 方法
    addConversation: addNote, // 將 addConversation 改名為 addNote
    updateConversation: updateNote, // 將 updateConversation 改名為 updateNote
    loadConversation: loadNote, // 將 loadConversation 改名為 loadNote
    startNewConversation: startNewNote, // 將 startNewConversation 改名為 startNewNote
    deleteConversation: deleteNote, // 將 deleteConversation 改名為 deleteNote
    renameConversation: renameNote, // 將 renameConversation 改名為 renameNote
    newConversationName: newNoteName, // 將 newConversationName 改名為 newNoteName
    setNewConversationName: setNewNoteName, // 同步修改 set 方法
  } = useConversationHistory('noteMaster'); // 為筆記大師指定唯一 ID

  const [editingNoteId, setEditingNoteId] = useState(null); // 追蹤正在編輯名稱的筆記ID

  const noteResultRef = useRef(null); // 用於結果區域自動捲動

  // 初始載入和自我介紹淡出 (如果需要，筆記大師可以不需要自我介紹)
  const [showIntro, setShowIntro] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 當載入筆記或生成新筆記時，同步主筆記欄
  useEffect(() => {
    if (currentNoteContent && currentNoteContent.length > 0) {
      // 假設 currentNoteContent[0] 是筆記內容，[1]是整理，[2]是摘要
      setNoteContent(currentNoteContent[0]?.text || '');
      setOrganizedContent(currentNoteContent[1]?.text || '');
      setSummaryContent(currentNoteContent[2]?.text || '');
    } else {
      setNoteContent('');
      setOrganizedContent('');
      setSummaryContent('');
    }
  }, [currentNoteContent]);

  // 當結果生成後自動捲動
  useEffect(() => {
    if (noteResultRef.current) {
      setTimeout(() => {
        noteResultRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [organizedContent, summaryContent]);


  // 處理筆記生成
  const handleGenerateNotes = async () => {
    if (!noteContent.trim()) {
      alert("請在筆記欄輸入內容！");
      return;
    }

    setIsLoading(true);

    // 構建發送給 AI 的提示詞
    const prompt = `你是一位專業的筆記大師AI，請根據我提供的原始筆記內容，以康乃爾筆記法為基礎，將其歸納整理成大綱/要點，並在最後提供一個簡潔的摘要。
    請確保整理欄和摘要欄的內容都是以 Markdown 格式呈現，如果適用，可以使用表格或清單。
    
    原始筆記內容：
    ${noteContent}

    請輸出為以下兩個部分：
    ## 整理欄
    [將原始筆記內容歸納整理成大綱或主要要點]

    ## 摘要欄
    [將原始筆記和整理欄的資訊吸收整合為一個簡潔的重點摘要]`; // 移除這裡的字體顏色要求，交給 CSS

    try {
      const responseText = await getGeminiTextResponse([], prompt); // 筆記生成通常是單輪任務，傳空歷史

      // 解析 AI 的回應
      const sections = responseText.split('## 摘要欄');
      const organizedPart = sections[0].replace('## 整理欄', '').trim();
      const summaryPart = sections[1] ? sections[1].trim() : '';

      // 將 Markdown 轉換為 HTML
      const renderedOrganized = marked.parse(organizedPart);
      const renderedSummary = marked.parse(summaryPart);

      setOrganizedContent({ text: organizedPart, html: renderedOrganized });
      setSummaryContent({ text: summaryPart, html: renderedSummary });

      // 保存或更新筆記
      const currentNoteState = [
        { role: 'note', text: noteContent }, // 原始筆記
        { role: 'organized', text: organizedPart, html: renderedOrganized }, // 整理內容
        { role: 'summary', text: summaryPart, html: renderedSummary } // 摘要內容
      ];

      let noteId = currentNoteId;
      if (!noteId) {
        noteId = addNote(newNoteName || '新筆記', currentNoteState);
        setCurrentNoteId(noteId);
      } else {
        updateNote(noteId, currentNoteState);
      }

    } catch (error) {
      console.error("AI 筆記大師回覆失敗:", error);
      setOrganizedContent({ text: "", html: "<p>很抱歉，AI 服務目前遇到問題，請稍後再試。</p>" });
      setSummaryContent({ text: "", html: "<p>很抱歉，AI 服務目前遇到問題，請稍後再試。</p>" });
    } finally {
      setIsLoading(false);
    }
  };

  // 開始新筆記
  const handleStartNewNote = () => {
    startNewNote(); // 清空 hook 內的 currentNoteContent 和 ID
    setNoteContent(''); // 清空主筆記欄
    setOrganizedContent(''); // 清空整理欄
    setSummaryContent(''); // 清空摘要欄
  };

  const handleLoadNote = (id) => {
    loadNote(id);
    // currentNoteContent 會在 useEffect 中自動更新主筆記欄
  };

  const handleRenameClick = (id) => {
    setEditingNoteId(id);
  };

  const handleRenameConfirm = (id, newName) => {
    if (newName.trim() && newName !== allNotes.find(note => note.id === id)?.name) {
      renameNote(id, newName);
    }
    setEditingNoteId(null);
  };

  const handleRenameChange = (e) => {
    if (currentNoteId === editingNoteId) {
      setNewNoteName(e.target.value);
    }
  };


  return (
    <div className="tool-container">
      <h2 className="tool-title">AI 筆記大師</h2>

      {showIntro && (
        <div className="intro-card fade-out">
          <h3>歡迎來到 AI 筆記大師！</h3>
          <p>
            基於康乃爾筆記法，我能幫助您將筆記內容自動歸納整理成大綱和精簡摘要。
            請在「筆記欄」輸入您的內容，點擊「生成筆記」即可開始！
          </p>
        </div>
      )}

      <div className="main-tool-interface">
        {/* 左側筆記列表側邊欄 */}
        <div className="sidebar">
          <button onClick={handleStartNewNote} className="new-conversation-button">
            + 新筆記
          </button>
          <div className="conversation-list">
            {allNotes.map(note => (
              <div
                key={note.id}
                className={`conversation-item ${note.id === currentNoteId ? 'active' : ''}`}
              >
                {editingNoteId === note.id ? (
                  <input
                    type="text"
                    defaultValue={note.name}
                    onBlur={(e) => handleRenameConfirm(note.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameConfirm(note.id, e.target.value);
                      }
                    }}
                    autoFocus
                    className="rename-input"
                    onChange={handleRenameChange}
                  />
                ) : (
                  <span onClick={() => handleLoadNote(note.id)}>
                    {note.name}
                  </span>
                )}
                <div className="actions">
                  {editingNoteId !== note.id && (
                    <button onClick={() => handleRenameClick(note.id)} className="action-icon-button rename-button" title="重新命名">✏️</button>
                  )}
                  <button onClick={() => deleteNote(note.id)} className="action-icon-button delete-button" title="刪除筆記">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側筆記編輯與結果區 */}
        <div className="tool-card note-master-card">
          {/* 筆記標題顯示和修改 */}
          <div className="current-conversation-header">
            {currentNoteId && editingNoteId !== currentNoteId ? (
              <h3 className="current-conversation-name" onClick={() => handleRenameClick(currentNoteId)}>
                {newNoteName || '未命名筆記'} ✏️
              </h3>
            ) : (
              <input
                type="text"
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                onBlur={(e) => handleRenameConfirm(currentNoteId, e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm(currentNoteId, e.target.value);
                  }
                }}
                className="current-conversation-rename-input"
                autoFocus={editingNoteId === currentNoteId}
              />
            )}
          </div>

          {/* 筆記欄 (上方) */}
          <div className="note-section note-input-section">
            <label htmlFor="note-content">筆記欄 (輸入您的原始筆記內容)：</label>
            <textarea
              id="note-content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="請在此輸入您的筆記內容..."
              className="input-textarea"
              rows="10"
            ></textarea>
            <button onClick={handleGenerateNotes} className="action-button" disabled={isLoading}>
              {isLoading ? '生成中...' : '生成筆記'}
            </button>
          </div>
          
          {/* 整理欄與摘要欄 (下方) */}
          <div className="note-results-section" ref={noteResultRef}>
            <div className="note-section organized-section">
              <label>整理欄 (筆記大綱與歸納整理)：</label>
              <div
                className="note-output organized-content"
                dangerouslySetInnerHTML={{ __html: organizedContent.html || organizedContent.text }}
              ></div>
            </div>

            <div className="note-section summary-section">
              <label>摘要欄 (重點摘要)：</label>
              <div
                className="note-output summary-content"
                dangerouslySetInnerHTML={{ __html: summaryContent.html || summaryContent.text }}
              ></div>
            </div>
          </div>

          <button onClick={onGoHome} className="go-home-button">回首頁</button>
        </div>
      </div>
    </div>
  );
}

export default NoteMaster;