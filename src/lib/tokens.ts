import { SELECTOR, decodeAbiText } from './abi'
import type { Rpc, RpcOutcome } from './rpc'

export interface TokenInfo {
  address: string
  symbol: string | null
  name: string | null
  /** True for the network's well-known quote tokens (WBNB, WETH, USDT...). */
  known: boolean
}

const MAX_CACHE = 2_000
/** Tokens per batch request (two calls each). */
const BATCH_TOKENS = 10

/**
 * Reads name() and symbol() of ERC-20 contracts, a few tokens per batch request, and remembers them.
 * A contract that reverts or returns garbage gets null fields, never an exception.
 */
export function createTokenReader(rpc: Rpc, quoteTokens: Record<string, string>) {
  const cache = new Map<string, Promise<TokenInfo>>()

  async function fetchMany(addresses: string[]): Promise<TokenInfo[]> {
    const calls = addresses.flatMap((to) => [
      { method: 'eth_call', params: [{ to, data: SELECTOR.name }, 'latest'] },
      { method: 'eth_call', params: [{ to, data: SELECTOR.symbol }, 'latest'] },
    ])
    let out: RpcOutcome[]
    try {
      out = await rpc.batch(calls)
    } catch {
      out = calls.map(() => ({ error: { code: -1, message: 'request failed' } }))
    }
    return addresses.map((address, i) => ({
      address,
      name: out[i * 2]?.error ? null : decodeAbiText(out[i * 2]?.result as string),
      symbol: out[i * 2 + 1]?.error ? null : decodeAbiText(out[i * 2 + 1]?.result as string),
      known: false,
    }))
  }

  return async function read(addresses: string[]): Promise<Map<string, TokenInfo>> {
    const todo: string[] = []
    for (const raw of new Set(addresses.map((a) => a.toLowerCase()))) {
      if (cache.has(raw)) continue
      const known = quoteTokens[raw]
      if (known) cache.set(raw, Promise.resolve({ address: raw, symbol: known, name: null, known: true }))
      else todo.push(raw)
    }
    for (let start = 0; start < todo.length; start += BATCH_TOKENS) {
      const group = todo.slice(start, start + BATCH_TOKENS)
      const pending = fetchMany(group)
      group.forEach((a, i) => {
        const p = pending.then((list) => list[i])
        cache.set(a, p)
        // a failed read is not remembered: the next pair with the same token tries again
        p.then((t) => { if (!t.name && !t.symbol) cache.delete(a) })
      })
    }
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
    const result = new Map<string, TokenInfo>()
    for (const a of addresses) {
      const k = a.toLowerCase()
      const p = cache.get(k)
      result.set(k, p ? await p : { address: k, symbol: null, name: null, known: false })
    }
    return result
  }
}
