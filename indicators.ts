import { Candle, TechnicalIndicators } from '../types';

export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  if (losses === 0) return 100;

  const averageGain = gains / period;
  const averageLoss = losses / period;
  const rs = averageGain / averageLoss;
  
  return 100 - (100 / (1 + rs));
};

export const calculateEMA = (prices: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
};

export const calculateMACD = (prices: number[]) => {
  if (prices.length < 26) return { macdLine: 0, signalLine: 0, histogram: 0 };

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine = [];
  for(let i = 0; i < prices.length; i++) {
     macdLine.push(ema12[i] - ema26[i]);
  }

  const signalLineArr = calculateEMA(macdLine, 9);
  
  const currentMacd = macdLine[macdLine.length - 1];
  const currentSignal = signalLineArr[signalLineArr.length - 1];

  return {
    macdLine: currentMacd,
    signalLine: currentSignal,
    histogram: currentMacd - currentSignal
  };
};

export const analyzeMarket = (data: Candle[]): TechnicalIndicators => {
  const closes = data.map(c => c.close);
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  
  // Simple SMA 20
  const slice = closes.slice(-20);
  const sma = slice.reduce((a, b) => a + b, 0) / slice.length;

  return { rsi, macd, sma };
};