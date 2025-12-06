import { GoogleGenAI } from "@google/genai";
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

const resultCache = new Map<string, { timestamp: number, data: PredictionResult }>();
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const getGeminiPrediction = async (
  symbol: string,
  price: number,
  indicators: TechnicalIndicators,
  onStream?: (chunk: string) => void
): Promise<PredictionResult> => {
  const ai = getAiClient();

  if (!ai) {
    if (onStream) onStream("AI Client not configured. Using local fallback...");
    return calculateLocalPrediction(indicators, "OFFLINE");
  }

  // --- CACHE CHECK ---
  // Create a cache key based on symbol (and roughly price/indicators if we wanted strictness, 
  // but for "common pairs" 60s cache, symbol is usually sufficient/requested).
  const cacheKey = symbol;
  const cached = resultCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    if (onStream) onStream("(Cached Result) " + cached.data.rationale);
    return cached.data;
  }

  try {
    // --- PROMPT ENGINEERING FOR STREAMING ---
    // We request the rationale FIRST as plain text, then the JSON at the end.
    // This allows us to stream the "thinking" process to the user.
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
      2. STREAM your rationale first as human readable text (start with "ANALYSIS:").
      3. END with the JSON result.

      OUTPUT FORMAT:
      ANALYSIS: <Brief technical explanation of why you are taking this trade, 1-2 sentences>
      JSON_RESULT: { "probability": number, "signal": "BUY"|"SELL"|"WAIT", "rationale": "string copy of analysis" }
    `;

    // Use Gemini 1.5 Flash for speed
    const streamResult = await ai.models.generateContentStream({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    let fullText = '';
    let rationaleStreamed = '';

    for await (const chunk of streamResult) {
      const chunkText = chunk.text || "";
      fullText += chunkText;

      // Simple streaming of the rationale part logic
      // We try to strip "JSON_RESULT" if it appears to avoid showing JSON to user
      const cleanChunk = chunkText.replace(/JSON_RESULT[\s\S]*/, '');
      rationaleStreamed += cleanChunk;

      if (onStream) {
        // Pass the accumulated rationale so far, cleaning up the 'ANALYSIS:' prefix if present
        onStream(rationaleStreamed.replace('ANALYSIS:', '').trim());
      }
    }

    // Parse the final JSON
    // We look for the JSON object at the end of the string
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const json = JSON.parse(jsonMatch[0]);

    const result: PredictionResult = {
      probability: json.probability || 0,
      signal: (json.signal as SignalType) || SignalType.WAIT,
      rationale: json.rationale || rationaleStreamed.replace('ANALYSIS:', '').trim(),
      timestamp: Date.now()
    };

    // Save to Cache
    resultCache.set(cacheKey, { timestamp: Date.now(), data: result });

    return result;

  } catch (error: any) {
    if (onStream) onStream(`Error: ${error.message}. Falling back to local logic.`);
    console.warn("Gemini Error:", error);
    return calculateLocalPrediction(indicators, "API ERROR");
  }
};
