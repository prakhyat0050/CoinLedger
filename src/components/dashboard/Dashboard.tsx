import { LayoutDashboard, ArrowLeftRight, Briefcase, Fuel, FileText, Lightbulb, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { useApp, type DashboardTab } from '@/context/AppContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { WalletHeader } from './Overview';
import { OverviewTab } from './Overview';
import { TransactionTable } from './TransactionTable';
import { TransactionDrawer } from './TransactionDrawer';
import { PortfolioTab } from './PortfolioTab';
import { GasTab } from './GasTab';
import { TaxTab } from './TaxTab';
import { InsightsTab } from './InsightsTab';
import { WalletCopilot } from './WalletCopilot';

const TABS: Array<{ id: DashboardTab; icon: typeof LayoutDashboard; labelKey: string }> = [
  { id: 'overview', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { id: 'transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { id: 'portfolio', icon: Briefcase, labelKey: 'nav.portfolio' },
  { id: 'gas', icon: Fuel, labelKey: 'nav.gasAnalytics' },
  { id: 'tax', icon: FileText, labelKey: 'nav.taxReport' },
  { id: 'insights', icon: Lightbulb, labelKey: 'nav.insights' },
  { id: 'copilot', icon: Sparkles, labelKey: 'nav.copilot' },
];

export function Dashboard() {
  const { t } = useI18n();
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Top nav */}
      <nav className="sticky top-0 z-30 bg-surface-900/90 backdrop-blur-md border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-base font-bold text-white hidden sm:inline">CoinLedger</span>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <WalletHeader />

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-accent-500/15 text-accent-300 border border-accent-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="pb-12">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'transactions' && <TransactionTable />}
          {activeTab === 'portfolio' && <PortfolioTab />}
          {activeTab === 'gas' && <GasTab />}
          {activeTab === 'tax' && <TaxTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'copilot' && <WalletCopilot />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-surface-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center">
          <p className="text-sm text-slate-500">{t('footer.poweredBy')}</p>
          <p className="text-xs text-slate-600 mt-2">{t('footer.disclaimer')}</p>
        </div>
      </footer>

      {/* Transaction details drawer */}
      <TransactionDrawer />
    </div>
  );
}
