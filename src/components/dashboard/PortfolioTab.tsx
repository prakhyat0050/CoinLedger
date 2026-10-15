import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatTokenAmount } from '@/utils/format';
import { getBlockscoutAddressUrl, getBlockscoutTokenUrl } from '@/services/blockscout';

export function PortfolioTab() {
  const { t, lang } = useI18n();
  const { analysisResult, chainId } = useApp();
  if (!analysisResult) return null;

  const { tokenHoldings, summary } = analysisResult;

  const holdingsWithUsd = tokenHoldings.filter((h) => h.usdValue !== null);
  const totalUsd = holdingsWithUsd.reduce((sum, h) => sum + (h.usdValue || 0), 0);
  const nativeUsd = summary.nativeUsdValue || 0;
  const grandTotal = totalUsd + nativeUsd;

  if (tokenHoldings.length === 0 && summary.nativeBalance === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-slate-400">{t('portfolio.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total portfolio value */}
      <div className="glass-card rounded-2xl p-5 md:p-6 animate-fade-in">
        <p className="text-sm text-slate-500 mb-2">{t('portfolio.totalValue')}</p>
        <p className="text-3xl md:text-4xl font-bold text-white">{formatCurrency(grandTotal, lang)}</p>
        <p className="text-xs text-slate-500 mt-3">{t('portfolio.valuationNote')}</p>
      </div>

      {/* Native balance */}
      {summary.nativeBalance > 0 && (
        <div className="glass-card rounded-2xl p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">{summary.nativeSymbol} ({t('portfolio.colToken')})</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-400/20 to-accent-600/20 border border-accent-500/20 flex items-center justify-center">
                <span className="text-sm font-bold text-accent-400">{summary.nativeSymbol.slice(0, 2)}</span>
              </div>
              <div>
                <p className="text-white font-medium">{summary.nativeSymbol}</p>
                <a
                  href={getBlockscoutAddressUrl(chainId, summary.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-accent-400 flex items-center gap-1"
                >
                  Blockscout <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">{formatTokenAmount(summary.nativeBalance)} {summary.nativeSymbol}</p>
              {summary.nativeUsdValue !== null && (
                <p className="text-sm text-slate-400">{formatCurrency(nativeUsd, lang)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token holdings table */}
      {tokenHoldings.length > 0 && (
        <div className="glass-card rounded-2xl p-4 md:p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">{t('portfolio.title')}</h3>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-surface-700">
                  <th className="text-left font-medium py-3 px-2">{t('portfolio.colToken')}</th>
                  <th className="text-right font-medium py-3 px-2">{t('portfolio.colBalance')}</th>
                  <th className="text-right font-medium py-3 px-2">{t('portfolio.colUsdValue')}</th>
                  <th className="text-left font-medium py-3 px-2">{t('portfolio.colContract')}</th>
                  <th className="text-center font-medium py-3 px-2">{t('txTable.colView')}</th>
                </tr>
              </thead>
              <tbody>
                {tokenHoldings.map((holding) => (
                  <tr key={holding.contractAddress} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {holding.type === 'erc721' || holding.type === 'erc1155' ? (
                          <ImageIcon className="w-4 h-4 text-accent-400" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-slate-400">
                            {holding.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{holding.symbol}</p>
                          <p className="text-xs text-slate-500">{holding.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {formatTokenAmount(holding.humanBalance)}
                      {(holding.type === 'erc721' || holding.type === 'erc1155') && (
                        <span className="text-xs text-slate-500 ml-1">{t('portfolio.nft')}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {holding.usdValue !== null ? formatCurrency(holding.usdValue, lang) : t('common.unavailable')}
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-slate-500">
                      {holding.contractAddress.slice(0, 8)}...{holding.contractAddress.slice(-6)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <a
                        href={getBlockscoutTokenUrl(chainId, holding.contractAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tokenHoldings.map((holding) => (
              <div key={holding.contractAddress} className="p-4 rounded-xl bg-surface-800 border border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-slate-400">
                      {holding.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{holding.symbol}</p>
                      <p className="text-xs text-slate-500">{holding.name}</p>
                    </div>
                  </div>
                  <a
                    href={getBlockscoutTokenUrl(chainId, holding.contractAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{formatTokenAmount(holding.humanBalance)}</span>
                  <span className="text-slate-300">
                    {holding.usdValue !== null ? formatCurrency(holding.usdValue, lang) : t('common.unavailable')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
