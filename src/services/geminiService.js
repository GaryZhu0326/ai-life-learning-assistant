// src/services/geminiService.js
// 完全移除對 @google/generative-ai SDK 的依賴

// 從環境變數中獲取 API 金鑰
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// 檢查 API_KEY 是否存在
if (!API_KEY) {
  console.error("Gemini API Key is not set. 請在您的 .env 檔案中設定 REACT_APP_GEMINI_API_KEY。");
}

// 直接指定 v1 API 端點和模型名稱
const GEMINI_TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
const GEMINI_VISION_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${API_KEY}`;


/**
 * 呼叫 Gemini Pro 模型生成文本回答 (支援多輪對話)。
 * @param {Array<Object>} history 對話歷史，格式為 [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
 * @param {string} currentPrompt 用戶當前輸入的提示詞。
 * @returns {Promise<string>} AI 生成的文本回答。
 */
export async function getGeminiTextResponse(history, currentPrompt) {
  if (!API_KEY) { // 再次檢查金鑰
    return "AI 服務未設定 API 金鑰，請檢查您的環境變數。";
  }

  // 構造完整的對話內容，包括歷史和當前提示
  const contents = [...history, { role: 'user', parts: [{ text: currentPrompt }] }];

  try {
    const response = await fetch(GEMINI_TEXT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // 指定內容類型為 JSON
      },
      body: JSON.stringify({ // 將請求體轉換為 JSON 字串
        contents: contents, // 傳遞完整的對話歷史
        // generationConfig: {
        //   temperature: 0.9, // 可選：調整創意度
        //   topK: 1,
        //   topP: 1,
        // },
      }),
    });

    if (!response.ok) { // 如果回應狀態碼不是 2xx (成功)
      const errorData = await response.json();
      console.error("API 回應失敗 (fetch):", response.status, errorData);
      return `很抱歉，AI 服務目前遇到問題。錯誤碼: ${response.status}。詳細資訊: ${errorData.error ? errorData.error.message : JSON.stringify(errorData)}`;
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "AI 沒有返回有效的回答，請嘗試更換問題。";
    }
  } catch (error) {
    console.error("呼叫 Gemini 文本 API 時發生錯誤 (fetch)：", error);
    return "很抱歉，AI 服務目前遇到問題，請稍後再試。";
  }
}

/**
 * 呼叫 Gemini Pro Vision 模型生成基於圖像和文本的回答 (使用原生 fetch)。
 * 註：此功能需要將圖像轉換為適合 API 的格式（例如 base64）。
 * @param {Array<Object>} history 對話歷史 (可選，但視覺模型通常處理單輪圖像+文本)
 * @param {string} currentPrompt 用戶當前輸入的文本提示詞。
 * @param {Object} imageParts 圖像部分，例如 { inlineData: { data: base64String, mimeType: "image/jpeg" } }
 * @returns {Promise<string>} AI 生成的文本回答。
 */
export async function getGeminiVisionResponse(history, currentPrompt, imageParts) {
    if (!API_KEY) {
        return "AI 服務未設定 API 金鑰，請檢查您的環境變數。";
    }

    const contents = [{ parts: [{ text: currentPrompt }] }];
    if (imageParts) {
        contents[0].parts.push(imageParts); // 圖像部分通常是與文本一起在一個 part 內
    }

    try {
        const response = await fetch(GEMINI_VISION_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: contents
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Vision API 回應失敗 (fetch):", response.status, errorData);
            return `很抱歉，圖像處理服務目前遇到問題。錯誤碼: ${response.status}。詳細資訊: ${errorData.error ? errorData.error.message : JSON.stringify(errorData)}`;
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "AI 沒有返回有效的圖像相關回答。";
        }

    } catch (error) {
        console.error("呼叫 Gemini 視覺 API 時發生錯誤 (fetch)：", error);
        return "很抱歉，圖像處理服務目前遇到問題，請稍後再試。";
    }
}

// 為了圖文創作家方便，也提供一個僅文本的圖像生成指令範例（模擬）
// 這個函式可以直接呼叫上面的 getGeminiTextResponse 來獲取真實的 AI 提示詞
export async function getGeminiImageGenerationText(prompt) {
    if (!API_KEY) {
        return "AI 服務未設定 API 金鑰，請檢查您的環境變數。";
    }
    // 注意：這裡只生成一次提示詞，不適合多輪對話模式，所以直接傳空歷史
    const fullPrompt = `根據以下描述，生成一段圖像生成工具（如 Midjourney, DALL-E）可用的英文提示詞，並想像一個簡單的圖片 URL 回應此提示詞。\n描述：${prompt}\n\n請以以下格式返回：\n提示詞：[英文提示詞]\n圖片網址：[圖片URL]`;
    return getGeminiTextResponse([], fullPrompt); // 傳遞空歷史
}