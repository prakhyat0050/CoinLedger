import { X, ExternalLink, ArrowRight, ArrowLeft, CheckCircle, XCircle, Fuel } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatTokenAmount } from '@/utils/format';
import { getBlockscoutTxUrl, shortenAddress } from '@/services/blockscout';
import { generateHumanReadableExplanation } from '@/services/analytics';
import type { TransactionCategory } from '@/types';

const ALL_CATEGORIES: TransactionCategory[] = ['income', 'payment', 'swap', 'transfer', 'nft', 'contract', 'gas', 'unknown'];

export function TransactionDrawer() {
  const { t, lang } = useI18n();
  const { selectedTx, drawerOpen, setDrawerOpen, chainId } = useApp();

  if (!drawerOpen || !selectedTx) return null;

  const tx = selectedTx;
  const explanation = generateHumanReadableExplanation(tx, tx.fromAddress, t);
  const isReceived = tx.direction === 'in';
  const isSuccess = tx.status === 'ok';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-surface-900 border-l border-surface-700 z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface-900/95 backdrop-blur-sm border-b border-surface-700 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-semibold text-white">{t('txDrawer.title')}</h3>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Direction badge */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isReceived ? 'bg-positive/10' : tx.direction === 'out' ? 'bg-negative/10' : 'bg-surface-700'}`}>
              {isReceived ? <ArrowLeft className="w-5 h-5 text-positive" /> : tx.direction === 'out' ? <ArrowRight className="w-5 h-5 text-negative" /> : <ArrowRight className="w-5 h-5 text-slate-400" />}
            </div>
            <div>
              <p className={`text-lg font-bold ${isReceived ? 'text-positive' : tx.direction === 'out' ? 'text-negative' : 'text-slate-400'}`}>
                {t(`txTable.direction.${tx.direction}`)}
              </p>
              <p className="text-sm text-slate-500">{tx.assetSymbol}</p>
            </div>
          </div>

          {/* What happened */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2 font-medium">{t('txDrawer.whatHappened')}</p>
            <p className="text-sm text-slate-200 leading-relaxed">{explanation}</p>
          </div>

          {/* Amount */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{t('txDrawer.amount')}</p>
            <p className="text-2xl font-bold text-white">{formatTokenAmount(tx.humanAmount)} {tx.assetSymbol}</p>
            {tx.usdValue !== null && (
              <p className="text-sm text-slate-400 mt-1">{formatCurrency(tx.usdValue, lang)}</p>
            )}
          </div>

          {/* Details grid */}
          <div className="space-y-3">
            <DetailRow label={t('txDrawer.status')}>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${isSuccess ? 'text-positive' : 'text-negative'}`}>
                {isSuccess ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {isSuccess ? t('txTable.statusOk') : t('txTable.statusError')}
              </span>
            </DetailRow>

            <DetailRow label={t('txDrawer.timestamp')}>
              <span className="text-sm text-slate-300">{formatDate(tx.timestamp, lang, { withTime: true })}</span>
            </DetailRow>

            <DetailRow label={t('txDrawer.from')}>
              <span className="text-sm font-mono text-slate-300">{shortenAddress(tx.fromAddress, 10, 8)}</span>
            </DetailRow>

            {tx.toAddress && (
              <DetailRow label={t('txDrawer.to')}>
                <span className="text-sm font-mono text-slate-300">{shortenAddress(tx.toAddress, 10, 8)}</span>
              </DetailRow>
            )}

            <DetailRow label={t('txDrawer.gasUsed')}>
              <span className="text-sm text-slate-300">{tx.gasUsed}</span>
            </DetailRow>

            <DetailRow label={t('txDrawer.gasPrice')}>
              <span className="text-sm text-slate-300">{tx.gasPrice}</span>
            </DetailRow>

            <DetailRow label={t('txDrawer.estGasCost')}>
              <span className="text-sm text-slate-300 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-warning" />
                {tx.gasCostInNative.toFixed(6)} {tx.nativeSymbol}
                {tx.gasCostInUsd !== null && <span className="text-slate-500">({formatCurrency(tx.gasCostInUsd, lang)})</span>}
              </span>
            </DetailRow>

            {tx.blockNumber !== null && (
              <DetailRow label={t('txDrawer.blockNumber')}>
                <span className="text-sm text-slate-300">{tx.blockNumber.toLocaleString()}</span>
              </DetailRow>
            )}

            {tx.method && (
              <DetailRow label={t('txDrawer.method')}>
                <span className="text-sm text-slate-300 font-mono">{tx.method}</span>
              </DetailRow>
            )}

            <DetailRow label={t('txDrawer.txHash')}>
              <span className="text-sm font-mono text-slate-300 break-all">{tx.hash}</span>
            </DetailRow>

            {tx.createdContract && (
              <DetailRow label={t('txDrawer.contract')}>
                <span className="text-sm font-mono text-slate-300">{shortenAddress(tx.createdContract, 10, 8)}</span>
              </DetailRow>
            )}
          </div>

          {/* Category */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2 font-medium">{t('category.title')}</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                    tx.category === cat
                      ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                      : 'bg-surface-800 text-slate-500 border border-surface-600'
                  }`}
                >
                  {t(`category.${cat}`)}
                </span>
              ))}
            </div>
            {tx.categoryConfidence === 'low' && (
              <p className="text-xs text-warning mt-2">{t('category.needsReview')}</p>
            )}
          </div>

          {/* Blockscout link */}
          <a
            href={getBlockscoutTxUrl(chainId, tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-slate-300 hover:bg-surface-700 hover:text-white transition-all text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            {t('txDrawer.viewOriginal')}
          </a>

          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t('txDrawer.close')}
          </button>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-xs text-slate-500 whitespace-nowrap pt-0.5">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
