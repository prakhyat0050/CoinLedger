import type { ChainConfig, ChainId } from '@/types';

export const CHAINS: Record<ChainId, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    baseUrl: 'https://eth.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: 'https://eth.blockscout.com/assets/networks/ethereum/logo.svg',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'MATIC',
    baseUrl: 'https://polygon.blockscout.com',
    currencySymbol: 'POL',
    logoUrl: '',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    shortName: 'OP',
    baseUrl: 'https://optimism.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'ARB',
    baseUrl: 'https://arbitrum.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  base: {
    id: 'base',
    name: 'Base',
    shortName: 'BASE',
    baseUrl: 'https://base.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  gnosis: {
    id: 'gnosis',
    name: 'Gnosis',
    shortName: 'xDAI',
    baseUrl: 'https://gnosis.blockscout.com',
    currencySymbol: 'xDAI',
    logoUrl: '',
  },
  scroll: {
    id: 'scroll',
    name: 'Scroll',
    shortName: 'ETH',
    baseUrl: 'https://scroll.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync Era',
    shortName: 'ETH',
    baseUrl: 'https://zksync.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  linea: {
    id: 'linea',
    name: 'Linea',
    shortName: 'ETH',
    baseUrl: 'https://linea.blockscout.com',
    currencySymbol: 'ETH',
    logoUrl: '',
  },
  mantle: {
    id: 'mantle',
    name: 'Mantle',
    shortName: 'MNT',
    baseUrl: 'https://mantle.blockscout.com',
    currencySymbol: 'MNT',
    logoUrl: '',
  },
};

export const CHAIN_LIST = Object.values(CHAINS);

export function getChain(id: ChainId): ChainConfig {
  return CHAINS[id] ?? CHAINS.ethereum;
}

export const DEMO_WALLETS: Record<ChainId, { address: string; label: string }> = {
  ethereum: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Ethereum)',
  },
  polygon: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Polygon)',
  },
  optimism: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Optimism)',
  },
  arbitrum: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Arbitrum)',
  },
  base: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Base)',
  },
  gnosis: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Gnosis)',
  },
  scroll: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Scroll)',
  },
  zksync: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (zkSync)',
  },
  linea: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Linea)',
  },
  mantle: {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'vitalik.eth (Mantle)',
  },
};

// Stablecoins commonly pegged to USD — used for USD value estimation
export const STABLECOINS: Record<string, string> = {
  USDC: '1',
  USDT: '1',
  DAI: '1',
  USDC_E: '1',
  BUSD: '1',
  TUSD: '1',
  FRAX: '1',
  LUSD: '1',
  USDP: '1',
};

// Known wrapped/native token approximate values (fallback only)
// In production, a pricing provider would supply these.
export const NATIVE_TOKEN_NAMES: Record<string, string> = {
  ETH: 'Ethereum',
  POL: 'Polygon',
  MATIC: 'Polygon',
  xDAI: 'Gnosis',
  MNT: 'Mantle',
};
