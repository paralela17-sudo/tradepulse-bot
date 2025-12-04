# TradePulse AI 📈

TradePulse AI is a sophisticated real-time trading dashboard and predictive analysis tool designed for high-frequency trading (HFT) and market monitoring. It leverages **Google Gemini 2.5 Flash** for predictive modeling and **Binance WebSockets** for live market telemetry.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Tech Stack](https://img.shields.io/badge/Stack-React_Vite_Tailwind-blue)

## 🚀 Features

- **Real-Time Market Data**: Live WebSocket connection to Binance for major crypto assets (BTC, ETH, SOL, etc.).
- **Simulated Markets**: OTC, Stock, and Forex simulation engine for strategy testing outside market hours.
- **AI-Powered Predictions**: Uses Google's Gemini 2.5 Flash model to analyze technical indicators (RSI, MACD, SMA) and predict candle closures with probability scoring.
- **Technical Analysis**: Automatic calculation of RSI (14), MACD (12, 26, 9), and SMA (20).
- **Visual Signals**: Clear UI indicators for BUY/SELL signals, win probability, and trend direction.
- **Broker Integration Mode**: Interface to select target brokers (IQ Option, Quotex, etc.) for signal calibration.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **Icons**: Lucide React

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tradepulse-ai.git
   cd tradepulse-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔑 API Configuration

To enable the AI prediction engine, you need a Google Gemini API Key.
1. Get a key from [Google AI Studio](https://aistudiocdn.com/google-ai-studio).
2. Click the **Settings** (Gear icon) in the app header.
3. Paste your API Key. The key is stored locally in your browser (`localStorage`) and is never sent to any external server other than Google's API.

## ⚠️ Disclaimer

This application is for **educational and informational purposes only**. Trading cryptocurrencies and financial derivatives involves significant risk. The "Win Probability" provided by the AI is a statistical estimation based on historical data and technical patterns, not a guarantee of future performance.

## 📄 License

MIT
