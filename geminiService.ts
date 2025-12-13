import { GoogleGenerativeAI } from "@google/generative-ai";
import { TechnicalIndicators, SignalType, PredictionResult } from './types';

// Key for LocalStorage
const STORAGE_KEY = 'tradepulse_gemini_api_key';

export const saveApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key);
  }
};

export const getStoredApiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null;
};

export const removeApiKey = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Helper to get client safely
const getAiClient = () => {
  const storedKey = getStoredApiKey();
  if (storedKey) {
    return new GoogleGenerativeAI(storedKey);
  }
  if (import.meta.env && import.meta.env.VITE_API_KEY) {
    return new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
  }
  return null;
};

// --- REMOVED LOCAL LOGIC AS PER USER REQUEST (NO FALLBACK) ---

export const initializeGemini = () => {
  // Initialization is handled dynamically
};


const resultCache = new Map<string, { timestamp: number, data: PredictionResult }>();
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const getGeminiPrediction = async (
  symbol: string,
  price: number,
  indicators: TechnicalIndicators,
  onStream?: (chunk: string) => void
): Promise<PredictionResult> => {
  const genAI = getAiClient();
  console.log(`[GEMINI] Client check: ${genAI ? 'KEY_PRESENT' : 'NO_KEY'}`);

  if (!genAI) {
    if (onStream) onStream("AI Configuration Missing (API Key).");
    return {
      probability: 0,
      signal: SignalType.WAIT,
      rationale: "AI KEY MISSING. Please configure Settings.",
      timestamp: Date.now()
    };
  }

  // --- CACHE CHECK ---
  const cacheKey = symbol;
  const cached = resultCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    if (onStream) onStream("(Cached Result) " + cached.data.rationale);
    return cached.data;
  }

  try {
    // --- NON-STREAMING PROMPT ---
    const prompt = `
      ACT AS: Senior Python Quantitative Developer & Algorithmic Trader.
      CONTEXT: You are the logic engine for a High-Frequency Trading (HFT) bot.
      
      YOUR GOAL: Analyze the input telemetry and execute the 'sniper_logic' function.

      INPUT TELEMETRY (JSON):
      {
        "asset": "${symbol}",
        "current_price": ${price},
        "rsi_14": ${indicators.rsi.toFixed(4)},
        "macd_histogram": ${indicators.macd.histogram.toFixed(8)}
      }

      PYTHON LOGIC (VIRTUAL):
      def sniper_logic(rsi, macd_hist):
          if rsi < 15.0 and macd_hist > 0: return "BUY", 96, "CRITICAL: RSI Oversold (<15) + Bullish Div."
          if rsi > 85.0 and macd_hist < 0: return "SELL", 96, "CRITICAL: RSI Overbought (>85) + Bearish Div."
          if 55 < rsi < 75 and macd_hist > 0: return "BUY", 82, "Trend: Bullish momentum continuation."
          if 25 < rsi < 45 and macd_hist < 0: return "SELL", 82, "Trend: Bearish momentum continuation."
          return "WAIT", 0, "Noise: Market conditions unclear."

      INSTRUCTIONS:
      1. Analyze the data.
      2. Output the result EXACTLY as the function would return it.
      3. Return ONLY a JSON object.

      OUTPUT FORMAT:
      { "probability": number, "signal": "BUY"|"SELL"|"WAIT", "rationale": "string" }
    `;

    console.log("[GEMINI] 🚀 Starting prediction request...");
    if (onStream) onStream("Scanning Market (Timeout: 8s)...");

    // Race Condition: API Call vs Timeout
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    console.log("[GEMINI] Model initialized, sending prompt...");

    const apiCall = model.generateContent(prompt);

    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), 8000); // 8s timeout
    });

    console.log("[GEMINI] Awaiting API response or timeout...");
    const resultWrap = await Promise.race([apiCall, timeoutPromise]);
    console.log("[GEMINI] Race finished. Resolving response text...");

    const response = await resultWrap.response;
    const text = response.text();
    console.log("[GEMINI] Raw response received:", text.substring(0, 50) + "...");

    // Clean markdown if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleanText || '{}');

    const result: PredictionResult = {
      probability: json.probability || 0,
      signal: (json.signal as SignalType) || SignalType.WAIT,
      rationale: json.rationale || "Calculating...",
      timestamp: Date.now()
    };

    // Save to Cache
    resultCache.set(cacheKey, { timestamp: Date.now(), data: result });

    return result;

  } catch (error: any) {
    const errorMsg = error.toString();
    console.warn("Gemini Error:", error);

    let errorType = "API ERROR";
    if (errorMsg.includes("429") || errorMsg.includes("Resource has been exhausted")) {
      errorType = "QUOTA LIMIT";
    } else if (errorMsg.includes("API key") || errorMsg.includes("403")) {
      errorType = "INVALID KEY";
    } else if (errorMsg.includes("TIMEOUT")) {
      errorType = "SLOW NETWORK";
    } else if (errorMsg.includes("Error fetching") || errorMsg.includes("NetworkError")) {
      errorType = "NETWORK BLOCKED (ADBLOCK?)";
    } else {
      errorType = "API: " + errorMsg.substring(0, 50);
    }

    if (onStream) onStream(`⚠ ${errorType}. Analysis Aborted.`);

    // STRICT: Return NO prediction on error. No local fallback.
    return {
      probability: 0,
      signal: SignalType.WAIT,
      rationale: `CONNECTION ERROR: ${errorType}. Waiting for retry...`,
      timestamp: Date.now()
    };
  }
};

// --- DIAGNOSTIC TOOL ---
export const testGeminiConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!apiKey) return { success: false, message: "No API Key provided" };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // Simple fast prompt
    const result = await model.generateContent("Test. Reply 'OK'.");
    const response = await result.response;
    const text = response.text();

    return { success: true, message: `Connected! Response: ${text.substring(0, 50)}` };
  } catch (error: any) {
    return { success: false, message: error.toString() };
  }
};
