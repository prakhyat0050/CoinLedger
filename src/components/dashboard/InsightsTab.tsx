import { Sparkles, TrendingUp, TrendingDown, Fuel, Activity, Info, Lightbulb } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import type { FinancialInsight } from '@/types';

const ICON_MAP: Record<string, typeof Info> = {
  positive: TrendingUp,
  negative: TrendingDown,
  warning: Fuel,
  info: Info,
  neutral: Activity,
};

const COLOR_MAP: Record<string, string> = {
  positive: 'border-positive/30 bg-positive/5',
  negative: 'border-negative/30 bg-negative/5',
  warning: 'border-warning/30 bg-warning/5',
  info: 'border-accent-500/30 bg-accent-500/5',
  neutral: 'border-surface-600 bg-surface-800/50',
};

const ICON_COLOR_MAP: Record<string, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
  info: 'text-accent-400',
  neutral: 'text-slate-400',
};

export function InsightsTab() {
  const { t } = useI18n();
  const { analysisResult } = useApp();
  if (!analysisResult) return null;

  const { insights, walletHealth, summary } = analysisResult;

  return (
    <div className="space-y-4">
      {/* Insights */}
      <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent-400" />
          <h3 className="text-base font-semibold text-white">{t('insights.title')}</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5">{t('insights.subtitle')}</p>

        {insights.length === 0 ? (
          <div className="py-8 text-center">
            <Lightbulb className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{t('insights.noInsights')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>

      {/* Wallet Health */}
      <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-accent-400" />
          <h3 className="text-base font-semibold text-white">{t('health.title')}</h3>
        </div>

        {/* Score gauge */}
        <div className="flex flex-col md:flex-row items-center gap-6 mt-5">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1a2540" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={walletHealth.activityScore >= 75 ? '#22c55e' : walletHealth.activityScore >= 50 ? '#3b82f6' : walletHealth.activityScore >= 25 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(walletHealth.activityScore / 100) * 327} 327`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{walletHealth.activityScore}</span>
              <span className="text-xs text-slate-500">{t('health.activityScore')}</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{t('health.activityLevel')}</span>
              <span className={`text-sm font-semibold ${
                walletHealth.activityLevel === 'very-high' ? 'text-positive' :
                walletHealth.activityLevel === 'high' ? 'text-accent-400' :
                walletHealth.activityLevel === 'medium' ? 'text-warning' : 'text-slate-500'
              }`}>
                {t(`health.level${walletHealth.activityLevel.charAt(0).toUpperCase() + walletHealth.activityLevel.slice(1).replace('-', '')}`)}
              </span>
            </div>

            <HealthMetric label={t('health.txFrequency')} value={t('health.txFrequencyDesc', { count: walletHealth.txFrequency })} />
            <HealthMetric label={t('health.activeDays')} value={`${walletHealth.activeDays} / ${walletHealth.totalDays}`} />
            <HealthMetric label={t('health.uniqueContracts')} value={String(walletHealth.uniqueContracts)} />
            <HealthMetric label={t('health.tokenActivity')} value={String(walletHealth.tokenActivity)} />
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-5 pt-5 border-t border-surface-700">{t('health.explanation')}</p>
      </div>

      {/* Wallet summary quick facts */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.wallet')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickFact label={t('common.transactions')} value={String(summary.transactionCount)} />
          <QuickFact label={t('dashboard.gasFees')} value={String(summary.gasUsageCount)} />
          <QuickFact label={t('portfolio.title')} value={String(summary.tokenTransfersCount)} />
          <QuickFact
            label={t('txDrawer.timestamp')}
            value={summary.firstTransactionDate ? new Date(summary.firstTransactionDate).toLocaleDateString() : '\u2014'}
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: FinancialInsight }) {
  const { t } = useI18n();
  const Icon = ICON_MAP[insight.type] || Info;
  const body = t(insight.bodyKey, insight.bodyParams);

  return (
    <div className={`rounded-xl p-4 border ${COLOR_MAP[insight.type] || COLOR_MAP.neutral}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLOR_MAP[insight.type] || 'text-slate-400'}`} />
        <div>
          <p className="text-sm font-semibold text-white mb-1">{t(insight.titleKey)}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
