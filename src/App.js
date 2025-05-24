import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // 引入 App.css 樣式檔案

// 導入生活小工具組件
import LifeAssistant from './components/LifeAssistant';
import ImageTextCreator from './components/ImageTextCreator';
import FortuneTeller from './components/FortuneTeller';
// 導入學習小工具組件
import NoteMaster from './components/NoteMaster';
import LanguageExpert from './components/LanguageExpert';
// 導入遊戲小工具組件
import NumberGuessingGame from './components/NumberGuessingGame';

// 導入圖片檔案
import initialBackground from './assets/images/background.png';
import storyBackground from './assets/images/background2.png';

function App() {
  const [currentPage, setCurrentPage] = useState('initial'); // 控制首頁階段 (initial, story, examples, navigation)
  // 控制顯示哪個工具頁面 (null, 'lifeAssistant', 'imageTextCreator', 'fortuneTeller', 'noteMaster', 'languageExpert', 'numberGuessingGame')
  const [currentTool, setCurrentTool] = useState(null);
  const [showLifeToolsSubMenu, setShowLifeToolsSubMenu] = useState(false); // 控制生活小工具次選單顯示
  const [showLearningToolsSubMenu, setShowLearningToolsSubMenu] = useState(false); // 控制學習小工具次選單顯示
  const [showGamesSubMenu, setShowGamesSubMenu] = useState(false); // 控制遊戲小工具次選單顯示

  const [isVisible, setIsVisible] = useState({
    initial: false,
    story: false,
    examples: false,
    navigation: false, // 指的是 AI 小工具區總覽頁面
  });
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);

  // 使用 useRef 創建對每個區塊的引用，以便平滑滾動
  const initialSectionRef = useRef(null);
  const storySectionRef = useRef(null);
  const examplesSectionRef = useRef(null);
  const navigationSectionRef = useRef(null); // AI小工具區總覽

  // 設置導覽點的參考，方便點擊滾動 (針對首頁內的區塊)
  const sectionRefs = {
    'initial': initialSectionRef,
    'story': storySectionRef,
    'examples': examplesSectionRef,
    'navigation': navigationSectionRef, // 導覽區塊總覽
  };

  // 初始淡入和監聽捲動事件
  useEffect(() => {
    setIsVisible(prev => ({ ...prev, initial: true }));
    document.documentElement.style.setProperty('--initial-bg-image', `url(${process.env.PUBLIC_URL}/homepage_images/background.png)`);
    document.documentElement.style.setProperty('--story-bg-image', `url(${process.env.PUBLIC_URL}/homepage_images/background2.png)`);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // 判斷是否顯示回頂部按鈕 (捲動超過一開始的畫面高度就顯示)
      if (scrollY > windowHeight * 0.5) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }

      // 判斷是否顯示導覽列 (捲動離開初始頁後顯示)
      if (scrollY > windowHeight * 0.2) {
        setShowNavbar(true);
      } else {
        setShowNavbar(false);
      }

      // 當我們在具體工具頁面時，不需要首頁的捲動判斷
      if (currentTool) return;

      // 動態調整各階段觸發捲動的閾值
      const storyThreshold = initialSectionRef.current ? initialSectionRef.current.offsetTop + initialSectionRef.current.offsetHeight * 0.7 : windowHeight * 0.7;
      const examplesThreshold = storySectionRef.current ? storySectionRef.current.offsetTop + storySectionRef.current.offsetHeight * 0.7 : windowHeight * 1.7;
      const navigationThreshold = examplesSectionRef.current ? examplesSectionRef.current.offsetTop + examplesSectionRef.current.offsetHeight * 0.7 : windowHeight * 2.7;

      // 根據捲動位置和當前頁面階段切換
      if (scrollY < storyThreshold && currentPage !== 'initial') {
        setCurrentPage('initial');
        setIsVisible({ initial: true, story: false, examples: false, navigation: false });
      } else if (scrollY >= storyThreshold && scrollY < examplesThreshold && currentPage !== 'story') {
        setCurrentPage('story');
        setIsVisible({ initial: false, story: true, examples: false, navigation: false });
      } else if (scrollY >= examplesThreshold && scrollY < navigationThreshold && currentPage !== 'examples') {
        setCurrentPage('examples');
        setIsVisible({ initial: false, story: false, examples: true, navigation: false });
      } else if (scrollY >= navigationThreshold && currentPage !== 'navigation') {
        setCurrentPage('navigation');
        setIsVisible({ initial: false, story: false, examples: false, navigation: true });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentPage, currentTool]);

  // 處理點擊首頁內的導覽項目，平滑滾動
  const scrollToSection = (sectionId) => {
    const sectionRef = sectionRefs[sectionId];
    if (sectionRef && sectionRef.current) {
      setCurrentTool(null); // 確保回到首頁模式
      const offsetTop = sectionRef.current.getBoundingClientRect().top + window.scrollY;
      const fixedOffset = 80; // 導覽列高度約 80px
      window.scrollTo({
        top: offsetTop - fixedOffset,
        behavior: 'smooth'
      });
      setCurrentPage(sectionId);
      setIsVisible({
        initial: sectionId === 'initial',
        story: sectionId === 'story',
        examples: sectionId === 'examples',
        navigation: sectionId === 'navigation',
      });
    }
  };

  // 處理點擊導覽列中的工具選項 (包括二級選單)
  const handleToolNavLinkClick = (toolId) => {
    setCurrentTool(toolId); // 設定要顯示的具體工具頁面
    setCurrentPage(null); // 隱藏首頁階段判斷
    setShowLifeToolsSubMenu(false); // 點擊後關閉生活工具次選單
    setShowLearningToolsSubMenu(false); // 點擊後關閉學習工具次選單
    setShowGamesSubMenu(false); // 點擊後關閉遊戲工具次選單
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 滾動到頁面頂部
    setIsVisible({ initial: false, story: false, examples: false, navigation: false }); // 隱藏所有首頁區塊
  };

  // 回到首頁 (或最上) 的函式
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    // 無論在哪個頁面，點擊回到最上都會回到首頁的初始狀態
    setCurrentTool(null); // 隱藏工具頁面
    setCurrentPage('initial'); // 顯示首頁初始畫面
    setIsVisible(prev => ({ ...prev, initial: true }));
    setShowLifeToolsSubMenu(false); // 確保回到頂部時關閉所有次選單
    setShowLearningToolsSubMenu(false); // 確保回到頂部時關閉所有次選單
    setShowGamesSubMenu(false); // 確保回到頂部時關閉所有次選單
  };

  const showScrollIndicator = currentPage !== 'navigation' && !currentTool;

  // 根據 currentTool 決定顯示哪個組件
  const renderToolComponent = () => {
    switch (currentTool) {
      case 'lifeAssistant':
        return <LifeAssistant onGoHome={scrollToTop} />;
      case 'imageTextCreator':
        return <ImageTextCreator onGoHome={scrollToTop} />;
      case 'fortuneTeller':
        return <FortuneTeller onGoHome={scrollToTop} />;
      case 'noteMaster':
        return <NoteMaster onGoHome={scrollToTop} />;
      case 'languageExpert':
        return <LanguageExpert onGoHome={scrollToTop} />;
      case 'numberGuessingGame': // 新增猜數字遊戲
        return <NumberGuessingGame onGoHome={scrollToTop} />;
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {/* 導覽列 */}
      <nav className={`navbar ${showNavbar ? 'visible' : ''}`}>
        <ul className="navbar-menu">
          <li><button onClick={() => scrollToSection('initial')}>首頁</button></li>
          <li><button onClick={() => scrollToSection('story')}>前言：時代的演進</button></li>
          <li><button onClick={() => scrollToSection('examples')}>AI 與我的羈絆</button></li>
          {/* AI 生活小工具 (帶有次選單) */}
          <li
            onMouseEnter={() => setShowLifeToolsSubMenu(true)}
            onMouseLeave={() => setShowLifeToolsSubMenu(false)}
            className="has-submenu"
          >
            <button>AI 生活小工具</button>
            {showLifeToolsSubMenu && (
              <ul className="submenu">
                <li><button onClick={() => handleToolNavLinkClick('lifeAssistant')}>生活管家</button></li>
                <li><button onClick={() => handleToolNavLinkClick('imageTextCreator')}>文案創作家</button></li>
                <li><button onClick={() => handleToolNavLinkClick('fortuneTeller')}>算命師</button></li>
              </ul>
            )}
          </li>
          {/* AI 學習小工具 (帶有次選單) */}
          <li
            onMouseEnter={() => setShowLearningToolsSubMenu(true)}
            onMouseLeave={() => setShowLearningToolsSubMenu(false)}
            className="has-submenu"
          >
            <button>AI 學習小工具</button>
            {showLearningToolsSubMenu && (
              <ul className="submenu">
                <li><button onClick={() => handleToolNavLinkClick('noteMaster')}>筆記大師</button></li>
                <li><button onClick={() => handleToolNavLinkClick('languageExpert')}>語言專家</button></li>
              </ul>
            )}
          </li>
          {/* AI 小遊戲 (帶有次選單) */}
          <li
            onMouseEnter={() => setShowGamesSubMenu(true)}
            onMouseLeave={() => setShowGamesSubMenu(false)}
            className="has-submenu"
          >
            <button>AI 小遊戲</button>
            {showGamesSubMenu && (
              <ul className="submenu">
                <li><button onClick={() => handleToolNavLinkClick('numberGuessingGame')}>猜數字遊戲</button></li>
                {/* 未來可以添加更多遊戲 */}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* 根據 currentTool 狀態來條件渲染不同的頁面內容 */}
      {renderToolComponent()}

      {/* 只有當 currentTool 為 null 時，才顯示首頁的區塊 */}
      {!currentTool && (
        <>
          {/* 初始大標題區塊 */}
          <section
            ref={initialSectionRef}
            className={`App-section initial-section ${isVisible.initial ? 'visible' : ''}`}
            style={{ backgroundImage: `url(${initialBackground})` }}
          >
            <h1>AI能讓生活與學習更有趣？</h1>
            {showScrollIndicator && currentPage === 'initial' && (
              <p className={`scroll-indicator ${currentPage !== 'initial' ? 'hidden' : ''}`}>請向下捲動 瀏覽更多</p>
            )}
          </section>

          {/* 故事感鋪陳區塊 */}
          <section
            ref={storySectionRef}
            className={`App-section story-section ${isVisible.story ? 'visible' : ''}`}
            style={{ backgroundImage: `url(${storyBackground})` }}
          >
            <h2>前言：我的時代演進</h2>
            <div className="story-content">
              <p>
                我是時代交替的一代，在我小時候到國小前都沒有接觸到電腦與手機等產品，但升國中時我拿到了人生第一支手機、讀高中時疫情期間頻繁的網絡生活、讀大學時ChatGPT橫空出世...都已深深改變我的生活。
              </p>
              <p>
                自從各式AI工具靜悄悄地滲透進我們的日常，帶來了前所未有的便利與可能性，不僅是工具，更是開啟無限潛能的夥伴。
              </p>
            </div>
            {showScrollIndicator && currentPage === 'story' && (
              <p className={`scroll-indicator ${currentPage !== 'story' ? 'hidden' : ''}`}>繼續捲動，探索 AI 與我的羈絆</p>
            )}
          </section>

          {/* AI 應用區塊 */}
          <section
            ref={examplesSectionRef}
            className={`App-section examples-section ${isVisible.examples ? 'visible' : ''}`}
          >
            <h2>AI 與我的羈絆</h2>
            <div className="examples-grid">
              <div className="example-item">
                <h3>即時翻譯工具</h3>
                <p>
                  跨越語言的鴻溝，AI 翻譯工具讓世界觸手可及。近期推出的Google Meet能夠視訊做及時翻譯，我想也是AI進化的一哩路。
                </p>
              </div>
              <div className="example-item">
                <h3>繪圖與創作</h3>
                <p>
                  釋放無限想像力！讓非專業人士也能成為藝術家，Midjourney、DALL-E 2 等 AI 工具將文字轉化為圖片，藝術創作變得人人可及。
                </p>
              </div>
              <div className="example-item">
                <h3>文案、表格、學習企劃樣樣行</h3>
                <p>
                  AI 能協助撰寫專業文案、快速整理複雜表格資料、甚至能根據使用者打造專屬的學習企劃。
                </p>
              </div>
            </div>
            {showScrollIndicator && currentPage === 'examples' && (
              <p className={`scroll-indicator ${currentPage !== 'examples' ? 'hidden' : ''}`}>最後，進入 AI 探索區</p>
            )}
          </section>

          {/* 導覽區塊 (AI小工具總覽) */}
          <section
            ref={navigationSectionRef}
            className={`App-section navigation-section ${isVisible.navigation ? 'visible' : ''}`}
          >
            <h2>AI 探索區</h2>
            <p>探索 AI，讓日常充滿無限可能！</p>
            <div className="tool-categories">
              {/* 生活小工具類別 */}
              <div className="tool-category life-tools">
                <h3>AI 生活小工具</h3>
                <div className="tool-cards-grid">
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('lifeAssistant')}>
                    <h4>生活管家</h4>
                    <p>專屬飲食與運動規劃師，讓生活健康有序。</p>
                  </div>
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('imageTextCreator')}>
                    <h4>文案創作家</h4>
                    <p>創意文案生成助手，輕鬆創作精彩內容。</p>
                  </div>
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('fortuneTeller')}>
                    <h4>算命師</h4>
                    <p>透過命理智慧提供人生指引，解惑答疑。</p>
                  </div>
                </div>
              </div>

              {/* 學習小工具類別 */}
              <div className="tool-category learning-tools">
                <h3>AI 學習小工具</h3>
                <div className="tool-cards-grid">
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('noteMaster')}>
                    <h4>筆記大師</h4>
                    <p>康乃爾筆記法應用，自動歸納整理學習重點。</p>
                  </div>
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('languageExpert')}>
                    <h4>語言專家</h4>
                    <p>客製化語言學習夥伴，提供聽說讀寫訓練。</p>
                  </div>
                </div>
              </div>

              {/* AI 小遊戲類別 */}
              <div className="tool-category games">
                <h3>AI 小遊戲</h3>
                <div className="tool-cards-grid">
                  <div className="tool-card-item" onClick={() => handleToolNavLinkClick('numberGuessingGame')}>
                    <h4>猜數字遊戲</h4>
                    <p>輕鬆一下，與 AI 鬥智！</p>
                  </div>
                  {/* 未來可以添加更多遊戲卡片 */}
                </div>
              </div>
            </div>
          </section>
        </>
      )}


      {/* 回到最上方的按鈕 */}
      {showScrollToTop && (
        <button onClick={scrollToTop} className="scroll-to-top">
          ⇧ 回到最上
        </button>
      )}
    </div>
  );
}

export default App;