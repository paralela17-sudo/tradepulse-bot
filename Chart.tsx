import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Candle } from './types';

interface ChartProps {
  data: Candle[];
  color: string;
}

export const Chart: React.FC<ChartProps> = ({ data, color }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 w-full bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center">
        <p className="text-slate-500">Carregando dados...</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    time: new Date(d.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    price: d.close,
    high: d.high,
    low: d.low,
    open: d.open,
  }));

  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  const lastCandle = data[data.length - 1];
  const isGreen = lastCandle.close >= lastCandle.open;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2 font-medium">{data.time}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Preço:</span>
            <span className="text-white font-mono font-bold">${data.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Máxima:</span>
            <span className="text-green-400 font-mono">${data.high.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Mínima:</span>
            <span className="text-red-400 font-mono">${data.low.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-80 w-full bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Overlay OHLC */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
        <div className="flex gap-4">
          <div>
            <span className="text-slate-500">O</span>
            <span className="text-slate-200 ml-1">{lastCandle.open.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">H</span>
            <span className="text-green-400 ml-1">{lastCandle.high.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">L</span>
            <span className="text-red-400 ml-1">{lastCandle.low.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">C</span>
            <span className={`ml-1 font-bold ${isGreen ? 'text-green-400' : 'text-red-400'}`}>
              {lastCandle.close.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe */}
      <div className="absolute top-3 right-3 z-10 bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded px-2.5 py-1 text-xs font-bold text-cyan-400">
        1min
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 50, right: 20, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

          <XAxis
            dataKey="time"
            stroke="#64748b"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickMargin={10}
            interval="preserveStartEnd"
            axisLine={{ stroke: '#475569' }}
          />

          <YAxis
            stroke="#64748b"
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            width={70}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            axisLine={{ stroke: '#475569' }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1 }} />

          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            fill="url(#colorPrice)"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};