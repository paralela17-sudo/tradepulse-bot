import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Flame, Clock } from 'lucide-react';
import { Asset, PredictionResult, TechnicalIndicators } from './types';

interface OpportunityItem {
    asset: Asset;
    prediction: PredictionResult;
    indicators: TechnicalIndicators;
    price: number;
}

interface OpportunityPanelProps {
    opportunities: OpportunityItem[];
    onSelectAsset: (asset: Asset) => void;
    isScanning: boolean;
    lastScanTime: number;
}

export const OpportunityPanel: React.FC<OpportunityPanelProps> = ({
    opportunities,
    onSelectAsset,
    isScanning,
    lastScanTime
}) => {
    const [alertShown, setAlertShown] = useState<Set<string>>(new Set());

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const filteredOpportunities = opportunities.filter(opp => opp.prediction.probability >= 80);

    // Separar por categoria
    const cryptoOpps = filteredOpportunities.filter(opp => opp.asset.category === 'Crypto');
    const forexOtcOpps = filteredOpportunities.filter(opp =>
        opp.asset.category === 'Forex' || opp.asset.category === 'OTC'
    );
    const othersOpps = filteredOpportunities.filter(opp =>
        opp.asset.category !== 'Crypto' && opp.asset.category !== 'Forex' && opp.asset.category !== 'OTC'
    );

    // Separar por prioridade dentro de cada categoria
    const cryptoHigh = cryptoOpps.filter(opp => opp.prediction.probability >= 90);
    const cryptoMed = cryptoOpps.filter(opp => opp.prediction.probability >= 80 && opp.prediction.probability < 90);

    const forexHigh = forexOtcOpps.filter(opp => opp.prediction.probability >= 90);
    const forexMed = forexOtcOpps.filter(opp => opp.prediction.probability >= 80 && opp.prediction.probability < 90);

    const othersHigh = othersOpps.filter(opp => opp.prediction.probability >= 90);
    const othersMed = othersOpps.filter(opp => opp.prediction.probability >= 80 && opp.prediction.probability < 90);

    const totalHigh = cryptoHigh.length + forexHigh.length + othersHigh.length;
    const totalMed = cryptoMed.length + forexMed.length + othersMed.length;

    useEffect(() => {
        filteredOpportunities.filter(opp => opp.prediction.probability >= 90).forEach(opp => {
            const key = `${opp.asset.symbol}-${opp.prediction.timestamp}`;
            if (!alertShown.has(key)) {
                console.log(`🚨 ${opp.asset.name} - ${opp.prediction.signal} ${opp.prediction.probability}%`);
                setAlertShown(prev => new Set(prev).add(key));
            }
        });
    }, [filteredOpportunities]);

    // Componente de Card reutilizável
    const OpportunityCard = ({ opp, priority }: { opp: OpportunityItem; priority: 'high' | 'medium' }) => (
        <button
            onClick={() => onSelectAsset(opp.asset)}
            className={`flex flex-col w-[100px] p-2 rounded-lg border transition-all relative ${opp.prediction.signal === 'BUY'
                ? priority === 'high'
                    ? 'bg-green-500/10 border-green-500/50 hover:border-green-500 animate-pulse'
                    : 'bg-green-500/5 border-green-600 hover:border-green-500'
                : priority === 'high'
                    ? 'bg-red-500/10 border-red-500/50 hover:border-red-500 animate-pulse'
                    : 'bg-red-500/5 border-red-600 hover:border-red-500'
                }`}
        >
            {/* Tag OTC */}
            {opp.asset.category === 'OTC' && (
                <span className="absolute top-0.5 right-0.5 bg-purple-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                    OTC
                </span>
            )}

            <div className="flex justify-between items-center w-full mb-1">
                <span className="text-xs font-bold text-slate-300 truncate pr-1">{opp.asset.name}</span>
                {opp.prediction.signal === 'BUY' ? (
                    <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : (
                    <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
                )}
            </div>
            <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-slate-500">{opp.prediction.signal}</span>
                <span className={`text-base font-black ${priority === 'high' ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                    {opp.prediction.probability}%
                </span>
            </div>
        </button>
    );

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <h2 className="text-sm font-medium text-slate-400">Oportunidades</h2>
                    <span className="bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Scanner 🤖
                    </span>
                    {filteredOpportunities.length > 0 && (
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {filteredOpportunities.length}
                        </span>
                    )}
                </div>
                <div className="text-xs text-slate-500">
                    <Clock className="w-3 h-3 inline" /> {lastScanTime > 0 ? formatTime(lastScanTime) : '--:--'}
                </div>
            </div>

            {isScanning && (
                <div className="mb-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-cyan-400">Escaneando...</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-800/50 p-2 rounded text-center">
                    <div className="text-xl font-bold text-green-400">{totalHigh}</div>
                    <div className="text-xs text-slate-500">≥90%</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded text-center">
                    <div className="text-xl font-bold text-yellow-400">{totalMed}</div>
                    <div className="text-xs text-slate-500">80-89%</div>
                </div>
            </div>

            {/* Cards organizados por categoria */}
            <div className="flex-1 overflow-y-auto space-y-3">

                {/* CRYPTO */}
                {cryptoOpps.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-cyan-400 uppercase">💎 Crypto</span>
                            <span className="text-[10px] text-slate-500">({cryptoOpps.length})</span>
                        </div>

                        {/* Crypto - Alta Prioridade */}
                        {cryptoHigh.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-orange-500 uppercase px-2 block">⚡ Alta</span>
                                <div className="flex flex-wrap gap-2">
                                    {cryptoHigh.map((opp, idx) => (
                                        <OpportunityCard key={`ch-${idx}`} opp={opp} priority="high" />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Crypto - Média Prioridade */}
                        {cryptoMed.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-yellow-500 uppercase px-2 block">⚠ Média</span>
                                <div className="flex flex-wrap gap-2">
                                    {cryptoMed.map((opp, idx) => (
                                        <OpportunityCard key={`cm-${idx}`} opp={opp} priority="medium" />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* FOREX / OTC */}
                {forexOtcOpps.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-green-400 uppercase">💱 Forex / OTC</span>
                            <span className="text-[10px] text-slate-500">({forexOtcOpps.length})</span>
                        </div>

                        {/* Forex - Alta Prioridade */}
                        {forexHigh.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-orange-500 uppercase px-2 block">⚡ Alta</span>
                                <div className="flex flex-wrap gap-2">
                                    {forexHigh.map((opp, idx) => (
                                        <OpportunityCard key={`fh-${idx}`} opp={opp} priority="high" />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Forex - Média Prioridade */}
                        {forexMed.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-yellow-500 uppercase px-2 block">⚠ Média</span>
                                <div className="flex flex-wrap gap-2">
                                    {forexMed.map((opp, idx) => (
                                        <OpportunityCard key={`fm-${idx}`} opp={opp} priority="medium" />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* OUTROS (Stocks, Commodities) */}
                {othersOpps.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-purple-400 uppercase">📊 Outros</span>
                            <span className="text-[10px] text-slate-500">({othersOpps.length})</span>
                        </div>

                        {othersHigh.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-orange-500 uppercase px-2 block">⚡ Alta</span>
                                <div className="flex flex-wrap gap-2">
                                    {othersHigh.map((opp, idx) => (
                                        <OpportunityCard key={`oh-${idx}`} opp={opp} priority="high" />
                                    ))}
                                </div>
                            </>
                        )}

                        {othersMed.length > 0 && (
                            <>
                                <span className="text-[10px] font-bold text-yellow-500 uppercase px-2 block">⚠ Média</span>
                                <div className="flex flex-wrap gap-2">
                                    {othersMed.map((opp, idx) => (
                                        <OpportunityCard key={`om-${idx}`} opp={opp} priority="medium" />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Vazio */}
                {filteredOpportunities.length === 0 && !isScanning && (
                    <div className="text-center py-8">
                        <p className="text-sm text-slate-500">Nenhuma oportunidade ≥80%</p>
                        <p className="text-xs text-slate-600 mt-1">Aguarde...</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-500 text-center">
                    Scanner atualiza a cada 60 segundos
                </p>
            </div>
        </div>
    );
};
