import type { ChainId, TokenHolding, Transaction, WalletSummary } from '@/types';
import { getBlockscoutTxUrl } from './blockscout';

export interface CopilotMessage {
  role: 'user' | 'model';
  text: string;
}

interface WalletCopilotContext {
  summary: WalletSummary;
  holdings: Array<Pick<TokenHolding, 'name' | 'symbol' | 'humanBalance' | 'usdValue'>>;
  transactions: Array<{
    hash: string;
    explorerUrl: string;
    timestamp: string;
    direction: Transaction['direction'];
    asset: string;
    amount: number;
    usdValue: number | null;
    gasFee: number;
    gasFeeUsd: number | null;
    category: Transaction['category'];
    method: string | null;
    status: Transaction['status'];
  }>;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-copilot`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function askWalletCopilot(
  question: string,
  history: CopilotMessage[],
  summary: WalletSummary,
  holdings: TokenHolding[],
  transactions: Transaction[],
  chainId: ChainId,
): Promise<string> {
  if (!import.meta.env.VITE_SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('AI service is not configured. Set the Supabase URL and anon key to continue.');
  }

  const walletContext: WalletCopilotContext = {
    summary,
    holdings: holdings.slice(0, 40).map(({ name, symbol, humanBalance, usdValue }) => ({
      name,
      symbol,
      humanBalance,
      usdValue,
    })),
    transactions: transactions.slice(0, 30).map((tx) => ({
      hash: tx.hash,
      explorerUrl: getBlockscoutTxUrl(chainId, tx.hash),
      timestamp: tx.timestamp,
      direction: tx.direction,
      asset: tx.assetSymbol,
      amount: tx.humanAmount,
      usdValue: tx.usdValue,
      gasFee: tx.gasCostInNative,
      gasFeeUsd: tx.gasCostInUsd,
      category: tx.category,
      method: tx.method,
      status: tx.status,
    })),
  };
  const recentHistory = history.slice(-10);
  if (recentHistory[0]?.role === 'model') recentHistory.shift();

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      history: recentHistory,
      walletData: walletContext,
    }),
  });

  const result = await response.json().catch(() => null) as { answer?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(result?.error || `AI request failed (${response.status}). Please try again.`);
  }
  if (!result?.answer) {
    throw new Error('The AI service returned an empty answer. Please try again.');
  }

  return result.answer;
}
