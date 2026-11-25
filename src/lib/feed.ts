import type { PairEvent } from './abi'
import { FAMOUS_SYMBOLS } from './networks'
import type { TokenInfo } from './tokens'

export const FEED_LIMIT = 200

export interface FeedItem extends PairEvent {
  /** The token that is probably new. */
  coin: TokenInfo
  /** What it is paired with, usually WBNB/WETH or a stablecoin. */
  base: TokenInfo
  /** The new token uses the symbol of a famous one (fake USDT and friends). */
  lookalike: boolean
  /** When it reached the page (ms), for pairs seen live rather than in the first look back. */
  arrivedAt?: number
}

const unknown = (address: string): TokenInfo => ({ address, symbol: null, name: null, known: false })

export function describe(ev: PairEvent, tokens: Map<string, TokenInfo>): FeedItem {
  const t0 = tokens.get(ev.token0) ?? unknown(ev.token0)
  const t1 = tokens.get(ev.token1) ?? unknown(ev.token1)
  // the new coin is the side that is not a well-known quote token; token0 when both or neither are
  const [coin, base] = t0.known && !t1.known ? [t1, t0] : [t0, t1]
  const sym = coin.symbol?.toUpperCase().replace(/\s+/g, '')
  return { ...ev, coin, base, lookalike: !coin.known && !!sym && FAMOUS_SYMBOLS.has(sym) }
}

function newestFirst(a: PairEvent, b: PairEvent): number {
  return (b.timestamp ?? 0) - (a.timestamp ?? 0) || b.blockNumber - a.blockNumber || b.logIndex - a.logIndex
}

/** Adds new items, drops duplicates, keeps the newest `limit`. Never mutates `list`. */
export function mergeFeed(list: FeedItem[], incoming: FeedItem[], limit = FEED_LIMIT): FeedItem[] {
  const seen = new Set(list.map((i) => i.key))
  const fresh = incoming.filter((i) => !seen.has(i.key) && (seen.add(i.key), true))
  if (!fresh.length) return list
  return [...fresh, ...list].sort(newestFirst).slice(0, limit)
}
