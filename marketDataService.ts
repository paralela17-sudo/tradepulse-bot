import { Candle } from './types';
import { getCoinGeckoId, startCoinGeckoPricePolling } from './coinGeckoService';

export type DataProvider = 'BINANCE' | 'BYBIT' | 'COINGECKO' | 'SIMULATION';

interface ConnectionCallbacks {
    onMessage: (candle: Candle) => void;
    onHistory?: (candles: Candle[]) => void;
    onError: (error: string) => void;
    onStatusChange: (provider: DataProvider, status: string) => void;
}

export class MarketDataService {
    private ws: WebSocket | null = null;
    private currentSymbol: string = '';
    private callbacks: ConnectionCallbacks | null = null;
    private coinGeckoCleanup: (() => void) | null = null;
    private connectionTimeout: number | null = null;
    private isIntentionalClose: boolean = false;

    constructor() { }

    public connect(symbol: string, callbacks: ConnectionCallbacks) {
        this.disconnect();
        this.currentSymbol = symbol;
        this.callbacks = callbacks;
        this.isIntentionalClose = false;

        // Start with Bybit (Prioritized per user request)
        this.tryBybit();
    }

    public disconnect() {
        this.isIntentionalClose = true;
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.coinGeckoCleanup) {
            this.coinGeckoCleanup();
            this.coinGeckoCleanup = null;
        }
    }

    private async fetchHistory(provider: DataProvider) {
        if (!this.callbacks?.onHistory) return;

        console.log(`[MarketData] Fetching history from ${provider} for ${this.currentSymbol}...`);
        try {
            let candles: Candle[] = [];

            if (provider === 'BYBIT') {
                const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${this.currentSymbol.toUpperCase()}&interval=1&limit=50`;
                const res = await fetch(url);
                const json = await res.json();

                if (json.retCode === 0 && json.result?.list) {
                    candles = json.result.list.map((k: any[]) => ({
                        time: parseInt(k[0]),
                        open: parseFloat(k[1]),
                        high: parseFloat(k[2]),
                        low: parseFloat(k[3]),
                        close: parseFloat(k[4]),
                        volume: parseFloat(k[5])
                    })).reverse(); // Bybit returns descending
                }
            } else if (provider === 'BINANCE') {
                const url = `https://api.binance.com/api/v3/klines?symbol=${this.currentSymbol.toUpperCase()}&interval=1m&limit=50`;
                const res = await fetch(url);
                const json = await res.json();

                if (Array.isArray(json)) {
                    candles = json.map((k: any[]) => ({
                        time: k[0],
                        open: parseFloat(k[1]),
                        high: parseFloat(k[2]),
                        low: parseFloat(k[3]),
                        close: parseFloat(k[4]),
                        volume: parseFloat(k[5])
                    }));
                }
            }

            if (candles.length > 0) {
                console.log(`[MarketData] Loaded ${candles.length} historical candles from ${provider}`);
                this.callbacks.onHistory(candles);
            }
        } catch (e) {
            console.error(`[MarketData] History fetch failed for ${provider}:`, e);
        }
    }

    // --- BYBIT STRATEGY ---
    private tryBybit() {
        this.disconnect(); // Clear previous state
        this.isIntentionalClose = false; // Reset intentional close
        const bybitSymbol = this.currentSymbol.toUpperCase();

        if (this.callbacks) this.callbacks.onStatusChange('BYBIT', 'Connecting to Bybit (Backup)...');
        console.log(`[MarketData] Attempting Bybit connection for ${bybitSymbol}`);

        // FETCH HISTORY FIRST
        this.fetchHistory('BYBIT');

        this.ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

        this.setConnectionTimeout(7000, () => {
            console.warn('[MarketData] Bybit timeout! Switching to Binance...');
            if (this.ws) this.ws.close();
            this.tryBinance();
        });

        this.ws.onopen = () => {
            this.clearConnectionTimeout();
            console.log('[MarketData] Bybit Connected. Subscribing...');
            // Subscribe message
            const subscribeMsg = {
                "op": "subscribe",
                "args": [`kline.1.${bybitSymbol}`]
            };
            this.ws?.send(JSON.stringify(subscribeMsg));
            if (this.callbacks) this.callbacks.onStatusChange('BYBIT', 'Connected (Real-time Backup)');
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                // Handle subscription confirmation
                if (msg.success) {
                    console.log(`[MarketData] Bybit Subscription Success: ${msg.ret_msg}`);
                    return;
                }

                // Handle Data
                if (msg.topic && msg.topic.startsWith('kline') && msg.data && msg.data.length > 0) {
                    const k = msg.data[0];
                    const candle: Candle = {
                        time: parseInt(k.start),
                        open: parseFloat(k.open),
                        high: parseFloat(k.high),
                        low: parseFloat(k.low),
                        close: parseFloat(k.close),
                        volume: parseFloat(k.volume)
                    };
                    if (this.callbacks) this.callbacks.onMessage(candle);
                }

            } catch (e) {
                console.error('[MarketData] Bybit Parse Error', e);
            }
        };

        this.ws.onerror = (e) => {
            console.error('[MarketData] Bybit Error', e);
        };

        this.ws.onclose = () => {
            if (this.isIntentionalClose) return;
            console.warn('[MarketData] Bybit Closed. Switching to Binance...');
            this.tryBinance();
        };
    }

    // --- BINANCE STRATEGY ---
    private tryBinance() {
        if (this.callbacks) this.callbacks.onStatusChange('BINANCE', 'Connecting to Binance...');
        console.log(`[MarketData] Attempting Binance connection for ${this.currentSymbol}`);

        // FETCH HISTORY FIRST
        this.fetchHistory('BINANCE');

        this.ws = new WebSocket(`wss://stream.binance.com/ws/${this.currentSymbol}@kline_1m`);
        this.setConnectionTimeout(7000, () => {
            console.warn('[MarketData] Binance timeout! Switching to CoinGecko...');
            if (this.ws) this.ws.close(); // Force close to trigger logic
            this.activateCoinGecko();
        });

        this.ws.onopen = () => {
            this.clearConnectionTimeout();
            if (this.callbacks) this.callbacks.onStatusChange('BINANCE', 'Connected (Primary)');
            console.log('[MarketData] Binance Connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.e === 'kline') {
                    const k = message.k;
                    const candle: Candle = {
                        time: k.t,
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                        volume: parseFloat(k.v),
                    };
                    if (this.callbacks) this.callbacks.onMessage(candle);
                }
            } catch (e) {
                console.error('[MarketData] Binance Parse Error', e);
            }
        };

        this.ws.onerror = (e) => {
            console.error('[MarketData] Binance Error', e);
            // Does not auto-switch here, relies on close or timeout
        };

        this.ws.onclose = () => {
            if (this.isIntentionalClose) return;
            console.warn('[MarketData] Binance Closed. Switching to CoinGecko...');
            this.activateCoinGecko();
        };
    }

    // --- COINGECKO STRATEGY ---
    private activateCoinGecko() {
        this.disconnect();
        if (this.callbacks) this.callbacks.onStatusChange('COINGECKO', 'Using CoinGecko API (Fallback)');

        const coinId = getCoinGeckoId(this.currentSymbol);
        if (!coinId) {
            if (this.callbacks) this.callbacks.onError('All connections failed and no CoinGecko ID found.');
            return;
        }

        console.log(`[MarketData] Starting polling for ${coinId}`);

        // Fix: startCoinGeckoPricePolling returns an interval ID (NodeJS.Timeout or number), 
        // but coinGeckoCleanup expects a function () => void. 
        // We need to wrap the clearInterval.
        const intervalId = startCoinGeckoPricePolling(coinId, (price) => {
            const now = Date.now();
            const currentMinute = Math.floor(now / 60000) * 60000;

            const candle: Candle = {
                time: currentMinute,
                open: price, // Approximate
                high: price,
                low: price,
                close: price,
                volume: 0
            };

            if (this.callbacks) this.callbacks.onMessage(candle);
        }, 3000);

        this.coinGeckoCleanup = () => clearInterval(intervalId);
    }


    // --- HELPERS ---
    private setConnectionTimeout(ms: number, callback: () => void) {
        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = window.setTimeout(callback, ms);
    }

    private clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
}

export const marketDataService = new MarketDataService();
