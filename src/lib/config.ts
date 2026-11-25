import { NETWORK_IDS, type NetworkId } from './networks'

export type RpcOverrides = Partial<Record<NetworkId, string>>

/** Only plain HTTPS endpoints are accepted (http://localhost too, for local nodes). */
export function validRpcUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined
  try {
    const u = new URL(v.trim())
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.href.replace(/\/$/, '')
  } catch {
    /* not a URL */
  }
  return undefined
}

/** `{"rpc": {"bsc": "https://...", "eth": "https://..."}}` -> overrides, anything invalid ignored. */
export function parseConfig(json: unknown): RpcOverrides {
  const rpc = (json as { rpc?: Record<string, unknown> } | null)?.rpc
  const out: RpcOverrides = {}
  if (!rpc || typeof rpc !== 'object') return out
  for (const id of NETWORK_IDS) {
    const url = validRpcUrl(rpc[id])
    if (url) out[id] = url
  }
  return out
}

/**
 * The container writes /config.json from its environment (BSC_RPC_URL, ETH_RPC_URL), together with a
 * matching Content-Security-Policy. Without it (local development) the built-in public nodes are used.
 */
export async function loadConfig(): Promise<RpcOverrides> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return {}
    return parseConfig(await res.json())
  } catch {
    return {}
  }
}
