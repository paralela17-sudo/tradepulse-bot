import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, AlertTriangle, Play, Pause, Lock, RefreshCw, TrendingUp, TrendingDown, Flame, BarChart3, Siren, Power, ScanEye, Settings, Key, X, CheckCircle2, Globe, Timer } from 'lucide-react';
import { Chart } from './Chart';
import { Candle, TechnicalIndicators, PredictionResult, SignalType, Asset } from './types';
import { analyzeMarket } from './indicators';
import { getGeminiPrediction, initializeGemini, saveApiKey, getStoredApiKey, removeApiKey } from './geminiService';
import { marketDataService, DataProvider } from './marketDataService';
import { OpportunityPanel } from './OpportunityPanel';
import { scanAllAssets } from './scannerService';

// Full Asset List based on user request
const ASSETS: Asset[] = [
  // --- CRYPTO (Real Binance Data where possible) ---
  { symbol: 'btcusdt', name: 'Bitcoin', category: 'Crypto', profit: 86, isHot: true, initialPrice: 116186.66, isSimulated: false },
  { symbol: 'ltcusdt', name: 'Litecoin', category: 'Crypto', profit: 86, isHot: true, initialPrice: 115.69, isSimulated: false },
  { symbol: 'adausdt', name: 'Cardano', category: 'Crypto', profit: 86, isHot: true, initialPrice: 0.8986, isSimulated: false },
  { symbol: 'bnbusdt', name: 'BNB', category: 'Crypto', profit: 92, isHot: true, initialPrice: 986.94, isSimulated: false },
  { symbol: 'xrpusdt', name: 'XRP', category: 'Crypto', profit: 86, isHot: true, initialPrice: 3.0356, isSimulated: false },
  { symbol: 'ethusdt', name: 'Ethereum', category: 'Crypto', profit: 86, isHot: true, initialPrice: 4512.84, isSimulated: false },
  { symbol: 'solusdt', name: 'Solana', category: 'Crypto', profit: 86, isHot: true, initialPrice: 240.65, isSimulated: false },
  { symbol: 'dogeusdt', name: 'DOGE', category: 'Crypto', profit: 80, isHot: true, initialPrice: 0.2448, isSimulated: false },
  { symbol: 'avaxusdt', name: 'AVAX', category: 'Crypto', profit: 80, isHot: true, initialPrice: 34.33, isSimulated: false },
  { symbol: 'suiusdt', name: 'SUI', category: 'Crypto', profit: 80, isHot: true, initialPrice: 3.19, isSimulated: false },
  { symbol: 'linkusdt', name: 'LINK', category: 'Crypto', profit: 80, isHot: true, initialPrice: 20.74, isSimulated: false },
  { symbol: 'xlmusdt', name: 'Stellar', category: 'Crypto', profit: 80, isHot: true, initialPrice: 0.28, isSimulated: false },

  // --- STOCKS (Simulated) ---
  { symbol: 'AAPL_S', name: 'Apple', category: 'Stocks', profit: 98, isHot: true, initialPrice: 237.92, isSimulated: true },
  { symbol: 'NFLX_S', name: 'Netflix', category: 'Stocks', profit: 88, isHot: true, initialPrice: 1207.78, isSimulated: true },
  { symbol: 'META_S', name: 'Meta', category: 'Stocks', profit: 96, isHot: true, initialPrice: 780.31, isSimulated: true },
  { symbol: 'TSLA_S', name: 'Tesla', category: 'Stocks', profit: 94, isHot: true, initialPrice: 416.81, isSimulated: true },
  { symbol: 'MSFT_S', name: 'Microsoft', category: 'Stocks', profit: 80, isHot: true, initialPrice: 508.42, isSimulated: true },
  { symbol: 'MCD_S', name: 'McDonalds', category: 'Stocks', profit: 86, isHot: true, initialPrice: 301.21, isSimulated: true },
  { symbol: 'AMZN_S', name: 'Amazon', category: 'Stocks', profit: 80, isHot: true, initialPrice: 237.92, isSimulated: true },
  { symbol: 'PYPL_S', name: 'PayPal', category: 'Stocks', profit: 80, isHot: true, initialPrice: 237.92, isSimulated: true },
  { symbol: 'SBUX_S', name: 'Starbucks', category: 'Stocks', profit: 80, isHot: true, initialPrice: 85.69, isSimulated: true },
  { symbol: 'NVDA_S', name: 'NVIDIA', category: 'Stocks', profit: 80, isHot: true, initialPrice: 237.92, isSimulated: true },
  { symbol: 'DIS_S', name: 'Disney', category: 'Stocks', profit: 80, isHot: true, initialPrice: 112.99, isSimulated: true },
  { symbol: 'INTC_S', name: 'Intel', category: 'Stocks', profit: 80, isHot: true, initialPrice: 33.27, isSimulated: true },
  { symbol: 'V_S', name: 'VISA', category: 'Stocks', profit: 80, isHot: true, initialPrice: 336.44, isSimulated: true },
  { symbol: 'IBM_S', name: 'IBM', category: 'Stocks', profit: 80, isHot: true, initialPrice: 282.21, isSimulated: true },
  { symbol: 'F_S', name: 'Ford', category: 'Stocks', profit: 80, isHot: true, initialPrice: 11.57, isSimulated: true },
  { symbol: 'KO_S', name: 'Coca-Cola', category: 'Stocks', profit: 80, isHot: true, initialPrice: 66.09, isSimulated: true },
  { symbol: 'NKE_S', name: 'NIKE', category: 'Stocks', profit: 80, isHot: true, initialPrice: 69.74, isSimulated: true },
  { symbol: 'MA_S', name: 'Mastercard', category: 'Stocks', profit: 80, isHot: true, initialPrice: 568.30, isSimulated: true },
  { symbol: 'SPOT_S', name: 'Spotify', category: 'Stocks', profit: 80, isHot: true, initialPrice: 709.00, isSimulated: true },

  // --- OTC (Simulated) ---
  { symbol: 'EURUSD_OTC', name: 'EUR/USD (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 1.1260, isSimulated: true },
  { symbol: 'BTC_OTC', name: 'Bitcoin (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 111849.60, isSimulated: true },
  { symbol: 'LTC_OTC', name: 'Litecoin (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 118.01, isSimulated: true },
  { symbol: 'AAPL_OTC', name: 'Apple (OTC)', category: 'OTC', profit: 98, isHot: true, initialPrice: 236.27, isSimulated: true },
  { symbol: 'ADA_OTC', name: 'Cardano (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 0.9735, isSimulated: true },
  { symbol: 'EURGBP_OTC', name: 'EUR/GBP (OTC)', category: 'OTC', profit: 98, isHot: true, initialPrice: 0.8531, isSimulated: true },
  { symbol: 'AUDJPY_OTC', name: 'AUD/JPY (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 99.94, isSimulated: true },
  { symbol: 'XAUUSD_OTC', name: 'XAU/USD (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 3661.69, isSimulated: true },
  { symbol: 'BNB_OTC', name: 'BNB (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 958.30, isSimulated: true },
  { symbol: 'NFLX_OTC', name: 'Netflix (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 1154.55, isSimulated: true },
  { symbol: 'META_OTC', name: 'Meta (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 768.30, isSimulated: true },
  { symbol: 'TSLA_OTC', name: 'Tesla (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 402.41, isSimulated: true },
  { symbol: 'MSFT_OTC', name: 'Microsoft (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 530.01, isSimulated: true },
  { symbol: 'EURJPY_OTC', name: 'EUR/JPY (OTC)', category: 'OTC', profit: 92, isHot: true, initialPrice: 165.86, isSimulated: true },

  // --- FOREX (Simulated) ---
  { symbol: 'EURUSD_F', name: 'EUR/USD', category: 'Forex', profit: 86, isHot: true, initialPrice: 1.1730, isSimulated: true },
  { symbol: 'EURGBP_F', name: 'EUR/GBP', category: 'Forex', profit: 86, isHot: true, initialPrice: 0.8710, isSimulated: true },
  { symbol: 'AUDJPY_F', name: 'AUD/JPY', category: 'Forex', profit: 86, isHot: true, initialPrice: 97.60, isSimulated: true },
  { symbol: 'XAUUSD_F', name: 'XAU/USD', category: 'Forex', profit: 91, isHot: true, initialPrice: 3648.86, isSimulated: true },
  { symbol: 'EURJPY_F', name: 'EUR/JPY', category: 'Forex', profit: 92, isHot: true, initialPrice: 171.50, isSimulated: true },
  { symbol: 'GBPUSD_F', name: 'GBP/USD', category: 'Forex', profit: 92, isHot: true, initialPrice: 1.3467, isSimulated: true },
  { symbol: 'AUDCAD_F', name: 'AUD/CAD', category: 'Forex', profit: 92, isHot: true, initialPrice: 0.9105, isSimulated: true },
  { symbol: 'USDCAD_F', name: 'USD/CAD', category: 'Forex', profit: 92, isHot: true, initialPrice: 1.3821, isSimulated: true },
  { symbol: 'NZDUSD_F', name: 'NZD/USD', category: 'Forex', profit: 96, isHot: true, initialPrice: 0.5857, isSimulated: true },
  { symbol: 'USDJPY_F', name: 'USD/JPY', category: 'Forex', profit: 92, isHot: true, initialPrice: 148.13, isSimulated: true },
];

const BROKERS = [
  { id: 'binance', name: 'Binance', type: 'API Integration', status: 'Connected', color: 'text-yellow-400' },
  { id: 'iq', name: 'IQ Option', type: 'Signal Mode', status: 'Manual Entry', color: 'text-orange-500' },
  { id: 'quotex', name: 'Quotex', type: 'Signal Mode', status: 'Manual Entry', color: 'text-blue-400' },
  { id: 'exnova', name: 'Exnova', type: 'Signal Mode', status: 'Manual Entry', color: 'text-green-400' },
  { id: 'pocket', name: 'Pocket Option', type: 'Signal Mode', status: 'Manual Entry', color: 'text-cyan-400' },
  { id: 'generic', name: 'Generic Broker', type: 'Signal Mode', status: 'Manual Entry', color: 'text-slate-400' },
];

const App: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // State for automation controls
  const [autoTrade, setAutoTrade] = useState(false);
  const [enableAI, setEnableAI] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [activeBroker, setActiveBroker] = useState(BROKERS[0]); // Default to Binance
  const [activeProvider, setActiveProvider] = useState<DataProvider>('BINANCE');
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [forceSimulation, setForceSimulation] = useState(false);


  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [searchQuery, setSearchQuery] = useState("");

  // Scanner states
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scannerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for API Key on mount
  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setHasKey(true);
      setApiKey(key);
    }
  }, []);

  const handleSaveKey = () => {
    saveApiKey(apiKey);
    setHasKey(true);
    setShowSettings(false);
    if (indicators) handleAnalysis(indicators);
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setHasKey(false);
    setApiKey("");
  };

  const handleBrokerSelect = (broker: typeof BROKERS[0]) => {
    setActiveBroker(broker);
    setShowBrokerModal(false);
  };

  // Timer for the candle window
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeGemini();
  }, []);

  // Scanner multi-ativos
  const runScanner = useCallback(async () => {
    console.log('[SCANNER] Starting scan...');
    setIsScanning(true);

    try {
      const results = await scanAllAssets(ASSETS);
      setOpportunities(results);
      setLastScanTime(Date.now());
      console.log(`[SCANNER] Found ${results.length} opportunities`);
    } catch (error) {
      console.error('[SCANNER] Error:', error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Iniciar scanner automático
  useEffect(() => {
    // Scan inicial após 5 segundos
    const initialScanTimer = setTimeout(() => {
      runScanner();
    }, 5000);

    // Scan periódico a cada 60 segundos
    scannerTimerRef.current = setInterval(() => {
      runScanner();
    }, 60000);

    return () => {
      clearTimeout(initialScanTimer);
      if (scannerTimerRef.current) {
        clearInterval(scannerTimerRef.current);
      }
    };
  }, [runScanner]);

  // Data Stream Handler
  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    if (simRef.current) clearInterval(simRef.current);

    setCandles([]);
    setIsConnected(false);
    setPrediction(null);

    // Force simulation if enabled OR if asset is natively simulated
    const isSimulatedMode = forceSimulation || selectedAsset.isSimulated;

    if (isSimulatedMode) {
      setIsConnected(true);
      let simPrice = selectedAsset.initialPrice;
      const volatility = simPrice * 0.0005;

      const initialCandles: Candle[] = [];
      let tempPrice = simPrice;
      const now = Date.now();
      for (let i = 50; i > 0; i--) {
        tempPrice = tempPrice + (Math.random() - 0.5) * volatility * 5;
        initialCandles.push({
          time: now - (i * 60000),
          open: tempPrice,
          high: tempPrice * 1.001,
          low: tempPrice * 0.999,
          close: tempPrice,
          volume: Math.random() * 1000
        });
      }
      setCandles(initialCandles);
      setCurrentPrice(simPrice);

      simRef.current = setInterval(() => {
        const change = (Math.random() - 0.5) * volatility;
        simPrice += change;
        setCurrentPrice(simPrice);

        const currentTimestamp = Date.now();
        const currentMinute = Math.floor(currentTimestamp / 60000) * 60000;

        setCandles(prev => {
          const lastCandle = prev[prev.length - 1];

          if (lastCandle && lastCandle.time === currentMinute) {
            const newCandles = [...prev];
            newCandles[newCandles.length - 1] = {
              ...lastCandle,
              close: simPrice,
              high: Math.max(lastCandle.high, simPrice),
              low: Math.min(lastCandle.low, simPrice),
              volume: lastCandle.volume + Math.random() * 10
            };
            return newCandles;
          } else {
            const newCandle: Candle = {
              time: currentMinute,
              open: simPrice,
              high: simPrice,
              low: simPrice,
              close: simPrice,
              volume: 0
            };
            return [...prev, newCandle].slice(-50);
          }
        });
      }, 1000);

    } else {
      // --- MARKET DATA SERVICE (Multi-Provider) ---
      console.log(`[App] Initializing connection for ${selectedAsset.symbol}`);

      marketDataService.connect(selectedAsset.symbol, {
        onMessage: (candle: Candle) => {
          setCurrentPrice(candle.close);
          setCandles(prev => {
            const lastCandle = prev[prev.length - 1];
            if (lastCandle && lastCandle.time === candle.time) {
              const newCandles = [...prev];
              newCandles[newCandles.length - 1] = candle;
              return newCandles;
            } else {
              return [...prev, candle].slice(-50);
            }
          });
        },
        onStatusChange: (provider, message) => {
          console.log(`[App] Status: ${provider} - ${message}`);
          setStatusMessage(message);
          setActiveProvider(provider);
          setIsConnected(true);
        },
        onError: (err) => {
          console.error(`[App] MarketData Error: ${err}`);
          setStatusMessage(`Error: ${err}`);
          setIsConnected(false);
        }
      });
    }

    return () => {
      marketDataService.disconnect();
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [selectedAsset, forceSimulation]);

  const handleAnalysis = useCallback(async (inds: TechnicalIndicators) => {
    if (candles.length === 0) return;

    setIsAnalyzing(true);
    setStatusMessage("Initializing...");
    setPrediction(null);

    try {
      const lastPrice = candles[candles.length - 1].close;
      setStatusMessage("Analyzing Market Data...");

      // Create a safety timeout promise
      const timeoutPromise = new Promise<PredictionResult>((_, reject) => {
        setTimeout(() => reject(new Error("Application Timeout (10s)")), 10000);
      });

      // Race the actual API call against the timeout
      const result = await Promise.race([
        getGeminiPrediction(selectedAsset.name, lastPrice, inds),
        timeoutPromise
      ]);

      setStatusMessage("Processing Result...");
      setPrediction(result);
    } catch (error: any) {
      console.error("Analysis Failed:", error);
      setStatusMessage(`Error: ${error.message || "Unknown Failure"}`);

      // Fallback to local prediction logic if everything fails
      setPrediction({
        probability: 0,
        signal: SignalType.WAIT,
        rationale: `System Alert: Analysis timed out or failed (${error.message}). Retrying...`,
        timestamp: Date.now()
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [candles, selectedAsset.name]);


  // Track if we've already scanned for the current candle to avoid duplicates or misses
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (candles.length < 20) return;

    const currentIndicators = analyzeMarket(candles);
    setIndicators(currentIndicators);

    // Auto-analyze Logic: Trigger ONCE per candle around the 35s-30s mark
    // We use a broader window (35s to 25s) but check a ref to ensure we only do it once per minute.
    const currentMinute = candles[candles.length - 1].time;

    // DEBUG: Log values to understand why scan might be skipping
    console.log(`[DEBUG] timeLeft: ${timeLeft}s, currentMinute: ${new Date(currentMinute).toISOString()}, lastScanned: ${lastScannedTimeRef.current ? new Date(lastScannedTimeRef.current).toISOString() : 'never'}, isAnalyzing: ${isAnalyzing}`);

    if (timeLeft <= 60 && timeLeft >= 30 && lastScannedTimeRef.current !== currentMinute && !isAnalyzing) {
      console.log(`[AUTO-SCAN] 🎯 Triggering scan at ${timeLeft}s for candle ${new Date(currentMinute).toISOString()}`);
      console.log(`[AUTO-SCAN] RSI: ${currentIndicators.rsi.toFixed(2)}, MACD Hist: ${currentIndicators.macd.histogram.toFixed(6)}`);
      lastScannedTimeRef.current = currentMinute;
      handleAnalysis(currentIndicators);
    } else if (timeLeft <= 60 && timeLeft >= 30 && lastScannedTimeRef.current === currentMinute) {
      console.log(`[AUTO-SCAN] ⏭️ Skipping - already scanned this candle (${new Date(currentMinute).toISOString()})`);
    }
  }, [candles.length, timeLeft, handleAnalysis, isAnalyzing]); // Auto-scan sempre ativo (não depende de enableAI)

  const getSignalColor = (signal: SignalType) => {
    switch (signal) {
      case SignalType.BUY: return 'text-green-400 border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(74,222,128,0.2)]';
      case SignalType.SELL: return 'text-red-400 border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(248,113,113,0.2)]';
      default: return 'text-slate-400 border-slate-600 bg-slate-800';
    }
  };

  const getConfidenceColor = (prob: number) => {
    if (prob >= 90) return 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]';
    if (prob >= 75) return 'text-green-500';
    if (prob >= 60) return 'text-yellow-400';
    return 'text-slate-400';
  };

  const filteredAssets = ASSETS.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isHighProb = prediction && prediction.probability >= 90 && (prediction.signal === 'BUY' || prediction.signal === 'SELL');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 pb-20 md:pb-0">

      {/* --- HIGH PROBABILITY ALERT OVERLAY --- */}
      {isHighProb && timeLeft < 40 && timeLeft > 5 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-green-900/20 backdrop-blur-sm animate-pulse pointer-events-none px-4">
          <div className="bg-slate-900/90 border-2 border-green-500 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.5)] flex flex-col items-center animate-bounce-slow text-center max-w-sm md:max-w-md w-full">
            <Siren className="w-12 h-12 md:w-16 md:h-16 text-green-400 mb-4 animate-spin-slow" />
            <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">
              OPPORTUNITY DETECTED
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`text-3xl md:text-5xl font-bold ${prediction?.signal === 'BUY' ? 'text-green-400' : 'text-red-500'}`}>
                {prediction?.signal} NOW
              </span>
              <div className="h-8 md:h-12 w-[2px] bg-slate-600"></div>
              <div className="flex flex-col items-center">
                <span className="text-xs md:text-sm text-slate-400 uppercase">Time Left</span>
                <span className="text-2xl md:text-4xl font-mono font-bold text-white">{timeLeft}s</span>
              </div>
            </div>
            <p className="mt-4 text-slate-300 text-sm md:text-base font-medium bg-slate-800 px-4 py-2 rounded-lg">
              {prediction?.rationale}
            </p>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-cyan-400" /> Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Gemini API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Google Gemini API Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Your key is stored locally in your browser. It is never sent to our servers.
              </p>
            </div>

            <div className="flex gap-3">
              {hasKey && (
                <button
                  onClick={handleRemoveKey}
                  className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 py-3 rounded-xl font-medium transition-colors"
                >
                  Clear Key
                </button>
              )}
              <button
                onClick={handleSaveKey}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broker Selection Modal */}
      {showBrokerModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-auto shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-cyan-400" /> Select Target Broker
              </h3>
              <button onClick={() => setShowBrokerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-6 shrink-0">
              Select the broker you are manually trading on. TradePulse will analyze market data (via Binance/OTC) and generate signals optimized for your platform's timeframe.
            </p>

            <div className="space-y-3 overflow-y-auto scrollbar-thin">
              {BROKERS.map(broker => (
                <button
                  key={broker.id}
                  onClick={() => handleBrokerSelect(broker)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${activeBroker.id === broker.id
                    ? 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-900 font-bold ${broker.color}`}>
                      {broker.name.substring(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className={`font-bold ${activeBroker.id === broker.id ? 'text-white' : 'text-slate-300'}`}>
                        {broker.name}
                      </div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {broker.type}
                      </div>
                    </div>
                  </div>
                  {activeBroker.id === broker.id && (
                    <CheckCircle2 className="w-6 h-6 text-cyan-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                TradePulse AI
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                {selectedAsset.isSimulated || forceSimulation ? 'Simulation Stream' : `${activeProvider} Live Stream`}
              </p>

              <button
                onClick={() => setForceSimulation(!forceSimulation)}
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${forceSimulation ? 'bg-purple-500/20 text-purple-400 border-purple-500' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
              >
                {forceSimulation ? 'MODE: SIMULATED' : 'MODE: LIVE'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-xs text-slate-400">Target Broker</span>
              <span className={`text-sm font-bold ${activeBroker.color}`}>{activeBroker.name}</span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg transition-colors border ${hasKey ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 animate-pulse'}`}
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowBrokerModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Lock className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Connect Broker</span><span className="md:hidden">Broker</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 md:py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Opportunity Panel - New! */}
        <div className="lg:col-span-1 order-last lg:order-first">
          <OpportunityPanel
            opportunities={opportunities}
            onSelectAsset={setSelectedAsset}
            isScanning={isScanning}
            lastScanTime={lastScanTime}
          />
        </div>

        {/* Middle Column: Chart & Controls */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* Asset Selector */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-3">
              <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Market Selector
              </h3>
              <input
                type="text"
                placeholder="Search asset..."
                className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 md:py-1 text-sm md:text-xs focus:outline-none focus:border-cyan-500"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0">
              {['Crypto', 'OTC', 'Stocks', 'Forex', 'Commodities'].map(cat => (
                <div key={cat} className="flex-shrink-0">
                  <span className="text-xs font-bold text-slate-500 uppercase px-2 mb-1 block">{cat}</span>
                  <div className="flex gap-2">
                    {filteredAssets.filter(a => a.category === cat).map(asset => (
                      <button
                        key={asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        className={`flex flex-col min-w-[100px] p-2 rounded-lg border transition-all ${selectedAsset.symbol === asset.symbol
                          ? 'bg-cyan-500/10 border-cyan-500/50'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className={`text-xs font-bold ${selectedAsset.symbol === asset.symbol ? 'text-cyan-400' : 'text-slate-300'}`}>
                            {asset.name}
                          </span>
                          {asset.isHot && <Flame className="w-3 h-3 text-orange-500 fill-orange-500 animate-pulse" />}
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] text-slate-500">{asset.category}</span>
                          <span className="text-[10px] font-bold text-green-400">{asset.profit}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chart */}
          <div className="relative group bg-slate-900 rounded-xl border border-slate-800 p-1">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700">
              <span className="text-2xl md:text-3xl font-bold text-white tracking-tight mr-2">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="text-xs text-green-400 font-mono block md:inline">
                Payout: {selectedAsset.profit}%
              </span>
            </div>
            {/* Chart is its own component so we just wrap it */}
            <div className="h-[300px] md:h-64 w-full pt-16 md:pt-0">
              <Chart data={candles} color={currentPrice > (candles[0]?.close || 0) ? '#10b981' : '#ef4444'} />
            </div>
          </div>

          {/* Technical Grid */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="bg-slate-900 rounded-xl p-3 md:p-4 border border-slate-800">
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">RSI (14)</span>
              <div className="text-lg md:text-2xl font-bold mt-1 text-slate-200">
                {indicators?.rsi.toFixed(2) || '--'}
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${indicators?.rsi && indicators.rsi > 70 ? 'bg-red-500' : indicators?.rsi && indicators.rsi < 30 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${indicators?.rsi || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 md:p-4 border border-slate-800">
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">MACD Hist</span>
              <div className={`text-lg md:text-2xl font-bold mt-1 ${indicators?.macd.histogram && indicators.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {indicators?.macd.histogram.toFixed(5) || '--'}
              </div>
              <span className="text-[10px] md:text-xs text-slate-600 block truncate">Trend Strength</span>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 md:p-4 border border-slate-800">
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Entry Window</span>
              <div className="text-lg md:text-2xl font-mono font-bold mt-1 text-cyan-400 flex items-center gap-2">
                <Timer className="w-4 h-4 md:w-5 md:h-5" /> {timeLeft}s
              </div>
              <span className="text-[10px] md:text-xs text-slate-600 block truncate">Until Next Candle</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-500/80">
              <strong>Active Mode: {activeBroker.name} ({activeBroker.type})</strong><br />
              Using Binance WebSocket data as a proxy. Prices on {activeBroker.name} may vary.
            </p>
          </div>
        </div>

        {/* Right Column: AI Predictions & Actions */}
        <div className="space-y-4 md:space-y-6">

          {/* Signal Card */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">AI Prediction</h2>
                  <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                    Gemini 🧠
                  </span>
                </div>
                <p className="text-xs text-slate-500">Gemini 1.5 Flash • 1M TF</p>
              </div>
              <div className="flex gap-2">
                {/* Auto-Scan Toggle */}
                <button
                  onClick={() => setEnableAI(!enableAI)}
                  className={`p-2 rounded-lg transition-colors ${enableAI ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}
                  title={enableAI ? "Disable Auto-Scan (Save Quota)" : "Enable Auto-Scan"}
                >
                  <Power className="w-5 h-5" />
                </button>
                {/* Manual Scan */}
                <button
                  onClick={() => indicators && handleAnalysis(indicators)}
                  disabled={isAnalyzing}
                  className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title="Scan Now"
                >
                  <ScanEye className={`w-5 h-5 text-yellow-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              {prediction ? (
                <>
                  <div className={`text-4xl md:text-5xl font-black tracking-tighter mb-2 transition-all duration-500 ${getConfidenceColor(prediction.probability)} ${prediction.probability > 90 ? 'scale-110 animate-pulse' : ''}`}>
                    {prediction.probability}%
                  </div>
                  <span className="text-sm text-slate-400 uppercase tracking-widest font-medium">Win Probability</span>

                  <div className={`mt-6 px-6 py-2 rounded-full border-2 font-bold text-xl flex items-center gap-2 transition-all duration-300 ${getSignalColor(prediction.signal)}`}>
                    {prediction.signal === SignalType.BUY && <TrendingUp className="w-5 h-5" />}
                    {prediction.signal === SignalType.SELL && <TrendingDown className="w-5 h-5" />}
                    {prediction.signal === SignalType.WAIT && <Pause className="w-5 h-5" />}
                    {prediction.signal}
                  </div>

                  {prediction.probability > 90 && (
                    <div className="mt-4 flex items-center gap-2 text-green-400 animate-bounce">
                      <Siren className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">SNIPER SIGNAL</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 flex flex-col items-center animate-pulse">
                  <RefreshCw className="w-8 h-8 mb-2 animate-spin" />
                  <span>
                    {!isConnected ? "Connecting to Market..." :
                      candles.length === 0 ? "Waiting for Candles..." :
                        statusMessage || "Scanning Market..."}
                  </span>
                </div>
              )}
            </div>

            {prediction && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 italic">
                  "{prediction.rationale}"
                </p>
              </div>
            )}
          </div>

          {/* Manual Trade Actions */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Manual Entry</h3>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                Target: {selectedAsset.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                disabled={!prediction}
                className="bg-green-600 hover:bg-green-500 active:scale-95 transition-all py-4 rounded-xl flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <TrendingUp className="w-6 h-6 text-white mb-1 group-hover:-translate-y-1 transition-transform" />
                <span className="font-bold text-white">CALL (UP)</span>
              </button>
              <button
                disabled={!prediction}
                className="bg-red-600 hover:bg-red-500 active:scale-95 transition-all py-4 rounded-xl flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <TrendingDown className="w-6 h-6 text-white mb-1 group-hover:translate-y-1 transition-transform" />
                <span className="font-bold text-white">PUT (DOWN)</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${autoTrade ? 'bg-cyan-500' : 'bg-slate-600'}`} onClick={() => setAutoTrade(!autoTrade)}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${autoTrade ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium text-slate-300">Copy Trading Bot</span>
              </div>
              {autoTrade ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4 text-slate-500" />}
            </div>
          </div>

        </div>
      </main>


    </div>
  );
};

export default App;
