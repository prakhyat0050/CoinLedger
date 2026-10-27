import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChainId, WalletAnalysisResult, Transaction } from '@/types';

export type AppView = 'landing' | 'dashboard';
export type DashboardTab = 'overview' | 'transactions' | 'portfolio' | 'gas' | 'tax' | 'insights' | 'copilot';

interface AppState {
  view: AppView;
  chainId: ChainId;
  walletAddress: string;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  analysisResult: WalletAnalysisResult | null;
  transactions: Transaction[];
  selectedTx: Transaction | null;
  drawerOpen: boolean;
  activeTab: DashboardTab;
  setView: (view: AppView) => void;
  setChainId: (id: ChainId) => void;
  setWalletAddress: (addr: string) => void;
  setIsDemo: (demo: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null, code?: string | null) => void;
  setAnalysisResult: (result: WalletAnalysisResult | null) => void;
  setTransactions: (txs: Transaction[]) => void;
  setSelectedTx: (tx: Transaction | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setActiveTab: (tab: DashboardTab) => void;
  resetToLanding: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>('landing');
  const [chainId, setChainId] = useState<ChainId>('ethereum');
  const [walletAddress, setWalletAddress] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<WalletAnalysisResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const setError = useCallback((err: string | null, code: string | null = null) => {
    setErrorState(err);
    setErrorCode(code);
  }, []);

  const resetToLanding = useCallback(() => {
    setView('landing');
    setWalletAddress('');
    setIsDemo(false);
    setLoading(false);
    setError(null);
    setAnalysisResult(null);
    setTransactions([]);
    setSelectedTx(null);
    setDrawerOpen(false);
    setActiveTab('overview');
  }, []);

  return (
    <AppContext.Provider value={{
      view, chainId, walletAddress, isDemo, loading, error, errorCode,
      analysisResult, transactions, selectedTx, drawerOpen, activeTab,
      setView, setChainId, setWalletAddress, setIsDemo,
      setLoading, setError, setAnalysisResult, setTransactions,
      setSelectedTx, setDrawerOpen, setActiveTab, resetToLanding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
