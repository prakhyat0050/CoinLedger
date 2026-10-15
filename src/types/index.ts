// ============ Internal Application Types ============
// These types are normalized from Blockscout API responses.
// The UI is coupled to these, NOT to the raw API format.

export type ChainId =
  | 'ethereum'
  | 'polygon'
  | 'optimism'
  | 'arbitrum'
  | 'base'
  | 'gnosis'
  | 'scroll'
  | 'zksync'
  | 'linea'
  | 'mantle';

export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  baseUrl: string;
  currencySymbol: string;
  logoUrl: string;
}

export type TransactionDirection = 'in' | 'out' | 'self';

export type TransactionCategory =
  | 'income'
  | 'payment'
  | 'swap'
  | 'transfer'
  | 'nft'
  | 'contract'
  | 'gas'
  | 'unknown';

export type TransactionStatus = 'ok' | 'error' | 'pending';

export type AssetType = 'native' | 'erc20' | 'erc721' | 'erc1155';

export interface Transaction {
  hash: string;
  blockNumber: number | null;
  timestamp: string;
  direction: TransactionDirection;
  fromAddress: string;
  toAddress: string | null;
  assetSymbol: string;
  assetType: AssetType;
  assetContract: string | null;
  rawAmount: string;
  decimals: number;
  humanAmount: number;
  usdValue: number | null;
  gasUsed: string;
  gasPrice: string;
  gasCostInNative: number;
  gasCostInUsd: number | null;
  nativeSymbol: string;
  status: TransactionStatus;
  method: string | null;
  category: TransactionCategory;
  categoryConfidence: 'high' | 'medium' | 'low';
  createdContract: string | null;
  rawData: Record<string, unknown>;
}

export interface TokenHolding {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  type: AssetType;
  rawBalance: string;
  humanBalance: number;
  usdValue: number | null;
  exchangeRate: number | null;
  logoUrl: string | null;
  chainId: ChainId;
}

export interface WalletSummary {
  address: string;
  chainId: ChainId;
  nativeBalance: number;
  nativeSymbol: string;
  nativeUsdValue: number | null;
  exchangeRate: number | null;
  totalReceivedUsd: number;
  totalSentUsd: number;
  totalGasUsd: number;
  netFlowUsd: number;
  estimatedPnlUsd: number | null;
  transactionCount: number;
  gasUsageCount: number;
  tokenTransfersCount: number;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
}

export interface GasAnalytics {
  totalGasSpentNative: number;
  totalGasSpentUsd: number | null;
  averageGasPerTx: number;
  highestGasTx: Transaction | null;
  gasByDay: GasDataPoint[];
  gasByMonth: GasDataPoint[];
}

export interface GasDataPoint {
  date: string;
  label: string;
  gasUsd: number;
  gasNative: number;
  txCount: number;
}

export interface FlowDataPoint {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface FlowStats {
  incomingCount: number;
  outgoingCount: number;
  averageTxSize: number;
  largestIncoming: Transaction | null;
  largestOutgoing: Transaction | null;
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  count: number;
  totalUsd: number;
  percentage: number;
}

export interface FinancialInsight {
  id: string;
  type: 'positive' | 'neutral' | 'warning' | 'info';
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  value?: string;
}

export interface WalletHealth {
  activityLevel: 'low' | 'medium' | 'high' | 'very-high';
  activityScore: number;
  txFrequency: number;
  activeDays: number;
  uniqueContracts: number;
  tokenActivity: number;
  totalDays: number;
}

export interface TaxRow {
  date: string;
  txHash: string;
  type: TransactionDirection;
  assetSymbol: string;
  amount: number;
  usdValue: number | null;
  fromAddress: string;
  toAddress: string | null;
  gasFee: number;
  gasFeeUsd: number | null;
  category: TransactionCategory;
  notes: string;
}

export interface WalletAnalysisResult {
  summary: WalletSummary;
  transactions: Transaction[];
  tokenHoldings: TokenHolding[];
  gasAnalytics: GasAnalytics;
  flowStats: FlowStats;
  categoryBreakdowns: CategoryBreakdown[];
  insights: FinancialInsight[];
  walletHealth: WalletHealth;
  blockscoutBaseUrl: string;
}

export interface BlockscoutTransactionRaw {
  hash: string;
  block_hash?: string;
  block_number: number | null;
  timestamp?: string;
  from: { hash: string; ens_domain_name?: string | null } | null;
  to: { hash: string; ens_domain_name?: string | null } | null;
  value: string;
  gas: string;
  gas_price: string;
  gas_used?: string;
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  nonce?: number;
  status?: string;
  method?: string;
  transaction_types?: number[];
  exchange_rate?: string | null;
  raw_input?: string;
  created_contract?: { hash: string } | null;
  result?: string;
  token_transfers?: TokenTransferRaw[];
  token?: TokenRaw;
  type?: string;
}

export interface TokenTransferRaw {
  from: { hash: string } | null;
  to: { hash: string } | null;
  total: { value: string; decimals?: string } | null;
  token: TokenRaw;
  type?: string;
}

export interface TokenRaw {
  type?: string;
  address: string;
  symbol: string;
  name: string;
  decimals: string;
  icon_url?: string | null;
  exchange_rate?: string | null;
}

export interface TokenBalanceRaw {
  token: TokenRaw;
  value: string;
  token_instance?: Record<string, unknown> | null;
}

export interface AddressInfoRaw {
  block_number_balance_updated_at?: number | null;
  coin_balance?: string | null;
  exchange_rate?: string | null;
  ens_domain_name?: string | null;
  has_decompiled_code?: boolean;
}

export interface AddressCountersRaw {
  gas_usage_count?: string;
  transactions_count?: string;
  token_transfers_count?: string;
  validations_count?: string;
}

export interface BlockscoutListResponse<T> {
  items: T[];
  next_page_params: Record<string, unknown> | null;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
}
