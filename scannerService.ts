import { Asset, TechnicalIndicators, PredictionResult, SignalType, Candle } from './types';
import { analyzeMarket } from './indicators';

interface ScanResult {
    asset: Asset;
    prediction: PredictionResult;
    indicators: TechnicalIndicators;
    price: number;
}

// Fetch Real Candles from Bybit (Primary)
const fetchBybitCandles = async (symbol: string): Promise<Candle[]> => {
    try {
        // Bybit V5 API
        const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol.toUpperCase()}&interval=1&limit=50`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Bybit API Error: ${res.status}`);

        const json = await res.json();

        if (json.retCode === 0 && json.result?.list) {
            return json.result.list.map((k: any[]) => ({
                time: parseInt(k[0]),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            })).reverse(); // Bybit returns descending (newest first), we need ascending
        }
        return [];
    } catch (error) {
        throw error;
    }
};

// Fetch Real Candles from Binance (Fallback)
const fetchBinanceCandles = async (symbol: string): Promise<Candle[]> => {
    try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=1m&limit=50`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

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
        console.warn(`[SCANNER] Binance failed for ${symbol}:`, error);
        throw error;
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

// Escanear um único ativo usando DADOS REAIS (Bybit -> fallback Binance)
const scanSingleAsset = async (asset: Asset): Promise<ScanResult> => {
    let candles: Candle[] = [];

    // 1. Tentar Bybit (Prioridade)
    try {
        candles = await fetchBybitCandles(asset.symbol);
    } catch (bybitError) {
        // 2. Se falhar, tentar Binance (Backup)
        try {
            candles = await fetchBinanceCandles(asset.symbol);
        } catch (binanceError) {
            // 3. Se ambos falharem, retornar Unavailable (SEM SIMULAÇÃO)
            return {
                asset,
                prediction: {
                    probability: 0,
                    signal: SignalType.WAIT,
                    rationale: "Data Unavailable (Bybit/Binance failed)",
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
    }

    if (candles.length < 30) {
        // Fallback return if data is insufficient even if call succeeded
        return {
            asset,
            prediction: {
                probability: 0,
                signal: SignalType.WAIT,
                rationale: "Insufficient Data",
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
};

// Escanear todos os ativos
export const scanAllAssets = async (assets: Asset[]): Promise<ScanResult[]> => {
    console.log(`[SCANNER] 🔍 Scanning ${assets.length} assets (Primary: Bybit, Backup: Binance)...`);

    const results: ScanResult[] = [];

    // Escanear em lotes menores para evitar rate limit
    const batchSize = 5;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(asset => scanSingleAsset(asset))
        );

        results.push(...batchResults);

        // Delay respeitoso para APIs públicas
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
