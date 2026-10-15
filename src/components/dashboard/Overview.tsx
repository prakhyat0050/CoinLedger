import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Fuel, Wallet, ArrowDownRight, ArrowUpRight, PieChart as PieIcon } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatTokenAmount } from '@/utils/format';
import { shortenAddress } from '@/services/blockscout';
import { getChain } from '@/services/chains';
import { computeFlowData, computeFlowStats, computeCategoryBreakdowns } from '@/services/analytics';
import { Tooltip } from '@/components/ui/Tooltip';
import type { WalletSummary } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  income: '#22c55e',
  payment: '#ef4444',
  swap: '#3b82f6',
  transfer: '#8b5cf6',
  nft: '#ec4899',
  contract: '#f59e0b',
  gas: '#64748b',
  unknown: '#475569',
};

export function KpiCards({ summary }: { summary: WalletSummary }) {
  const { t, lang } = useI18n();

  const kpis = [
    {
      label: t('dashboard.totalReceived'),
      value: formatCurrency(summary.totalReceivedUsd, lang),
      icon: TrendingUp,
      color: 'text-positive',
      bg: 'bg-positive/10',
      tooltipKey: 'dashboard.totalReceivedTooltip',
    },
    {
      label: t('dashboard.totalSent'),
      value: formatCurrency(summary.totalSentUsd, lang),
      icon: TrendingDown,
      color: 'text-negative',
      bg: 'bg-negative/10',
      tooltipKey: 'dashboard.totalSentTooltip',
    },
    {
      label: t('dashboard.gasFees'),
      value: formatCurrency(summary.totalGasUsd, lang),
      icon: Fuel,
      color: 'text-warning',
      bg: 'bg-warning/10',
      tooltipKey: 'dashboard.gasFeesTooltip',
    },
    {
      label: t('dashboard.netFlow'),
      value: `${summary.netFlowUsd >= 0 ? '+' : ''}${formatCurrency(summary.netFlowUsd, lang)}`,
      icon: summary.netFlowUsd >= 0 ? ArrowDownRight : ArrowUpRight,
      color: summary.netFlowUsd >= 0 ? 'text-positive' : 'text-negative',
      bg: summary.netFlowUsd >= 0 ? 'bg-positive/10' : 'bg-negative/10',
      tooltipKey: 'dashboard.netFlowTooltip',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpis.map((kpi, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 md:p-5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <Tooltip translationKey={kpi.tooltipKey} />
          </div>
          <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
          <p className={`text-xl md:text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PnLCard({ summary }: { summary: WalletSummary }) {
  const { t, lang } = useI18n();
  const pnl = summary.estimatedPnlUsd;
  const isPositive = pnl !== null && pnl >= 0;

  return (
    <div className="glass-card rounded-2xl p-5 mt-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isPositive ? 'bg-positive/10' : 'bg-negative/10'}`}>
            <Wallet className={`w-4 h-4 ${isPositive ? 'text-positive' : 'text-negative'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-white">{t('dashboard.estimatedPnL')}</h3>
              <Tooltip translationKey="dashboard.pnLTooltip" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-4">
        <p className={`text-2xl md:text-3xl font-bold ${pnl === null ? 'text-slate-500' : isPositive ? 'text-positive' : 'text-negative'}`}>
          {pnl === null ? t('common.unavailable') : `${isPositive ? '+' : ''}${formatCurrency(pnl, lang)}`}
        </p>
        {pnl !== null && (
          <span className={`text-sm font-medium ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-2">{t('dashboard.estimatedPnLNote')}</p>
    </div>
  );
}

export function WalletHeader() {
  const { t } = useI18n();
  const { chainId, walletAddress, isDemo, resetToLanding } = useApp();
  const chain = getChain(chainId);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-500">{t('dashboard.wallet')}</p>
            {isDemo && (
              <span className="px-2 py-0.5 rounded text-xs bg-warning/10 text-warning font-medium">
                {t('wallet.demoMode')}
              </span>
            )}
          </div>
          <p className="text-lg font-mono font-semibold text-white">{shortenAddress(walletAddress, 8, 6)}</p>
          <p className="text-xs text-slate-500">{t('dashboard.network')}: {chain.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={resetToLanding}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-800 border border-surface-600 text-slate-300 hover:bg-surface-700 transition-colors"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}

type RangeKey = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export function FlowChart() {
  const { t, lang } = useI18n();
  const { transactions } = useApp();
  const [range, setRange] = useState<RangeKey>('30D');

  const flowData = useMemo(() => computeFlowData(transactions, range), [transactions, range]);
  const flowStats = useMemo(() => computeFlowStats(transactions, range), [transactions, range]);

  const ranges: Array<{ key: RangeKey; label: string }> = [
    { key: '7D', label: t('flow.range7d') },
    { key: '30D', label: t('flow.range30d') },
    { key: '90D', label: t('flow.range90d') },
    { key: '1Y', label: t('flow.range1y') },
    { key: 'ALL', label: t('flow.rangeAll') },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-base font-semibold text-white">{t('flow.title')}</h3>
        <div className="flex gap-1 bg-surface-800 rounded-lg p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                range === r.key ? 'bg-accent-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {flowData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          {t('flow.noData')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={flowData}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
            <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} tickFormatter={(v: number) => formatCurrency(v, lang, { compact: true, showSymbol: false })} />
            <RechartsTooltip
              contentStyle={{ background: '#0f1629', border: '1px solid #233056', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v: number) => [formatCurrency(v, lang), '']}
            />
            <Area type="monotone" dataKey="inflow" name={t('flow.incoming')} stroke="#22c55e" strokeWidth={2} fill="url(#inflowGrad)" />
            <Area type="monotone" dataKey="outflow" name={t('flow.outgoing')} stroke="#ef4444" strokeWidth={2} fill="url(#outflowGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-surface-700">
        <StatItem label={t('flow.incomingTxCount')} value={String(flowStats.incomingCount)} />
        <StatItem label={t('flow.outgoingTxCount')} value={String(flowStats.outgoingCount)} />
        <StatItem label={t('flow.avgTxSize')} value={formatCurrency(flowStats.averageTxSize, lang, { compact: true })} />
        <StatItem
          label={t('flow.largestIncoming')}
          value={flowStats.largestIncoming ? `${formatTokenAmount(flowStats.largestIncoming.humanAmount)} ${flowStats.largestIncoming.assetSymbol}` : '\u2014'}
        />
        <StatItem
          label={t('flow.largestOutgoing')}
          value={flowStats.largestOutgoing ? `${formatTokenAmount(flowStats.largestOutgoing.humanAmount)} ${flowStats.largestOutgoing.assetSymbol}` : '\u2014'}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}

export function CategoryDonut() {
  const { t } = useI18n();
  const { transactions } = useApp();
  const breakdowns = useMemo(() => computeCategoryBreakdowns(transactions), [transactions]);

  if (breakdowns.length === 0) return null;

  const data = breakdowns.map((b) => ({
    name: t(`category.${b.category}`),
    value: b.count,
    color: CATEGORY_COLORS[b.category] || '#475569',
  }));

  const totalCount = breakdowns.reduce((s, b) => s + b.count, 0);

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <PieIcon className="w-4 h-4 text-accent-400" />
        <h3 className="text-base font-semibold text-white">{t('category.title')}</h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <ResponsiveContainer width={220} height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ background: '#0f1629', border: '1px solid #233056', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v: number, _name: string, props: { payload?: { name?: string } }) => [`${v} txs`, props?.payload?.name || '']}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2 w-full">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300">{d.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-xs">{d.value}</span>
                <span className="text-white font-medium text-xs w-16 text-right">
                  {((d.value / totalCount) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewTab() {
  const { analysisResult } = useApp();
  if (!analysisResult) return null;

  return (
    <div className="space-y-4">
      <KpiCards summary={analysisResult.summary} />
      <PnLCard summary={analysisResult.summary} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FlowChart />
        </div>
        <div>
          <CategoryDonut />
        </div>
      </div>
    </div>
  );
}
