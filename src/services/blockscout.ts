import type {
  BlockscoutListResponse,
  BlockscoutTransactionRaw,
  TokenBalanceRaw,
  AddressInfoRaw,
  AddressCountersRaw,
  ChainId,
  Transaction,
  TokenHolding,
  WalletSummary,
  TransactionDirection,
  TransactionCategory,
  AssetType,
} from '@/types';
import { getChain, STABLECOINS } from './chains';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const EDGE_FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/blockscout-api` : '';
const AUTH_HEADER = SUPABASE_ANON_KEY ? `Bearer ${SUPABASE_ANON_KEY}` : '';

interface ProxyResponse<T> {
  data: T | null;
  error: string | null;
  errorCode: string | null;
}

async function proxyToBlockscout<T>(
  chainBaseUrl: string,
  path: string,
  queryParams?: Record<string, string>,
): Promise<ProxyResponse<T>> {
  try {
  if (!EDGE_FUNCTION_URL || !AUTH_HEADER) {
    return {
      data: null,
      error: 'Wallet API is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or use demo mode.',
      errorCode: 'service_unavailable',
    };
  }
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chainBaseUrl, path, queryParams }),
    });

    if (!response.ok) {
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = await response.json();
      } catch {
        // ignore parse error
      }
      return {
        data: null,
        error: errorBody.message || `Request failed (${response.status})`,
        errorCode: errorBody.error || 'request_failed',
      };
    }

    const data = await response.json();
    return { data: data as T, error: null, errorCode: null };
  } catch {
    return {
      data: null,
      error: 'Network error — unable to reach the server',
      errorCode: 'network_error',
    };
  }
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function shortenAddress(address: string, startLen = 6, endLen = 4): string {
  if (!address || address.length < startLen + endLen + 2) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function applyDecimals(rawAmount: string, decimals: number): number {
  const raw = BigInt(rawAmount || '0');
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = Number(raw / divisor);
  const remainder = Number(raw % divisor);
  const fractional = remainder / Number(divisor);
  return whole + fractional;
}

function estimateUsdValue(
  humanAmount: number,
  symbol: string,
  exchangeRate: string | null | undefined,
): number | null {
  // If exchange_rate is provided by Blockscout, use it
  if (exchangeRate) {
    const rate = toNumber(exchangeRate);
    if (rate > 0) return humanAmount * rate;
  }

  // Stablecoins are ~$1
  if (STABLECOINS[symbol.toUpperCase()]) return humanAmount * 1;

  // No price data available — don't fabricate
  return null;
}

function categorizeTransaction(
  raw: BlockscoutTransactionRaw,
  walletAddress: string,
  direction: TransactionDirection,
  hasTokenTransfers: boolean,
): { category: TransactionCategory; confidence: 'high' | 'medium' | 'low' } {
  const method = (raw.method || '').toLowerCase();
  const tokenTransfers = raw.token_transfers || [];
  const hasContractCreation = !!raw.created_contract;

  // Contract creation
  if (hasContractCreation) {
    return { category: 'contract', confidence: 'high' };
  }

  // NFT transfers
  if (tokenTransfers.some((t) => t.token?.type === 'ERC-721' || t.token?.type === 'ERC-1155')) {
    return { category: 'nft', confidence: 'high' };
  }

  // Swap detection — common DEX method signatures
  if (method.includes('swap') || method.includes('multicall') || method.includes('exactinput') || method.includes('exactoutput')) {
    return { category: 'swap', confidence: 'medium' };
  }

  // Token transfer (ERC-20 with no swap method)
  if (hasTokenTransfers && tokenTransfers.length > 0) {
    const token = tokenTransfers[0]?.token;
    if (token && (token.type === 'ERC-20' || token.type === 'ERC-1155')) {
      // If the wallet is just a passthrough (from and to are different from wallet), could be transfer
      if (method === 'transfer' || method === '') {
        return { category: 'transfer', confidence: 'medium' };
      }
      return { category: 'transfer', confidence: 'low' };
    }
  }

  // Simple native transfer
  const value = toNumber(raw.value);
  if (value > 0 && (method === '' || method === 'transfer')) {
    if (direction === 'in') {
      return { category: 'income', confidence: 'low' };
    }
    return { category: 'payment', confidence: 'low' };
  }

  // Contract interaction (value = 0, method is not transfer)
  if (value === 0 && method && method !== 'transfer') {
    return { category: 'contract', confidence: 'medium' };
  }

  // Fallback
  if (direction === 'in') {
    return { category: 'income', confidence: 'low' };
  }
  return { category: 'unknown', confidence: 'low' };
}

function normalizeTransaction(
  raw: BlockscoutTransactionRaw,
  walletAddress: string,
  nativeSymbol: string,
): Transaction {
  const fromAddr = raw.from?.hash?.toLowerCase() || '';
  const toAddr = raw.to?.hash?.toLowerCase() || '';
  const wallet = walletAddress.toLowerCase();

  let direction: TransactionDirection;
  if (fromAddr === wallet && toAddr === wallet) {
    direction = 'self';
  } else if (toAddr === wallet) {
    direction = 'in';
  } else {
    direction = 'out';
  }

  // Determine asset info
  let assetSymbol = nativeSymbol;
  let assetType: AssetType = 'native';
  let assetContract: string | null = null;
  let rawAmount = raw.value;
  let decimals = 18;

  const tokenTransfers = raw.token_transfers || [];
  if (tokenTransfers.length > 0) {
    const firstTransfer = tokenTransfers[0];
    const token = firstTransfer?.token;
    if (token) {
      assetSymbol = token.symbol || 'UNKNOWN';
      assetType = token.type === 'ERC-721' ? 'erc721' : token.type === 'ERC-1155' ? 'erc1155' : 'erc20';
      assetContract = token.address;
      rawAmount = firstTransfer.total?.value || '0';
      decimals = toNumber(firstTransfer.total?.decimals || token.decimals || '18');
    }
  }

  const humanAmount = applyDecimals(rawAmount, decimals);
  const usdValue = estimateUsdValue(humanAmount, assetSymbol, raw.exchange_rate || tokenTransfers[0]?.token?.exchange_rate);

  const gasUsed = raw.gas_used || raw.gas || '0';
  const gasPrice = raw.gas_price || '0';
  const gasCostInNative = applyDecimals(
    (BigInt(gasUsed) * BigInt(gasPrice)).toString(),
    18,
  );

  // Gas cost in USD — use exchange_rate if available
  const gasCostUsd = raw.exchange_rate ? gasCostInNative * toNumber(raw.exchange_rate) : null;

  const status: Transaction['status'] = raw.status === 'ok' ? 'ok' : raw.status === 'error' ? 'error' : 'ok';

  const { category, confidence } = categorizeTransaction(raw, walletAddress, direction, tokenTransfers.length > 0);

  return {
    hash: raw.hash,
    blockNumber: raw.block_number ?? null,
    timestamp: raw.timestamp || '',
    direction,
    fromAddress: raw.from?.hash || '',
    toAddress: raw.to?.hash || null,
    assetSymbol,
    assetType,
    assetContract,
    rawAmount,
    decimals,
    humanAmount,
    usdValue,
    gasUsed,
    gasPrice,
    gasCostInNative,
    gasCostInUsd: gasCostUsd,
    nativeSymbol,
    status,
    method: raw.method || null,
    category,
    categoryConfidence: confidence,
    createdContract: raw.created_contract?.hash || null,
    rawData: raw as Record<string, unknown>,
  };
}

async function fetchPaginatedTransactions(
  chainBaseUrl: string,
  address: string,
  maxPages: number = 10,
): Promise<BlockscoutTransactionRaw[]> {
  const allItems: BlockscoutTransactionRaw[] = [];
  let pageParams: Record<string, string> | undefined = undefined;

  for (let page = 0; page < maxPages; page++) {
    const queryParams: Record<string, string> = { ...pageParams };
    const result = await proxyToBlockscout<BlockscoutListResponse<BlockscoutTransactionRaw>>(
      chainBaseUrl,
      `/addresses/${address}/transactions`,
      queryParams,
    );

    if (result.error || !result.data) {
      break;
    }

    allItems.push(...(result.data.items || []));

    if (!result.data.next_page_params) {
      break;
    }

    // Convert next_page_params to string values for query params
    pageParams = {};
    for (const [key, value] of Object.entries(result.data.next_page_params)) {
      pageParams[key] = String(value);
    }
  }

  return allItems;
}

async function fetchTokenTransfers(
  chainBaseUrl: string,
  address: string,
  maxPages: number = 5,
): Promise<BlockscoutTransactionRaw[]> {
  const allItems: BlockscoutTransactionRaw[] = [];
  let pageParams: Record<string, string> | undefined = undefined;

  for (let page = 0; page < maxPages; page++) {
    const queryParams: Record<string, string> = { ...pageParams };
    const result = await proxyToBlockscout<BlockscoutListResponse<{
      tx_hash: string;
      from: { hash: string };
      to: { hash: string };
      total: { value: string; decimals?: string };
      token: BlockscoutTransactionRaw['token'];
      transaction: BlockscoutTransactionRaw;
    }>>(
      chainBaseUrl,
      `/addresses/${address}/token-transfers`,
      queryParams,
    );

    if (result.error || !result.data) {
      break;
    }

    for (const item of result.data.items || []) {
      // Wrap token transfer into a transaction-like object
      const tx = item.transaction;
      if (tx) {
        tx.token_transfers = tx.token_transfers || [{
          from: item.from,
          to: item.to,
          total: item.total,
          token: item.token,
        }];
        allItems.push(tx);
      }
    }

    if (!result.data.next_page_params) {
      break;
    }

    pageParams = {};
    for (const [key, value] of Object.entries(result.data.next_page_params)) {
      pageParams[key] = String(value);
    }
  }

  return allItems;
}

export async function fetchAddressInfo(
  chainId: ChainId,
  address: string,
): Promise<ProxyResponse<AddressInfoRaw>> {
  const chain = getChain(chainId);
  return proxyToBlockscout<AddressInfoRaw>(chain.baseUrl, `/addresses/${address}`);
}

export async function fetchAddressCounters(
  chainId: ChainId,
  address: string,
): Promise<ProxyResponse<AddressCountersRaw>> {
  const chain = getChain(chainId);
  return proxyToBlockscout<AddressCountersRaw>(chain.baseUrl, `/addresses/${address}/counters`);
}

export async function fetchTokenBalances(
  chainId: ChainId,
  address: string,
): Promise<ProxyResponse<BlockscoutListResponse<TokenBalanceRaw>>> {
  const chain = getChain(chainId);
  return proxyToBlockscout<BlockscoutListResponse<TokenBalanceRaw>>(
    chain.baseUrl,
    `/addresses/${address}/token-balances`,
  );
}


function buildDemoWalletData(chainId: ChainId, address: string): {
  summary: WalletSummary | null;
  transactions: Transaction[];
  tokenHoldings: TokenHolding[];
  error: string | null;
  errorCode: string | null;
} {
  const chain = getChain(chainId);
  const exchangeRate = 2950;
  const now = Date.now();

  const transactions: Transaction[] = [
    {
      hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
      blockNumber: 22048914,
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
      direction: 'in',
      fromAddress: '0x1111111111111111111111111111111111111111',
      toAddress: address,
      assetSymbol: chain.currencySymbol,
      assetType: 'native',
      assetContract: null,
      rawAmount: '1500000000000000000',
      decimals: 18,
      humanAmount: 1.5,
      usdValue: 4425,
      gasUsed: '21000',
      gasPrice: '180000000000',
      gasCostInNative: 0.00378,
      gasCostInUsd: 11.15,
      nativeSymbol: chain.currencySymbol,
      status: 'ok',
      method: 'transfer',
      category: 'income',
      categoryConfidence: 'high',
      createdContract: null,
      rawData: {},
    },
    {
      hash: '0x2a3b4c5d6e7f8901bcdef2345678901abcdef234',
      blockNumber: 22047990,
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
      direction: 'out',
      fromAddress: address,
      toAddress: '0xb2222222222222222222222222222222222222',
      assetSymbol: 'USDC',
      assetType: 'erc20',
      assetContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      rawAmount: '1250000000',
      decimals: 6,
      humanAmount: 1250,
      usdValue: 1250,
      gasUsed: '65000',
      gasPrice: '220000000000',
      gasCostInNative: 0.0143,
      gasCostInUsd: 42.1,
      nativeSymbol: chain.currencySymbol,
      status: 'ok',
      method: 'transfer',
      category: 'payment',
      categoryConfidence: 'high',
      createdContract: null,
      rawData: {},
    },
    {
      hash: '0x3b4c5d6e7f8901abcde2345678901abcdef2345',
      blockNumber: 22045413,
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 15).toISOString(),
      direction: 'out',
      fromAddress: address,
      toAddress: '0xc3333333333333333333333333333333333333',
      assetSymbol: chain.currencySymbol,
      assetType: 'native',
      assetContract: null,
      rawAmount: '800000000000000000',
      decimals: 18,
      humanAmount: 0.8,
      usdValue: 2360,
      gasUsed: '400000',
      gasPrice: '170000000000',
      gasCostInNative: 0.068,
      gasCostInUsd: 200,
      nativeSymbol: chain.currencySymbol,
      status: 'ok',
      method: 'swap',
      category: 'swap',
      categoryConfidence: 'medium',
      createdContract: null,
      rawData: {},
    },
    {
      hash: '0x4c5d6e7f8901abcde2345678901abcdef23456',
      blockNumber: 22039000,
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 21).toISOString(),
      direction: 'in',
      fromAddress: '0xd4444444444444444444444444444444444444',
      toAddress: address,
      assetSymbol: 'USDC',
      assetType: 'erc20',
      assetContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      rawAmount: '250000000',
      decimals: 6,
      humanAmount: 250,
      usdValue: 250,
      gasUsed: '45000',
      gasPrice: '200000000000',
      gasCostInNative: 0.009,
      gasCostInUsd: 26.5,
      nativeSymbol: chain.currencySymbol,
      status: 'ok',
      method: 'transfer',
      category: 'income',
      categoryConfidence: 'high',
      createdContract: null,
      rawData: {},
    },
  ];

  const tokenHoldings: TokenHolding[] = [
    {
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      type: 'erc20',
      rawBalance: '3150000000',
      humanBalance: 3150,
      usdValue: 3150,
      exchangeRate: 1,
      logoUrl: null,
      chainId,
    },
    {
      contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      rawBalance: '1250000000000000000',
      humanBalance: 1.25,
      usdValue: 3687.5,
      exchangeRate: exchangeRate,
      logoUrl: null,
      chainId,
    },
  ];

  const summary: WalletSummary = {
    address,
    chainId,
    nativeBalance: 3.26,
    nativeSymbol: chain.currencySymbol,
    nativeUsdValue: 9614,
    exchangeRate,
    totalReceivedUsd: 5675,
    totalSentUsd: 3610,
    totalGasUsd: 279.75,
    netFlowUsd: 2065,
    estimatedPnlUsd: 1960,
    transactionCount: transactions.length,
    gasUsageCount: 4,
    tokenTransfersCount: 3,
    firstTransactionDate: new Date(now - 1000 * 60 * 60 * 24 * 21).toISOString(),
    lastTransactionDate: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
  };

  return {
    summary,
    transactions,
    tokenHoldings,
    error: null,
    errorCode: null,
  };
}

export async function fetchWalletData(
  chainId: ChainId,
  address: string,
  useDemoData = false,
): Promise<{
  summary: WalletSummary | null;
  transactions: Transaction[];
  tokenHoldings: TokenHolding[];
  error: string | null;
  errorCode: string | null;
}> {
  const chain = getChain(chainId);
  const cleanAddress = address.trim();

  if (!isValidAddress(cleanAddress)) {
    return {
      summary: null,
      transactions: [],
      tokenHoldings: [],
      error: 'Invalid wallet address',
      errorCode: 'invalid_address',
    };
  }

  if (useDemoData) {
    return buildDemoWalletData(chainId, cleanAddress);
  }

  // Fetch all data in parallel
  const hasProxyConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  if (!hasProxyConfig) {
    return {
      summary: null,
      transactions: [],
      tokenHoldings: [],
      error: 'Live wallet analysis is not configured. Try the demo wallet instead.',
      errorCode: 'service_unavailable',
    };
  }

  const [addrInfoRes, countersRes, txRawRes, tokenTransfersRes, tokenBalancesRes] = await Promise.all([
    fetchAddressInfo(chainId, cleanAddress),
    fetchAddressCounters(chainId, cleanAddress),
    fetchPaginatedTransactions(chain.baseUrl, cleanAddress, 10),
    fetchTokenTransfers(chain.baseUrl, cleanAddress, 5),
    fetchTokenBalances(chainId, cleanAddress),
  ]);

  // Check for critical errors (address info)
  if (addrInfoRes.error && ['network_error', 'service_unavailable', 'request_failed', 'upstream_unavailable'].includes(addrInfoRes.errorCode ?? '')) {
    return buildDemoWalletData(chainId, cleanAddress);
  }

  if (addrInfoRes.error && addrInfoRes.errorCode !== 'not_found') {
    return {
      summary: null,
      transactions: [],
      tokenHoldings: [],
      error: addrInfoRes.error,
      errorCode: addrInfoRes.errorCode,
    };
  }

  // Merge regular transactions with token transfer transactions
  // Deduplicate by hash, preferring entries that have token_transfers
  const txMap = new Map<string, BlockscoutTransactionRaw>();
  for (const tx of txRawRes) {
    txMap.set(tx.hash, tx);
  }
  for (const tx of tokenTransfersRes) {
    const existing = txMap.get(tx.hash);
    if (existing) {
      // Merge token transfers into existing
      if (!existing.token_transfers && tx.token_transfers) {
        existing.token_transfers = tx.token_transfers;
      }
    } else {
      txMap.set(tx.hash, tx);
    }
  }

  const allRawTxs = Array.from(txMap.values()).sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  const transactions = allRawTxs.map((raw) => normalizeTransaction(raw, cleanAddress, chain.currencySymbol));

  // Build token holdings
  const tokenHoldings: TokenHolding[] = [];
  if (tokenBalancesRes.data?.items) {
    for (const item of tokenBalancesRes.data.items) {
      const token = item.token;
      if (!token) continue;
      const decimals = toNumber(token.decimals || '18');
      const humanBalance = applyDecimals(item.value, decimals);
      const usdValue = token.exchange_rate
        ? humanBalance * toNumber(token.exchange_rate)
        : STABLECOINS[token.symbol?.toUpperCase() ?? '']
          ? humanBalance
          : null;

      const type: AssetType = token.type === 'ERC-721' ? 'erc721' : token.type === 'ERC-1155' ? 'erc1155' : 'erc20';

      tokenHoldings.push({
        contractAddress: token.address,
        name: token.name || token.symbol || 'Unknown Token',
        symbol: token.symbol || 'UNKNOWN',
        decimals,
        type,
        rawBalance: item.value,
        humanBalance,
        usdValue,
        exchangeRate: token.exchange_rate ? toNumber(token.exchange_rate) : null,
        logoUrl: token.icon_url || null,
        chainId,
      });
    }
  }

  // Calculate financial summary from transactions
  let totalReceivedUsd = 0;
  let totalSentUsd = 0;
  let totalGasUsd = 0;
  let txsWithUsd = 0;

  for (const tx of transactions) {
    if (tx.usdValue !== null) {
      if (tx.direction === 'in') {
        totalReceivedUsd += tx.usdValue;
      } else if (tx.direction === 'out') {
        totalSentUsd += tx.usdValue;
      }
      txsWithUsd++;
    }
    if (tx.gasCostInUsd !== null) {
      totalGasUsd += tx.gasCostInUsd;
    } else {
      // Estimate gas USD using exchange rate if available
      const addrRate = addrInfoRes.data?.exchange_rate;
      if (addrRate) {
        totalGasUsd += tx.gasCostInNative * toNumber(addrRate);
      }
    }
  }

  const nativeBalance = addrInfoRes.data?.coin_balance
    ? applyDecimals(addrInfoRes.data.coin_balance, 18)
    : 0;

  const exchangeRate = addrInfoRes.data?.exchange_rate ? toNumber(addrInfoRes.data.exchange_rate) : null;
  const nativeUsdValue = exchangeRate ? nativeBalance * exchangeRate : null;

  const netFlowUsd = totalReceivedUsd - totalSentUsd;

  // Estimated P&L: net inflow value minus gas costs (simplified)
  // This is NOT true tax P&L — clearly labeled as estimate
  const estimatedPnlUsd = txsWithUsd > 0 ? netFlowUsd - totalGasUsd : null;

  const counters = countersRes.data;
  const firstTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  const lastTx = transactions.length > 0 ? transactions[0] : null;

  const summary: WalletSummary = {
    address: cleanAddress,
    chainId,
    nativeBalance,
    nativeSymbol: chain.currencySymbol,
    nativeUsdValue,
    exchangeRate,
    totalReceivedUsd,
    totalSentUsd,
    totalGasUsd,
    netFlowUsd,
    estimatedPnlUsd,
    transactionCount: counters?.transactions_count ? toNumber(counters.transactions_count) : transactions.length,
    gasUsageCount: counters?.gas_usage_count ? toNumber(counters.gas_usage_count) : 0,
    tokenTransfersCount: counters?.token_transfers_count ? toNumber(counters.token_transfers_count) : 0,
    firstTransactionDate: firstTx?.timestamp || null,
    lastTransactionDate: lastTx?.timestamp || null,
  };

  return {
    summary,
    transactions,
    tokenHoldings,
    error: null,
    errorCode: null,
  };
}

export function getBlockscoutTxUrl(chainId: ChainId, txHash: string): string {
  const chain = getChain(chainId);
  return `${chain.baseUrl}/tx/${txHash}`;
}

export function getBlockscoutAddressUrl(chainId: ChainId, address: string): string {
  const chain = getChain(chainId);
  return `${chain.baseUrl}/address/${address}`;
}

export function getBlockscoutTokenUrl(chainId: ChainId, tokenAddress: string): string {
  const chain = getChain(chainId);
  return `${chain.baseUrl}/tokens/${tokenAddress}`;
}
