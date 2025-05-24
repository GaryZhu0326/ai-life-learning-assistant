// src/hooks/useConversationHistory.js
import { useState, useEffect, useCallback } from 'react';

// 定義 localStorage 中儲存對話的鍵名
const LOCAL_STORAGE_KEY_PREFIX = 'aiTool_conversation_';

/**
 * 自定義 Hook，用於管理特定工具的對話歷史，並與 localStorage 同步。
 * @param {string} toolId 該工具的唯一 ID (例如 'lifeAssistant', 'imageTextCreator')
 * @returns {object} 包含對話列表、保存新對話的方法、載入指定對話的方法
 */
const useConversationHistory = (toolId) => {
  // 儲存所有對話列表：[{ id: 'uuid', name: '對話名稱', messages: [...] }]
  const [allConversations, setAllConversations] = useState([]);
  // 儲存當前正在進行的對話的訊息列表：[{ role: 'user', text: '...', html: '...' }]
  const [currentConversationMessages, setCurrentConversationMessages] = useState([]);
  // 儲存當前對話的 ID (如果它是從列表中載入的)
  const [currentConversationId, setCurrentConversationId] = useState(null);
  // 儲存新的對話的預設名稱
  const [newConversationName, setNewConversationName] = useState('新對話');

  // localStorage 鍵名
  const getLocalStorageKey = useCallback(() => {
    return `${LOCAL_STORAGE_KEY_PREFIX}${toolId}`;
  }, [toolId]);

  // 初始化時從 localStorage 載入所有對話
  useEffect(() => {
    const storedData = localStorage.getItem(getLocalStorageKey());
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setAllConversations(parsedData);
      } catch (e) {
        console.error("Error parsing stored conversations from localStorage:", e);
        setAllConversations([]); // 解析失敗時清空
      }
    } else {
      setAllConversations([]);
    }
  }, [getLocalStorageKey]);

  // 當 allConversations 改變時，保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(allConversations));
    } catch (e) {
      console.error("Error saving conversations to localStorage:", e);
    }
  }, [allConversations, getLocalStorageKey]);

  // 新增一個對話到列表中
  const addConversation = useCallback((conversationName, messages) => {
    const newId = Date.now().toString(); // 簡單生成唯一 ID
    const newConv = { id: newId, name: conversationName, messages: messages };
    setAllConversations(prev => [newConv, ...prev]); // 新對話放在最前面
    return newId;
  }, []);

  // 更新指定 ID 的對話
  const updateConversation = useCallback((id, updatedMessages) => {
    setAllConversations(prev => prev.map(conv =>
      conv.id === id ? { ...conv, messages: updatedMessages } : conv
    ));
  }, []);

  // 載入指定 ID 的對話到 currentConversationMessages
  const loadConversation = useCallback((id) => {
    const convToLoad = allConversations.find(conv => conv.id === id);
    if (convToLoad) {
      setCurrentConversationMessages(convToLoad.messages);
      setCurrentConversationId(id);
      setNewConversationName(convToLoad.name); // 載入時也更新名稱
    } else {
      console.warn(`Conversation with ID ${id} not found.`);
    }
  }, [allConversations]);

  // 清空當前對話，準備開始新對話
  const startNewConversation = useCallback(() => {
    setCurrentConversationMessages([]);
    setCurrentConversationId(null);
    setNewConversationName('新對話');
  }, []);

  // 刪除指定 ID 的對話
  const deleteConversation = useCallback((id) => {
    setAllConversations(prev => prev.filter(conv => conv.id !== id));
    // 如果刪除的是當前對話，則開始一個新對話
    if (currentConversationId === id) {
      startNewConversation();
    }
  }, [currentConversationId, startNewConversation]);

  // 更新對話名稱
  const renameConversation = useCallback((id, newName) => {
    setAllConversations(prev => prev.map(conv =>
      conv.id === id ? { ...conv, name: newName } : conv
    ));
    if (currentConversationId === id) {
      setNewConversationName(newName);
    }
  }, [currentConversationId]);

  return {
    allConversations,
    currentConversationMessages,
    setCurrentConversationMessages, // 允許外部直接更新當前對話訊息
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
  };
};

export default useConversationHistory;