import { useState, useMemo } from 'react';
import { Download, Printer, AlertTriangle, FileText } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatTokenAmount } from '@/utils/format';
import { generateTaxRows, exportToCsv, downloadCsv } from '@/services/analytics';
import { getChain } from '@/services/chains';
import type { TransactionCategory } from '@/types';

const ALL_CATEGORIES: TransactionCategory[] = ['income', 'payment', 'swap', 'transfer', 'nft', 'contract', 'gas', 'unknown'];

export function TaxTab() {
  const { t, lang } = useI18n();
  const { analysisResult, chainId, walletAddress } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excludedCategories, setExcludedCategories] = useState<Set<TransactionCategory>>(new Set());
  if (!analysisResult) return null;

  const chain = getChain(chainId);

  const taxRows = useMemo(() => {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate + 'T23:59:59') : undefined;
    const exclude = Array.from(excludedCategories);
    return generateTaxRows(analysisResult.transactions, start, end, exclude.length > 0 ? exclude : undefined);
  }, [analysisResult.transactions, startDate, endDate, excludedCategories]);

  const totalUsd = taxRows.reduce((sum, r) => sum + (r.usdValue || 0), 0);
  const totalGasUsd = taxRows.reduce((sum, r) => sum + (r.gasFeeUsd || 0), 0);

  const toggleCategory = (cat: TransactionCategory) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAll = () => setExcludedCategories(new Set());
  const deselectAll = () => setExcludedCategories(new Set(ALL_CATEGORIES));

  const handleExport = () => {
    const csv = exportToCsv(taxRows);
    const filename = `coinledger_${chain.shortName}_${walletAddress.slice(0, 8)}_${Date.now()}.csv`;
    downloadCsv(csv, filename);
  };

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="glass-card rounded-2xl p-4 border-l-4 border-warning animate-fade-in">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">{t('taxReport.disclaimer')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('taxReport.disclaimerFull')}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-white mb-4">{t('taxReport.dateRange')}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">{t('taxReport.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-sm text-white focus:outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">{t('taxReport.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-sm text-white focus:outline-none focus:border-accent-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-500">{t('taxReport.includeCategories')}</label>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-accent-400 hover:text-accent-300">{t('taxReport.selectAll')}</button>
            <span className="text-slate-600">|</span>
            <button onClick={deselectAll} className="text-xs text-accent-400 hover:text-accent-300">{t('taxReport.deselectAll')}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                !excludedCategories.has(cat)
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                  : 'bg-surface-800 text-slate-500 border border-surface-600'
              }`}
            >
              {t(`category.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 animate-fade-in">
          <p className="text-xs text-slate-500 mb-1">{t('common.transactions')}</p>
          <p className="text-xl font-bold text-white">{taxRows.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <p className="text-xs text-slate-500 mb-1">{t('taxReport.colUsdValue')}</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalUsd, lang)}</p>
        </div>
        <div className="glass-card rounded-xl p-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs text-slate-500 mb-1">{t('taxReport.colGasFee')}</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalGasUsd, lang)}</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={taxRows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold hover:from-accent-400 hover:to-accent-500 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {t('taxReport.exportCsv')}
        </button>
        <button
          onClick={() => window.print()}
          disabled={taxRows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-600 bg-surface-800 text-slate-300 text-sm font-medium hover:bg-surface-700 transition-all disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          {t('taxReport.printReport')}
        </button>
      </div>

      {/* Report table */}
      {taxRows.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">{t('taxReport.noData')}</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 md:p-6 animate-fade-in overflow-x-auto print-container">
          {/* Print header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold">CoinLedger Tax Report</h1>
            <p>Wallet: {walletAddress}</p>
            <p>Network: {chain.name}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-surface-700">
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colDate')}</th>
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colHash')}</th>
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colType')}</th>
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colAsset')}</th>
                <th className="text-right font-medium py-3 px-2">{t('taxReport.colAmount')}</th>
                <th className="text-right font-medium py-3 px-2">{t('taxReport.colUsdValue')}</th>
                <th className="text-right font-medium py-3 px-2">{t('taxReport.colGasFee')}</th>
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colCategory')}</th>
                <th className="text-left font-medium py-3 px-2">{t('taxReport.colNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {taxRows.map((row) => (
                <tr key={row.txHash + row.date} className="border-b border-surface-800">
                  <td className="py-2 px-2 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.date, lang, { short: true })}</td>
                  <td className="py-2 px-2 text-xs font-mono text-slate-500">{row.txHash.slice(0, 10)}...{row.txHash.slice(-6)}</td>
                  <td className="py-2 px-2 text-xs">{t(`txTable.direction.${row.type}`)}</td>
                  <td className="py-2 px-2 text-white text-xs font-medium">{row.assetSymbol}</td>
                  <td className="py-2 px-2 text-right text-xs text-slate-300">{formatTokenAmount(row.amount)}</td>
                  <td className="py-2 px-2 text-right text-xs text-slate-300">{row.usdValue !== null ? formatCurrency(row.usdValue, lang) : t('common.unavailable')}</td>
                  <td className="py-2 px-2 text-right text-xs text-slate-400">{row.gasFeeUsd !== null ? formatCurrency(row.gasFeeUsd, lang) : '\u2014'}</td>
                  <td className="py-2 px-2 text-xs text-slate-400">{t(`category.${row.category}`)}</td>
                  <td className="py-2 px-2 text-xs text-warning">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
