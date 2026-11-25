import { describe, expect, it } from 'vitest'
import { SELECTOR, type PairEvent } from './abi'
import { NETWORKS, type Network } from './networks'
import { createRpc, RpcError, type Rpc, type RpcCall } from './rpc'
import { createTokenReader } from './tokens'
import { abiString, pairLog } from './testutil'
import { backoffMs, Watcher, type WatchStatus } from './watcher'

const NET: Network = { ...NETWORKS.bsc, backfillBlocks: 100, maxRange: 40, lag: 0 }
const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const A = '0x1111111111111111111111111111111111111111'
const PAIR = '0x2222222222222222222222222222222222222222'

/** A pretend node: a head, logs at some blocks, and a log of the ranges it was asked for. */
function fakeNode(opts: { head: number; logsAt?: number[]; withTimestamp?: boolean }) {
  const ranges: [number, number][] = []
  let failNext = 0
  const node = {
    head: opts.head,
    ranges,
    failTimes: (n: number) => (failNext = n),
    rpc: {
      url: 'fake',
      async call<T>(method: string, params: unknown[]): Promise<T> {
        if (failNext > 0) {
          failNext--
          throw new RpcError('HTTP 429', undefined, 429)
        }
        if (method === 'eth_blockNumber') return ('0x' + node.head.toString(16)) as T
        if (method === 'eth_getLogs') {
          const f = params[0] as { fromBlock: string; toBlock: string }
          const from = parseInt(f.fromBlock, 16)
          const to = parseInt(f.toBlock, 16)
          ranges.push([from, to])
          return (opts.logsAt ?? [])
            .filter((b) => b >= from && b <= to)
            .map((b) => pairLog({ token0: A, token1: WBNB, pair: PAIR, index: b, block: b, tx: '0x' + b.toString(16).padStart(64, '0'), ts: opts.withTimestamp === false ? undefined : 1000 + b })) as T
        }
        throw new Error('unexpected ' + method)
      },
      async batch(calls: RpcCall[]) {
        return calls.map((c) => ({ result: { timestamp: '0x' + (5000 + parseInt(c.params[0] as string, 16)).toString(16) } }))
      },
    } satisfies Rpc,
  }
  return node
}

function watch(node: ReturnType<typeof fakeNode>, net = NET) {
  const events: PairEvent[] = []
  const statuses: WatchStatus[] = []
  const timers: { fn: () => void; ms: number }[] = []
  const w = new Watcher(net, {
    rpc: node.rpc,
    onPairs: (e) => events.push(...e),
    onStatus: (s) => statuses.push(s),
    now: () => 1_000_000,
    schedule: (fn, ms) => timers.push({ fn, ms }),
    cancel: () => {},
  })
  return { w, events, statuses, timers }
}

