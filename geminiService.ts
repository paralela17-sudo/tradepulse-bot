import { GoogleGenAI, Type } from "@google/genai";
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
    return new GoogleGenAI({ apiKey: storedKey });
  }
  if (import.meta.env && import.meta.env.VITE_API_KEY) {
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  }
  return null;
};

export const initializeGemini = () => {
  // Initialization is handled dynamically
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

export const getGeminiPrediction = async (
  symbol: string,
  price: number,
  indicators: TechnicalIndicators
): Promise<PredictionResult> => {
  const ai = getAiClient();

  if (!ai) {
    return calculateLocalPrediction(indicators, "OFFLINE");
  }

  try {
    // --- PROMPT DE ENGENHARIA DE SOFTWARE ---
    // Instruímos a IA a agir como um interpretador Python rodando uma função específica.
    const prompt = `
      ACT AS: Senior Python Quantitative Developer & Algorithmic Trader.
      CONTEXT: You are the logic engine for a High-Frequency Trading (HFT) bot.
      
      YOUR GOAL: Analyze the input telemetry and execute the 'sniper_logic' function defined below.

      INPUT TELEMETRY (JSON):
      {
        "asset": "${symbol}",
        "current_price": ${price},
        "rsi_14": ${indicators.rsi.toFixed(4)},
        "macd_histogram": ${indicators.macd.histogram.toFixed(8)}
      }

      PYTHON LOGIC TO EXECUTE (VIRTUAL):
      
      def sniper_logic(rsi, macd_hist):
          """
          Determines trade entry based on statistical extremes.
          Returns: (Signal, Probability, Log)
          """
          # STRATEGY 1: THE SNIPER (Reversal at Extremes)
          # Strict rule: RSI must be < 15 or > 85 to trigger 90%+ confidence.
          
          if rsi < 15.0 and macd_hist > 0:
              return "BUY", 96, "CRITICAL: RSI Oversold (<15) with Momentum Shift. High probability Reversal."
              
          if rsi > 85.0 and macd_hist < 0:
              return "SELL", 96, "CRITICAL: RSI Overbought (>85) with Momentum Shift. High probability Reversal."

          # STRATEGY 2: TREND FOLLOWING (Lower Confidence)
          if 55 < rsi < 75 and macd_hist > 0:
              return "BUY", 82, "Trend: Bullish momentum continuation."
              
          if 25 < rsi < 45 and macd_hist < 0:
              return "SELL", 82, "Trend: Bearish momentum continuation."

          # DEFAULT: NOISE
          return "WAIT", 0, "Noise: Market conditions do not meet statistical thresholds."

      INSTRUCTIONS:
      1. Mentally run the input numbers through the 'sniper_logic' function.
      2. Output the result EXACTLY as the function would return it.
      3. Be cold, calculated, and precise. No financial advice disclaimers needed, this is a simulation.
      
      OUTPUT FORMAT:
      Return ONLY a JSON object: { "probability": number, "signal": "BUY"|"SELL"|"WAIT", "rationale": "string" }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probability: { type: Type.NUMBER, description: "Win Probability (0-100)" },
            signal: { type: Type.STRING, enum: ["BUY", "SELL", "WAIT", "NEUTRAL"], description: "Action" },
            rationale: { type: Type.STRING, description: "Technical justification from the python logic" }
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
