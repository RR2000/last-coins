export interface RpcCall {
  method: string
  params: unknown[]
}

export interface RpcOutcome {
  result?: unknown
  error?: { code: number; message: string }
}

export interface Rpc {
  url: string
  call<T = unknown>(method: string, params: unknown[]): Promise<T>
  /** One HTTP request, many calls. Outcomes come back in the order of `calls`. */
  batch(calls: RpcCall[]): Promise<RpcOutcome[]>
}

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export function createRpc(url: string, opts: { fetch?: FetchLike; timeoutMs?: number } = {}): Rpc {
  const doFetch: FetchLike = opts.fetch ?? ((i, init) => fetch(i, init))
  const timeoutMs = opts.timeoutMs ?? 15_000
  let nextId = 1

  async function post(body: unknown): Promise<unknown> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
      let json: unknown
      try {
        json = await res.json()
      } catch {
        throw new RpcError(`HTTP ${res.status}`, undefined, res.status)
      }
      if (!res.ok && !Array.isArray(json)) {
        const msg = (json as RpcOutcome)?.error?.message
        throw new RpcError(msg ? `HTTP ${res.status}: ${msg}` : `HTTP ${res.status}`, (json as RpcOutcome)?.error?.code, res.status)
      }
      return json
    } catch (e) {
      if (e instanceof RpcError) throw e
      if (ctrl.signal.aborted) throw new RpcError('timeout')
      throw new RpcError('network error')
    } finally {
      clearTimeout(timer)
    }
  }

  async function batch(calls: RpcCall[]): Promise<RpcOutcome[]> {
    if (calls.length === 0) return []
    const ids = calls.map(() => nextId++)
    const json = await post(calls.map((c, i) => ({ jsonrpc: '2.0', id: ids[i], method: c.method, params: c.params })))
    if (!Array.isArray(json)) {
      const err = (json as RpcOutcome)?.error
      throw new RpcError(err?.message ?? 'bad batch response', err?.code)
    }
    const byId = new Map<number, RpcOutcome>()
    for (const item of json as Array<RpcOutcome & { id: number }>) byId.set(item.id, item)
    return ids.map((id) => byId.get(id) ?? { error: { code: -1, message: 'missing in batch response' } })
  }

  async function call<T>(method: string, params: unknown[]): Promise<T> {
    const json = (await post({ jsonrpc: '2.0', id: nextId++, method, params })) as RpcOutcome
    if (json?.error) throw new RpcError(json.error.message, json.error.code)
    if (!json || !('result' in json)) throw new RpcError('empty response')
    return json.result as T
  }

  return { url, call, batch }
}
