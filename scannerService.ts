import { Asset, TechnicalIndicators, PredictionResult, SignalType, Candle } from './types';
import { analyzeMarket } from './indicators';

interface ScanResult {
    asset: Asset;
    prediction: PredictionResult;
    indicators: TechnicalIndicators;
    price: number;
}

// Fetch Real Candles from Binance
const fetchBinanceCandles = async (symbol: string): Promise<Candle[]> => {
    try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=1m&limit=50`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout per asset

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Binance API Error: ${res.status}`);

        const json = await res.json();

        if (Array.isArray(json)) {
            return json.map((k: any[]) => ({
                time: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));
        }
        return [];
    } catch (error) {
        console.warn(`[SCANNER] Failed to fetch data for ${symbol}:`, error);
        return [];
    }
};

// Lógica local de predição (mesma do geminiService.ts)
const calculateLocalPrediction = (indicators: TechnicalIndicators): PredictionResult => {
    const { rsi, macd } = indicators;
    let signal = SignalType.WAIT;
    let prob = 0;
    let rationale = "Analyzing...";

    // REGRAS SNIPER
    if (rsi < 15 && macd.histogram > 0) {
        signal = SignalType.BUY;
        prob = 96;
        rationale = `CRITICAL: RSI Oversold (${rsi.toFixed(2)}) + Bullish Divergence`;
    }
    else if (rsi > 85 && macd.histogram < 0) {
        signal = SignalType.SELL;
        prob = 96;
        rationale = `CRITICAL: RSI Overbought (${rsi.toFixed(2)}) + Bearish Divergence`;
    }
    else if (rsi > 55 && rsi < 75 && macd.histogram > 0 && macd.macdLine > macd.signalLine) {
        signal = SignalType.BUY;
        prob = 82;
        rationale = "Trend: Bullish momentum continuation";
    }
    else if (rsi < 45 && rsi > 25 && macd.histogram < 0 && macd.macdLine < macd.signalLine) {
        signal = SignalType.SELL;
        prob = 82;
        rationale = "Trend: Bearish momentum continuation";
    }
    else {
        // Probabilidade dinâmica baseada na força da tendência para evitar valores fixos
        const trendStrength = Math.abs(macd.histogram) * 100; // Ex: 0.0005 -> 0.05
        prob = Math.min(45 + trendStrength, 60); // Base 45%, max 60% se neutro
        signal = SignalType.WAIT;
        rationale = "Market noise detected. No statistical edge > 80%";
    }

    return {
        probability: Math.floor(prob),
        signal,
        rationale,
        timestamp: Date.now()
    };
};

// Escanear um único ativo usando DADOS REAIS
const scanSingleAsset = async (asset: Asset): Promise<ScanResult> => {
    try {
        // Fetch REAL data
        const candles = await fetchBinanceCandles(asset.symbol);

        if (candles.length < 30) {
            throw new Error("Insufficient data");
        }

        // Calcular indicadores reais
        const indicators = analyzeMarket(candles);

        // Calcular predição baseada em dados reais
        const prediction = calculateLocalPrediction(indicators);

        return {
            asset,
            prediction,
            indicators,
            price: candles[candles.length - 1].close
        };
    } catch (error) {
        // Fail silently or showing error state, but DO NOT SIMULATE
        return {
            asset,
            prediction: {
                probability: 0,
                signal: SignalType.WAIT,
                rationale: "Data Unavailable",
                timestamp: Date.now()
            },
            indicators: {
                rsi: 0,
                macd: { macdLine: 0, signalLine: 0, histogram: 0 },
                sma: 0
            },
            price: asset.initialPrice
        };
    }
};

// Escanear todos os ativos
export const scanAllAssets = async (assets: Asset[]): Promise<ScanResult[]> => {
    console.log(`[SCANNER] 🔍 Scanning ${assets.length} assets (REAL DATA)...`);

    const results: ScanResult[] = [];

    // Escanear em lotes menores para evitar rate limit da Binance (IP weight)
    const batchSize = 5;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(asset => scanSingleAsset(asset))
        );

        results.push(...batchResults);

        // Delay respeitoso para API pública (500ms)
        if (i + batchSize < assets.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`[SCANNER] ✅ Scanned ${results.length} assets`);

    // Filtro resultados válidos (prob > 0)
    const validResults = results.filter(r => r.prediction.probability > 0);

    // Ordenar por probabilidade (maior primeiro)
    return validResults.sort((a, b) => b.prediction.probability - a.prediction.probability);
};
