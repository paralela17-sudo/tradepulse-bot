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
  const storedKey = getStoredApiKey();
  if (storedKey) {
    return new GoogleGenAI({ apiKey: storedKey });
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return null;
};

export const initializeGemini = () => {
  // Initialization is handled dynamically
};

// --- LOCAL MATH ENGINE (Fallback rigoroso) ---
const calculateLocalPrediction = (indicators: TechnicalIndicators, errorContext?: string): PredictionResult => {
    const { rsi, macd } = indicators;
    let signal = SignalType.WAIT; 
    let prob = 0;
    let rationale = "Scanning market telemetry...";

    // ESTRATÉGIA PYTHONICA "SNIPER" (Simulada localmente)
    // def is_sniper_entry(rsi, macd_hist):
    //    return (rsi < 15 and macd_hist > 0) or (rsi > 85 and macd_hist < 0)
    
    if (rsi < 15 && macd.histogram > 0) { 
      signal = SignalType.BUY;
      prob = 94; 
      rationale = "ALGO: Oversold Condition (RSI < 15) + Bullish Divergence detected via Python logic.";
    } else if (rsi > 85 && macd.histogram < 0) { 
      signal = SignalType.SELL;
      prob = 94; 
      rationale = "ALGO: Overbought Condition (RSI > 85) + Bearish Crossover detected via Python logic.";
    } 
    else if (rsi > 60 && rsi < 75 && macd.histogram > 0.00005 && macd.macdLine > macd.signalLine) {
       signal = SignalType.BUY;
       prob = 86; 
       rationale = "TREND: Bullish momentum structure valid. Continuing trend.";
    }
    else if (rsi < 40 && rsi > 25 && macd.histogram < -0.00005 && macd.macdLine < macd.signalLine) {
       signal = SignalType.SELL;
       prob = 86;
       rationale = "TREND: Bearish momentum structure valid. Continuing trend.";
    }
    else {
      prob = 45;
      signal = SignalType.WAIT;
      rationale = "FILTER: Market noise detected. No statistical edge > 90%.";
    }

    const prefix = errorContext ? `[${errorContext}] ` : "[LOCAL CORE] ";

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

  if (!ai) {
    return calculateLocalPrediction(indicators, "DEMO MODE");
  }

  try {
    // PROMPT: ENGENHEIRO DE SOFTWARE PYTHON / TRADING ALGORTIMICO
    const prompt = `
      ACT AS: Senior Python Quantitative Developer specializing in HFT (High Frequency Trading) and Binary Options bots.
      
      TASK: Analyze the provided market telemetry for ${symbol}.
      OBJECTIVE: Identify a trade entry with >90% statistical probability of success based on Technical Analysis.

      TELEMETRY DATA (JSON):
      {
        "price": ${price},
        "rsi_14": ${indicators.rsi.toFixed(2)},
        "macd_hist": ${indicators.macd.histogram.toFixed(6)},
        "sma_20": ${indicators.sma.toFixed(2)}
      }

      ALGORITHMIC RULES (PYTHON LOGIC):
      1. def calculate_entry():
           # REVERSAL STRATEGY (SNIPER)
           if rsi < 20 and macd_hist > 0: return "BUY", 95
           if rsi > 80 and macd_hist < 0: return "SELL", 95
           
           # TREND FOLLOWING STRATEGY
           if 55 < rsi < 70 and macd_hist > 0: return "BUY", 88
           if 30 < rsi < 45 and macd_hist < 0: return "SELL", 88
           
           return "WAIT", 0

      2. STRICT FILTER:
         - If calculated probability < 90%, set signal to "WAIT".
         - Do not force a trade. Be extremely critical.

      OUTPUT:
      Return a raw JSON object matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a trading bot backend written in Python. You are emotionless and rely solely on math. If the probability is not >90%, return WAIT.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probability: { type: Type.NUMBER, description: "Win Probability (0-100)" },
            signal: { type: Type.STRING, enum: ["BUY", "SELL", "WAIT", "NEUTRAL"], description: "Action" },
            rationale: { type: Type.STRING, description: "Technical justification using python/algo terms" }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    
    return {
      probability: json.probability || 0,
      signal: (json.signal as SignalType) || SignalType.WAIT,
      rationale: json.rationale || "Calculating...",
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.warn("Gemini Error:", error);
    let errorType = "API ERROR";
    if (error.toString().includes("429")) errorType = "QUOTA LIMIT";
    return calculateLocalPrediction(indicators, errorType);
  }
};
