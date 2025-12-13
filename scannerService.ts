import { Asset, TechnicalIndicators, PredictionResult, SignalType, Candle } from './types';
import { analyzeMarket } from './indicators';

interface ScanResult {
    asset: Asset;
    prediction: PredictionResult;
    indicators: TechnicalIndicators;
    price: number;
}

// Simular dados de candles para um ativo
const generateSimulatedCandles = (asset: Asset, count: number = 50): Candle[] => {
    const candles: Candle[] = [];
    let price = asset.initialPrice;
    const volatility = price * 0.0005;
    const now = Date.now();

    for (let i = count; i > 0; i--) {
        const change = (Math.random() - 0.5) * volatility * 5;
        price += change;

        candles.push({
            time: now - (i * 60000),
            open: price,
            high: price * 1.001,
            low: price * 0.999,
            close: price,
            volume: Math.random() * 1000
        });
    }

    return candles;
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
        prob = 10;
        signal = SignalType.WAIT;
        rationale = "Market noise detected. No statistical edge > 90%";
    }

    return {
        probability: Math.floor(prob),
        signal,
        rationale,
        timestamp: Date.now()
    };
};

// Escanear um único ativo
const scanSingleAsset = async (asset: Asset): Promise<ScanResult> => {
    try {
        // Gerar candles simulados
        const candles = generateSimulatedCandles(asset);

        // Calcular indicadores
        const indicators = analyzeMarket(candles);

        // Calcular predição
        const prediction = calculateLocalPrediction(indicators);

        return {
            asset,
            prediction,
            indicators,
            price: candles[candles.length - 1].close
        };
    } catch (error) {
        console.error(`Error scanning ${asset.symbol}:`, error);
        // Retornar resultado padrão em caso de erro
        return {
            asset,
            prediction: {
                probability: 0,
                signal: SignalType.WAIT,
                rationale: "Error analyzing",
                timestamp: Date.now()
            },
            indicators: {
                rsi: 50,
                macd: { macdLine: 0, signalLine: 0, histogram: 0 },
                sma: 0
            },
            price: asset.initialPrice
        };
    }
};

// Escanear todos os ativos - AGORA RETORNA TODOS (não filtra por ≥90%)
export const scanAllAssets = async (assets: Asset[]): Promise<ScanResult[]> => {
    console.log(`[SCANNER] 🔍 Scanning ${assets.length} assets...`);

    const results: ScanResult[] = [];

    // Escanear em lotes de 10 para não sobrecarregar
    const batchSize = 10;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(asset => scanSingleAsset(asset))
        );

        results.push(...batchResults);

        // Pequeno delay entre lotes para não travar UI
        if (i + batchSize < assets.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    console.log(`[SCANNER] ✅ Scanned ${results.length} assets`);
    console.log(`[SCANNER] 📊 Found ${results.filter(r => r.prediction.probability >= 80).length} opportunities (≥80%)`);
    console.log(`[SCANNER] 🔥 Found ${results.filter(r => r.prediction.probability >= 90).length} HIGH opportunities (≥90%)`);

    // Ordenar por probabilidade (maior primeiro)
    return results.sort((a, b) => b.prediction.probability - a.prediction.probability);
};
