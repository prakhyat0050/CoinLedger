import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Fuel, TrendingDown } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatTokenAmount } from '@/utils/format';
import { getBlockscoutTxUrl, shortenAddress } from '@/services/blockscout';
import { ExternalLink } from 'lucide-react';

export function GasTab() {
  const { t, lang } = useI18n();
  const { analysisResult, chainId } = useApp();
  const [view, setView] = useState<'day' | 'month'>('month');
  if (!analysisResult) return null;

  const { gasAnalytics, summary } = analysisResult;
  const chartData = view === 'day' ? gasAnalytics.gasByDay : gasAnalytics.gasByMonth;

  const totalUsd = gasAnalytics.totalGasSpentUsd || 0;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-warning" />
            </div>
            <p className="text-xs text-slate-500">{t('gas.totalSpent')}</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalUsd > 0 ? formatCurrency(totalUsd, lang) : t('common.unavailable')}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {formatTokenAmount(gasAnalytics.totalGasSpentNative, 6)} {summary.nativeSymbol}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-accent-400" />
            </div>
            <p className="text-xs text-slate-500">{t('gas.avgPerTx')}</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatTokenAmount(gasAnalytics.averageGasPerTx, 6)} {summary.nativeSymbol}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-negative/10 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-negative" />
            </div>
            <p className="text-xs text-slate-500">{t('gas.highestTx')}</p>
          </div>
          {gasAnalytics.highestGasTx ? (
            <div>
              <p className="text-2xl font-bold text-white">
                {gasAnalytics.highestGasTx.gasCostInUsd !== null
                  ? formatCurrency(gasAnalytics.highestGasTx.gasCostInUsd, lang)
                  : t('common.unavailable')}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {shortenAddress(gasAnalytics.highestGasTx.hash, 10, 6)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-slate-500">{t('common.unavailable')}</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">{t('gas.overTime')}</h3>
          <div className="flex gap-1 bg-surface-800 rounded-lg p-1">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'day' ? 'bg-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('gas.byDay')}
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'month' ? 'bg-accent-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('gas.byMonth')}
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">{t('gas.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
              <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} tickFormatter={(v: number) => formatCurrency(v, lang, { compact: true, showSymbol: false })} />
              <RechartsTooltip
                contentStyle={{ background: '#0f1629', border: '1px solid #233056', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => [formatCurrency(v, lang), t('gas.totalSpent')]}
              />
              <Bar dataKey="gasUsd" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Highest gas tx link */}
      {gasAnalytics.highestGasTx && (
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <a
            href={getBlockscoutTxUrl(chainId, gasAnalytics.highestGasTx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors"
          >
            <span>{t('gas.highestTx')}: {shortenAddress(gasAnalytics.highestGasTx.hash, 12, 8)}</span>
            <ExternalLink className="w-4 h-4 text-accent-400" />
          </a>
        </div>
      )}
    </div>
  );
}
