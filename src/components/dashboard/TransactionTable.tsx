import { useState, useMemo, useEffect } from 'react';
import { Search, ExternalLink, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatTokenAmount } from '@/utils/format';
import { getBlockscoutTxUrl, shortenAddress } from '@/services/blockscout';
import type { Transaction, TransactionCategory, TransactionDirection } from '@/types';

const CATEGORIES: TransactionCategory[] = ['income', 'payment', 'swap', 'transfer', 'nft', 'contract', 'gas', 'unknown'];
const PAGE_SIZE = 15;

export function TransactionTable() {
  const { t, lang } = useI18n();
  const { transactions, chainId, setSelectedTx, setDrawerOpen } = useApp();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>('all');
  const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const tokens = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => set.add(tx.assetSymbol));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((tx) =>
        tx.hash.toLowerCase().includes(q) ||
        tx.fromAddress.toLowerCase().includes(q) ||
        (tx.toAddress?.toLowerCase().includes(q)) ||
        tx.assetSymbol.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((tx) => tx.category === categoryFilter);
    }

    if (directionFilter !== 'all') {
      result = result.filter((tx) => tx.direction === directionFilter);
    }

    if (tokenFilter !== 'all') {
      result = result.filter((tx) => tx.assetSymbol === tokenFilter);
    }

    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'date') {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
      } else {
        const aVal = a.usdValue || 0;
        const bVal = b.usdValue || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return sorted;
  }, [transactions, debouncedSearch, categoryFilter, directionFilter, tokenFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, categoryFilter, directionFilter, tokenFilter, sortBy, sortDir]);

  const openTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setDrawerOpen(true);
  };

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-slate-400">{t('txTable.noTransactions')}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 md:p-6 animate-fade-in">
      {/* Header + search */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{t('txTable.title')}</h3>
          <span className="text-xs text-slate-500">{filtered.length} {t('common.transactions')}</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('txTable.search')}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-surface-600 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
          >
            <option value="all">{t('txTable.filterCategory')}: {t('common.all')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
          >
            <option value="all">{t('txTable.filterDirection')}: {t('common.all')}</option>
            <option value="in">{t('txTable.filterIncoming')}</option>
            <option value="out">{t('txTable.filterOutgoing')}</option>
          </select>

          <select
            value={tokenFilter}
            onChange={(e) => setTokenFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
          >
            <option value="all">{t('txTable.filterToken')}: {t('common.all')}</option>
            {tokens.map((tok) => (
              <option key={tok} value={tok}>{tok}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
          >
            <option value="date">{t('txTable.sortDate')}</option>
            <option value="amount">{t('txTable.sortAmount')}</option>
          </select>

          <button
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-600 text-xs text-slate-300 hover:bg-surface-700"
          >
            {sortDir === 'asc' ? '↑' : '↓'} {t(`txTable.${sortDir}`)}
          </button>
        </div>
      </div>

      {/* Table - desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-surface-700">
              <th className="text-left font-medium py-3 px-2">{t('txTable.colDate')}</th>
              <th className="text-left font-medium py-3 px-2">{t('txTable.colType')}</th>
              <th className="text-left font-medium py-3 px-2">{t('txTable.colAsset')}</th>
              <th className="text-right font-medium py-3 px-2">{t('txTable.colAmount')}</th>
              <th className="text-right font-medium py-3 px-2">{t('txTable.colUsdValue')}</th>
              <th className="text-left font-medium py-3 px-2">{t('txTable.colFrom')}</th>
              <th className="text-left font-medium py-3 px-2">{t('txTable.colTo')}</th>
              <th className="text-right font-medium py-3 px-2">{t('txTable.colGasFee')}</th>
              <th className="text-left font-medium py-3 px-2">{t('txTable.colCategory')}</th>
              <th className="text-center font-medium py-3 px-2">{t('txTable.colStatus')}</th>
              <th className="text-center font-medium py-3 px-2">{t('txTable.colView')}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((tx) => (
              <tr
                key={tx.hash}
                onClick={() => openTx(tx)}
                className="border-b border-surface-800 hover:bg-surface-800/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-2 text-slate-400 text-xs whitespace-nowrap">{formatDate(tx.timestamp, lang, { short: true })}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs font-semibold ${tx.direction === 'in' ? 'text-positive' : tx.direction === 'out' ? 'text-negative' : 'text-slate-400'}`}>
                    {t(`txTable.direction.${tx.direction}`)}
                  </span>
                </td>
                <td className="py-3 px-2 text-white font-medium">{tx.assetSymbol}</td>
                <td className="py-3 px-2 text-right text-slate-300">{formatTokenAmount(tx.humanAmount)}</td>
                <td className="py-3 px-2 text-right text-slate-300">{tx.usdValue !== null ? formatCurrency(tx.usdValue, lang) : t('txTable.usdUnavailable')}</td>
                <td className="py-3 px-2 text-slate-400 text-xs font-mono">{shortenAddress(tx.fromAddress)}</td>
                <td className="py-3 px-2 text-slate-400 text-xs font-mono">{tx.toAddress ? shortenAddress(tx.toAddress) : '—'}</td>
                <td className="py-3 px-2 text-right text-slate-400 text-xs">{tx.gasCostInUsd !== null ? formatCurrency(tx.gasCostInUsd, lang) : '—'}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs ${tx.categoryConfidence === 'low' ? 'text-warning' : 'text-slate-400'}`}>
                    {t(`category.${tx.category}`)}
                    {tx.categoryConfidence === 'low' && ' *'}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${tx.status === 'ok' ? 'bg-positive' : 'bg-negative'}`} />
                </td>
                <td className="py-3 px-2 text-center">
                  <a
                    href={getBlockscoutTxUrl(chainId, tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex text-accent-400 hover:text-accent-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - mobile */}
      <div className="lg:hidden space-y-3">
        {paginated.map((tx) => (
          <div
            key={tx.hash}
            onClick={() => openTx(tx)}
            className="p-4 rounded-xl bg-surface-800 border border-surface-700 hover:border-surface-600 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${tx.direction === 'in' ? 'text-positive' : tx.direction === 'out' ? 'text-negative' : 'text-slate-400'}`}>
                  {t(`txTable.direction.${tx.direction}`)}
                </span>
                <span className="text-white font-medium">{tx.assetSymbol}</span>
              </div>
              <span className="text-xs text-slate-500">{formatDate(tx.timestamp, lang, { short: true })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{formatTokenAmount(tx.humanAmount)} {tx.assetSymbol}</span>
              <span className="text-slate-300">{tx.usdValue !== null ? formatCurrency(tx.usdValue, lang) : t('txTable.usdUnavailable')}</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500">{t(`category.${tx.category}`)}</span>
              <a
                href={getBlockscoutTxUrl(chainId, tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-accent-400 flex items-center gap-1"
              >
                {t('txTable.viewOnBlockscout')} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-700">
          <span className="text-xs text-slate-500">
            {t('txTable.page')} {page + 1} {t('txTable.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-surface-800 border border-surface-600 text-slate-400 disabled:opacity-30 hover:bg-surface-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-surface-800 border border-surface-600 text-slate-400 disabled:opacity-30 hover:bg-surface-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">{t('txTable.noTransactionsFiltered')}</div>
      )}
    </div>
  );
}
