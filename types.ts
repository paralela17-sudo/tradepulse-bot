export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  NEUTRAL = 'NEUTRAL',
  WAIT = 'WAIT'
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  sma: number;
}

export interface PredictionResult {
  probability: number;
  rationale: string;
  signal: SignalType;
  timestamp: number;
}

export interface Asset {
  symbol: string; // ID for internal use or Binance symbol
  name: string;   // Display name
  category: 'Crypto' | 'Stocks' | 'Forex' | 'OTC' | 'Commodities';
  profit: number; // The payout percentage (e.g., 86%)
  isHot: boolean; // For the fire icon
  initialPrice: number; // Starting price for simulation
  isSimulated: boolean; // If true, uses mathematical generation instead of Binance WS
}
