import { useState } from 'react';
import { Globe, ArrowRight, TrendingUp, FileText, Download, Search, Zap } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { CHAIN_LIST, DEMO_WALLETS } from '@/services/chains';
import { fetchWalletData, isValidAddress } from '@/services/blockscout';
import { computeGasAnalytics, computeInsights, computeWalletHealth } from '@/services/analytics';
import type { ChainId } from '@/types';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function LandingPage() {
  const { t } = useI18n();
  const {
    chainId, setChainId, setWalletAddress, setIsDemo,
    setLoading, setError, setAnalysisResult, setTransactions, setView,
  } = useApp();
  const [addressInput, setAddressInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const analyzeWallet = async (address: string, demo: boolean) => {
    setLocalError(null);
    const cleanAddr = address.trim();

    if (!isValidAddress(cleanAddr)) {
      setLocalError(t('wallet.invalidAddress'));
      return;
    }

    setFetching(true);
    setLoading(true);
    setError(null);
    setWalletAddress(cleanAddr);
    setIsDemo(demo);

    try {
      const result = await fetchWalletData(chainId, cleanAddr, demo);

      if (result.error) {
        setError(result.error, result.errorCode);
        setLocalError(result.error);
        setAnalysisResult(null);
        setTransactions([]);
      } else if (result.transactions.length === 0 && result.tokenHoldings.length === 0) {
        const message = t('wallet.emptyWallet');
        setError(message, 'empty_wallet');
        setLocalError(message);
        setAnalysisResult(null);
        setTransactions([]);
      } else if (!result.summary) {
        const message = t('error.generic');
        setError(message, 'unknown');
        setLocalError(message);
        setAnalysisResult(null);
        setTransactions([]);
      } else {
        const gasAnalytics = computeGasAnalytics(result.transactions, result.summary.exchangeRate);
        const insights = computeInsights(result.transactions, result.summary);
        const walletHealth = computeWalletHealth(result.transactions, result.summary);

        setAnalysisResult({
          summary: result.summary,
          transactions: result.transactions,
          tokenHoldings: result.tokenHoldings,
          gasAnalytics,
          insights,
          walletHealth,
          // These are computed in components, but we store what we have
          flowStats: {
            incomingCount: 0, outgoingCount: 0, averageTxSize: 0,
            largestIncoming: null, largestOutgoing: null,
          },
          categoryBreakdowns: [],
          blockscoutBaseUrl: '',
        } as any);
        setTransactions(result.transactions);
        setView('dashboard');
      }
    } catch {
      const message = t('error.generic');
      setError(message, 'unknown');
      setLocalError(message);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeWallet(addressInput, false);
  };

  const handleDemo = () => {
    const demo = DEMO_WALLETS[chainId];
    setAddressInput(demo.address);
    analyzeWallet(demo.address, true);
  };

  return (
    <div className="min-h-screen bg-surface-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-accent-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Globe className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">CoinLedger</span>
        </div>
        <LanguageSwitcher />
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-600 mb-6 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-accent-400" />
            <span className="text-xs text-slate-400">{t('landing.poweredBy')}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight animate-fade-in">
            {t('landing.heroTitle')}<br />
            <span className="gradient-text">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 animate-fade-in">
            {t('landing.heroSubtitle')}
          </p>
        </div>

        {/* Wallet input */}
        <div className="max-w-2xl mx-auto mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('wallet.enterAddress')}
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => { setAddressInput(e.target.value); setLocalError(null); }}
                  placeholder={t('wallet.addressPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('wallet.selectNetwork')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CHAIN_LIST.map((chain) => (
                    <button
                      key={chain.id}
                      type="button"
                      onClick={() => setChainId(chain.id as ChainId)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        chainId === chain.id
                          ? 'bg-accent-500/15 border border-accent-500 text-accent-300'
                          : 'bg-surface-800 border border-surface-600 text-slate-400 hover:border-surface-500'
                      }`}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>

              {localError && (
                <p className="text-sm text-negative flex items-center gap-1.5">
                  {localError}
                </p>
              )}

              <button
                type="submit"
                disabled={fetching}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold hover:from-accent-400 hover:to-accent-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('wallet.loading')}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {t('landing.analyzeCta')}
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-surface-600" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-surface-600" />
          </div>

          <button
            onClick={handleDemo}
            disabled={fetching}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-surface-600 bg-surface-800/60 text-slate-300 font-medium hover:bg-surface-700 hover:text-white transition-all disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            {t('landing.demoCta')}
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-16">
          {[
            { icon: TrendingUp, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
            { icon: FileText, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
            { icon: Download, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
          ].map((feature, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 hover:glow-blue transition-all animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-accent-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-700 mt-8">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 text-center">
          <p className="text-sm text-slate-500">{t('footer.poweredBy')}</p>
          <p className="text-xs text-slate-600 mt-2">{t('footer.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
