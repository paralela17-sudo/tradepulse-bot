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

// --- LOCAL PYTHON LOGIC EMULATION (Fallback Rigoroso) ---
// Simula exatamente o que o script Python faria se a API falhar
const calculateLocalPrediction = (indicators: TechnicalIndicators, errorContext?: string): PredictionResult => {
  const { rsi, macd } = indicators;
  let signal = SignalType.WAIT;
  let prob = 0;
  let rationale = "Calculating algo telemetry...";

  // REGRAS ESTRITAS DO BOT PYTHON (SNIPER)
  // 1. Condição de Compra Sniper: RSI abaixo de 15 (Sobrevenda Extrema) + MACD Histogram virando positivo
  if (rsi < 15 && macd.histogram > 0) {
    signal = SignalType.BUY;
    prob = 96;
    rationale = `ALGO: CRITICAL OVERSOLD (RSI ${rsi.toFixed(2)}) + BULLISH DIVERGENCE. EXECUTE IMMEDIATELY.`;
  }
  // 2. Condição de Venda Sniper: RSI acima de 85 (Sobrecompra Extrema) + MACD Histogram virando negativo
  else if (rsi > 85 && macd.histogram < 0) {
    signal = SignalType.SELL;
    prob = 96;
    rationale = `ALGO: CRITICAL OVERBOUGHT (RSI ${rsi.toFixed(2)}) + BEARISH DIVERGENCE. EXECUTE IMMEDIATELY.`;
  }
  // 3. Estratégia de Tendência (Menor Probabilidade, mas válida)
  else if (rsi > 55 && rsi < 75 && macd.histogram > 0 && macd.macdLine > macd.signalLine) {
    signal = SignalType.BUY;
    prob = 82;
    rationale = "TREND: Positive momentum structure confirmed. Continuation likely.";
  }
  else if (rsi < 45 && rsi > 25 && macd.histogram < 0 && macd.macdLine < macd.signalLine) {
    signal = SignalType.SELL;
    prob = 82;
    rationale = "TREND: Negative momentum structure confirmed. Continuation likely.";
  }
  else {
    prob = 10;
    signal = SignalType.WAIT;
    rationale = "FILTER: Market noise detected. No statistical edge found > 90%.";
  }

  const prefix = errorContext ? `[${errorContext} MODE] ` : "[LOCAL CORE] ";

  return {
    probability: Math.floor(prob),
    signal,
    rationale: prefix + rationale,
    timestamp: Date.now()
  };
};

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

  if (!genAI) {
    if (onStream) onStream("AI Client not configured. Using local fallback...");
    return calculateLocalPrediction(indicators, "OFFLINE");
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

    if (onStream) onStream("Scanning Market (Timeout: 8s)...");

    // Race Condition: API Call vs Timeout
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    const apiCall = model.generateContent(prompt);

    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), 8000); // 8s timeout
    });

    const resultWrap = await Promise.race([apiCall, timeoutPromise]);
    const response = await resultWrap.response;
    const text = response.text();

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
    } else {
      // Shorten generic error for UI
      errorType = "API: " + errorMsg.substring(0, 50);
    }

    if (onStream) onStream(`Failed: ${errorType}. Using local fallback.`);
    return calculateLocalPrediction(indicators, errorType);
  }
};
