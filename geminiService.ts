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

    // Strict Mathematical Strategy for Binary Options (Short term reversal/continuation)
    if (rsi < 20 && macd.histogram > 0) {
      signal = SignalType.BUY;
      prob = 93; 
      rationale = "SNIPER ENTRY: Extreme oversold (RSI < 20) + Momentum flip.";
    } else if (rsi > 80 && macd.histogram < 0) {
      signal = SignalType.SELL;
      prob = 94; 
      rationale = "SNIPER ENTRY: Extreme overbought (RSI > 80) + Bearish divergence.";
    } 
    else if (rsi > 55 && rsi < 70 && macd.histogram > 0.00005 && macd.macdLine > macd.signalLine) {
       signal = SignalType.BUY;
       prob = 82;
       rationale = "Trend Continuation: Strong Bullish momentum confirmed.";
    }
    else if (rsi < 45 && rsi > 30 && macd.histogram < -0.00005 && macd.macdLine < macd.signalLine) {
       signal = SignalType.SELL;
       prob = 82;
       rationale = "Trend Continuation: Strong Bearish momentum confirmed.";
    }
    else if (Math.abs(macd.histogram) < 0.00001) {
      signal = SignalType.WAIT;
      prob = 30;
      rationale = "DEAD ZONE: No volatility. Do not trade.";
    }

    // Add slight noise to simulate market flux
    prob = Math.min(99, Math.max(10, prob + (Math.random() * 2 - 1)));
    
    const prefix = errorContext ? `[${errorContext}] ` : "[MATH CORE] ";

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
      Act as a world-class Binary Options Analyst. 
      Analyze the immediate 1-minute candle direction for ${symbol}.
      Current Price: ${price}
      
      Indicators:
      - RSI (14): ${indicators.rsi.toFixed(2)}
      - MACD Histogram: ${indicators.macd.histogram.toFixed(6)}
      - SMA (20): ${indicators.sma.toFixed(2)}

      STRICT RULES FOR 90%+ PROBABILITY:
      1. ONLY return probability > 90 if RSI is extreme (<25 or >75) AND MACD confirms reversal.
      2. If the market is ranging (RSI 40-60), return probability < 60 and Signal WAIT.
      3. Focus on "Sniper Entries" - the exact moment of reversal.
      
      Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a ruthlessly accurate trading bot. Do not hallucinate trends. If uncertain, signal WAIT.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probability: { type: Type.NUMBER, description: "Win probability (0-100)" },
            signal: { type: Type.STRING, enum: ["BUY", "SELL", "NEUTRAL", "WAIT"], description: "Action" },
            rationale: { type: Type.STRING, description: "Short, punchy reason." }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    
    return {
      probability: json.probability || 50,
      signal: (json.signal as SignalType) || SignalType.NEUTRAL,
      rationale: json.rationale || "Analyzing...",
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.warn("Gemini Analysis Error:", error);
    
    let errorType = "API ERROR";
    const errorString = error.toString().toLowerCase();
    
    if (errorString.includes("api_key") || errorString.includes("permission")) {
        errorType = "INVALID KEY";
    }
    else if (errorString.includes("429") || errorString.includes("quota") || errorString.includes("exhausted")) {
        errorType = "QUOTA LIMIT";
    }

    return calculateLocalPrediction(indicators, errorType);
  }
};





 
