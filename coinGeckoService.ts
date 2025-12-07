// CoinGecko API Service - Free alternative for real-time crypto prices
// Uses HTTP polling instead of WebSocket to avoid network blocks

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map Binance symbols to CoinGecko IDs
const SYMBOL_MAP: Record<string, string> = {
    'btcusdt': 'bitcoin',
    'ethusdt': 'ethereum',
    'bnbusdt': 'binancecoin',
    'xrpusdt': 'ripple',
    'adausdt': 'cardano',
    'solusdt': 'solana',
    'dogeusdt': 'dogecoin',
    'ltcusdt': 'litecoin',
    'avaxusdt': 'avalanche-2',
    'suiusdt': 'sui',
    'linkusdt': 'chainlink',
    'xlmusdt': 'stellar'
};

export const getCoinGeckoId = (binanceSymbol: string): string | null => {
    return SYMBOL_MAP[binanceSymbol.toLowerCase()] || null;
};

export const fetchCoinGeckoPrice = async (coinId: string): Promise<number | null> => {
    try {
        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.warn(`CoinGecko API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data[coinId]?.usd || null;
    } catch (error) {
        console.error('CoinGecko fetch error:', error);
        return null;
    }
};

export const startCoinGeckoPricePolling = (
    coinId: string,
    onPriceUpdate: (price: number) => void,
    intervalMs: number = 2000
): ReturnType<typeof setInterval> => {
    const poll = async () => {
        const price = await fetchCoinGeckoPrice(coinId);
        if (price !== null) {
            onPriceUpdate(price);
        }
    };

    // Initial fetch
    poll();

    // Set up polling
    return setInterval(poll, intervalMs);
};
