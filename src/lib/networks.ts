export type NetworkId = 'bsc' | 'eth'

export interface Network {
  id: NetworkId
  /** Short label shown on badges. */
  short: string
  name: string
  dex: string
  /** Uniswap v2 style factory that emits PairCreated. */
  factory: string
  explorer: string
  /** Default JSON-RPC endpoint (HTTPS, no API key). Can be overridden by /config.json. */
  rpc: string
  pollMs: number
  /** How many blocks to look back on start, so the list is not empty. */
  backfillBlocks: number
  /** Largest block range asked in a single eth_getLogs. */
  maxRange: number
  /** Blocks kept behind the head: behind a load balancer the next node may not have the newest block yet. */
  lag: number
  /** Well-known tokens new coins are usually paired with (lowercase address -> symbol). */
  quoteTokens: Record<string, string>
}

export const NETWORKS: Record<NetworkId, Network> = {
  bsc: {
    id: 'bsc',
    short: 'BSC',
    name: 'BNB Smart Chain',
    dex: 'PancakeSwap v2',
    factory: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    explorer: 'https://bscscan.com',
    rpc: 'https://bsc-rpc.publicnode.com',
    pollMs: 3_000,
    backfillBlocks: 2_000,
    maxRange: 1_000,
    lag: 2,
    quoteTokens: {
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'WBNB',
      '0xe9e7cea3dedca5984780bafc599bd69add087d56': 'BUSD',
      '0x55d398326f99059ff775485246999027b3197955': 'USDT',
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'USDC',
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8': 'ETH',
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': 'BTCB',
    },
  },
  eth: {
    id: 'eth',
    short: 'ETH',
    name: 'Ethereum',
    dex: 'Uniswap v2',
    factory: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
    explorer: 'https://etherscan.io',
    rpc: 'https://ethereum-rpc.publicnode.com',
    pollMs: 12_000,
    backfillBlocks: 1_500,
    maxRange: 500,
    lag: 1,
    quoteTokens: {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
    },
  },
}

export const NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[]

/** Symbols that scam tokens like to copy. A new token using one of them is flagged as a lookalike. */
export const FAMOUS_SYMBOLS = new Set([
  'BNB', 'WBNB', 'ETH', 'WETH', 'BTC', 'WBTC', 'BTCB', 'USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD', 'TUSD',
  'CAKE', 'UNI', 'LINK', 'SHIB', 'PEPE', 'DOGE', 'SOL', 'XRP', 'TRX', 'TON',
])
