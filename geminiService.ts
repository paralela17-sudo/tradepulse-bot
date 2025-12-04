import { GoogleGenAI, Type } from "@google/genai";
import { TechnicalIndicators, SignalType, PredictionResult } from '../types';

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
  // 1. Try Local Storage (User Input)
  const storedKey = getStoredApiKey();
  if (storedKey) {
    return new GoogleGenAI({ apiKey: storedKey });
  }

  // 2. Try Environment Variable (Development/Build)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  return null;
};

export const initializeGemini = () => {
  // Initialization is handled dynamically
};

// --- LOCAL MATH ENGINE (Fallback) ---
const calculateLocalPrediction = (indicators: TechnicalIndicators, errorContext?: string): PredictionResult => {
    const { rsi, macd, sma } = indicators;
    let signal = SignalType.NEUTRAL;
    let prob = 50;
    let rationale = "Market in consolidation. Awaiting clear breakout.";

    // Strict Mathematical Strategy
    if (rsi < 25 && macd.histogram > 0) {
      signal = SignalType.BUY;
      prob = 92; 
      rationale = "Strong Reversal: Deep oversold (RSI < 25) + Momentum shift.";
    } else if (rsi > 75 && macd.histogram < 0) {
      signal = SignalType.SELL;
      prob = 94; 
      rationale = "Strong Reversal: Extreme overbought (RSI > 75) + Bearish divergence.";
    } 
    else if (rsi > 50 && rsi < 70 && macd.histogram > 0 && macd.macdLine > macd.signalLine) {
       signal = SignalType.BUY;
       prob = 78;
       rationale = "Trend Continuation: Bullish momentum confirming uptrend.";
    }
    else if (rsi < 50 && rsi > 30 && macd.histogram < 0 && macd.macdLine < macd.signalLine) {
       signal = SignalType.SELL;
       prob = 78;
       rationale = "Trend Continuation: Bearish momentum confirming downtrend.";
    }
    else if (Math.abs(macd.histogram) < 0.0001) {
      signal = SignalType.WAIT;
      prob = 45;
      rationale = "Low volatility detected. No clear direction.";
    }

    prob = Math.min(99, Math.max(10, prob + (Math.random() * 4 - 2)));
    
    const prefix = errorContext ? `[${errorContext}] ` : "[LOCAL MATH] ";

    return {
      probability: Math.floor(prob),
      signal,
      rationale: prefix + rationale,
      timestamp: Date.now()
    };
};

export const getGeminiPrediction = async (
  symbol: string,
  price: number,
  indicators: TechnicalIndicators
): Promise<PredictionResult> => {
  const ai = getAiClient();

  // If no key, use local math immediately
  if (!ai) {
    return calculateLocalPrediction(indicators, "DEMO MODE");
  }

  try {
    const prompt = `
      You are TradePulse, an elite High-Frequency Trading (HFT) AI. 
      Analyze the current market state for ${symbol} to predict the CLOSE of the next 1-minute candle.

      Market Telemetry:
      - Asset: ${symbol}
      - Current Price: ${price}
      - RSI (14): ${indicators.rsi.toFixed(2)} (Overbought > 70, Oversold < 30)
      - MACD Histogram: ${indicators.macd.histogram.toFixed(6)} (Positive = Bullish, Negative = Bearish)
      - SMA (20): ${indicators.sma.toFixed(2)} (Price > SMA = Uptrend)

      Analysis Rules:
      1. CRITICAL: Identify probability of reversal vs continuation.
      2. If RSI is extreme (<25 or >75) AND MACD supports reversal, assign probability > 90%.
      3. If trends align (Price > SMA + RSI Rising + MACD Green), signal BUY.
      4. Be conservative. Only predict > 80% if multiple indicators align perfectly.

      Output required in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized financial prediction engine. Your output must be precise, decisive, and strictly formatted.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probability: { type: Type.NUMBER, description: "Win probability percentage (0-100)" },
            signal: { type: Type.STRING, enum: ["BUY", "SELL", "NEUTRAL", "WAIT"], description: "Recommended action" },
            rationale: { type: Type.STRING, description: "Technical justification (max 15 words)" }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    
    return {
      probability: json.probability || 50,
      signal: (json.signal as SignalType) || SignalType.NEUTRAL,
      rationale: json.rationale || "Market analyzing...",
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.warn("Gemini Analysis Error:", error);
    
    let errorType = "API ERROR";
    const errorString = error.toString().toLowerCase();
    
    // If invalid key, fallback to local math but maybe hint to check settings
    if (errorString.includes("api_key") || errorString.includes("permission")) {
        errorType = "INVALID KEY";
    }
    else if (errorString.includes("429") || errorString.includes("quota") || errorString.includes("exhausted")) {
        errorType = "QUOTA LIMIT";
    }

    return calculateLocalPrediction(indicators, errorType);
  }
};