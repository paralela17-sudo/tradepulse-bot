import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Candle } from '../types';

interface ChartProps {
  data: Candle[];
  color: string;
}

export const Chart: React.FC<ChartProps> = ({ data, color }) => {
  const chartData = data.map(d => ({
    time: new Date(d.time).toLocaleTimeString(),
    price: d.close,
  }));

  const minPrice = Math.min(...data.map(d => d.close));
  const maxPrice = Math.max(...data.map(d => d.close));
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <div className="h-64 w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            tick={{fontSize: 10}} 
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#94a3b8" 
            domain={[minPrice - padding, maxPrice + padding]} 
            tick={{fontSize: 10}}
            width={60}
          />
          <Tooltip 
            contentStyle={{backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc'}}
            itemStyle={{color: color}}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};