describe('Watcher', () => {
  it('looks back on start in block ranges, then follows the head', async () => {
    const node = fakeNode({ head: 1000, logsAt: [905, 950, 1000, 1003] })
    const { w, events, statuses } = watch(node)
    await w.tick()
    expect(node.ranges).toEqual([[901, 940], [941, 980], [981, 1000]])
    expect(events.map((e) => e.blockNumber)).toEqual([905, 950, 1000])
    expect(statuses.at(-1)).toEqual({ state: 'live', head: 1000 })

    node.head = 1003
    await w.tick()
    expect(node.ranges.at(-1)).toEqual([1001, 1003])
    expect(events.map((e) => e.blockNumber)).toEqual([905, 950, 1000, 1003])

    await w.tick() // no new block: no getLogs
    expect(node.ranges).toHaveLength(4)
  })

  it('stays behind the head by `lag` blocks', async () => {
    const node = fakeNode({ head: 1000 })
    const { w } = watch(node, { ...NET, lag: 2 })
    await w.tick()
    expect(node.ranges.at(-1)?.[1]).toBe(998)
  })

  it('skips a long gap instead of reading hours of blocks', async () => {
    const node = fakeNode({ head: 1000 })
    const { w } = watch(node)
    await w.tick()
    node.head = 50_000
    await w.tick()
    expect(node.ranges.at(-3)?.[0]).toBe(49_901)
  })

  it('never goes back when a node behind the balancer reports an older head', async () => {
    const node = fakeNode({ head: 1000 })
    const { w, statuses } = watch(node)
    await w.tick()
    node.head = 990
    await w.tick()
    expect(w.next).toBe(1001)
    expect(statuses.at(-1)).toEqual({ state: 'live', head: 1000 })
  })

  it('reads the block time when the log has none', async () => {
    const node = fakeNode({ head: 1000, logsAt: [990], withTimestamp: false })
    const { w, events } = watch(node)
    await w.tick()
    expect(events[0].timestamp).toBe(5990)
  })

  it('retries with growing waits and continues where it stopped', async () => {
    const node = fakeNode({ head: 1000, logsAt: [999] })
    const { w, events, statuses, timers } = watch(node)
    node.failTimes(2)
    w.start()
    await new Promise((r) => setTimeout(r, 0))
    expect(statuses.map((s) => s.state)).toEqual(['connecting', 'retrying'])
    expect(statuses[1]).toMatchObject({ retryAt: 1_000_000 + 2_000, error: 'HTTP 429' })
    expect(timers.at(-1)?.ms).toBe(2_000)

    timers.at(-1)!.fn()
    await new Promise((r) => setTimeout(r, 0))
    expect(timers.at(-1)?.ms).toBe(4_000)

    timers.at(-1)!.fn()
    await new Promise((r) => setTimeout(r, 0))
    expect(statuses.at(-1)?.state).toBe('live')
    expect(timers.at(-1)?.ms).toBe(NET.pollMs)
    expect(events).toHaveLength(1)
    w.stop()
    expect(statuses.at(-1)?.state).toBe('stopped')
  })

  it('backs off up to a minute', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(backoffMs)).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000])
  })
})

describe('rpc and tokens', () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  it('maps batch answers back by id, in any order', async () => {
    const rpc = createRpc('https://node.example', {
      fetch: async (_u, init) => {
        const req = JSON.parse(init.body as string) as { id: number }[]
        return jsonResponse([...req].reverse().map((r) => ({ jsonrpc: '2.0', id: r.id, result: 'r' + r.id })))
      },
    })
    const out = await rpc.batch([{ method: 'a', params: [] }, { method: 'b', params: [] }])
    expect(out.map((o) => o.result)).toEqual(['r1', 'r2'])
  })

  it('turns HTTP and JSON-RPC errors into RpcError', async () => {
    const rate = createRpc('https://node.example', { fetch: async () => jsonResponse({ error: { code: -32005, message: 'rate limited' } }, 429) })
    await expect(rate.call('eth_blockNumber', [])).rejects.toMatchObject({ name: 'RpcError', status: 429 })
    const html = createRpc('https://node.example', { fetch: async () => new Response('<html>', { status: 502 }) })
    await expect(html.call('eth_blockNumber', [])).rejects.toThrow('HTTP 502')
    const down = createRpc('https://node.example', { fetch: async () => { throw new TypeError('Failed to fetch') } })
    await expect(down.call('eth_blockNumber', [])).rejects.toThrow('network error')
  })

  it('reads name and symbol, survives reverts, and skips known quote tokens', async () => {
    const calls: RpcCall[] = []
    const rpc: Rpc = {
      url: 'fake',
      call: async () => { throw new Error('not used') },
      batch: async (cs) => {
        calls.push(...cs)
        return cs.map((c) => {
          const { to, data } = c.params[0] as { to: string; data: string }
          if (to === A) return { result: abiString(data === SELECTOR.name ? 'Frog Coin' : 'FROG') }
          return { error: { code: 3, message: 'execution reverted' } }
        })
      },
    }
    const read = createTokenReader(rpc, NETWORKS.bsc.quoteTokens)
    const BAD = '0x' + '4'.repeat(40)
    const res = await read([A, WBNB, BAD])
    expect(res.get(A)).toEqual({ address: A, name: 'Frog Coin', symbol: 'FROG', known: false })
    expect(res.get(WBNB)).toMatchObject({ symbol: 'WBNB', known: true })
    expect(res.get(BAD)).toMatchObject({ symbol: null, name: null })
    expect(calls).toHaveLength(4) // WBNB never asked

    await read([A])
    expect(calls).toHaveLength(4) // cached
    await read([BAD])
    expect(calls).toHaveLength(6) // failures are tried again
  })
})
