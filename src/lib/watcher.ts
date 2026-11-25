import { PAIR_CREATED_TOPIC, decodePairCreated, hexToNumber, numberToHex, type PairEvent, type RpcLog } from './abi'
import type { Network } from './networks'
import type { Rpc } from './rpc'

export type WatchState = 'connecting' | 'live' | 'retrying' | 'stopped'

export interface WatchStatus {
  state: WatchState
  /** Last block the watcher has read up to. */
  head?: number
  /** When the next attempt starts (ms since epoch), while retrying. */
  retryAt?: number
  error?: string
}

export interface WatcherDeps {
  rpc: Rpc
  onPairs: (events: PairEvent[]) => void
  onStatus: (status: WatchStatus) => void
  now?: () => number
  schedule?: (fn: () => void, ms: number) => unknown
  cancel?: (handle: unknown) => void
}

const MAX_BACKOFF_MS = 60_000

/** 2 s, 4 s, 8 s ... up to a minute. */
export function backoffMs(failures: number): number {
  return Math.min(MAX_BACKOFF_MS, 2_000 * 2 ** Math.max(0, failures - 1))
}

/**
 * Polls one factory with eth_getLogs, block range after block range. Plain HTTP polling instead of a
 * websocket subscription: it survives sleeping tabs, flaky mobile networks and public nodes that drop
 * subscriptions, and on reconnect it simply continues from the last block it read.
 */
export class Watcher {
  /** First block not read yet. */
  next?: number
  failures = 0
  private running = false
  private busy = false
  private timer: unknown

  private readonly now: () => number
  private readonly schedule: (fn: () => void, ms: number) => unknown
  private readonly cancel: (handle: unknown) => void

  constructor(
    readonly network: Network,
    private readonly deps: WatcherDeps,
  ) {
    this.now = deps.now ?? Date.now
    this.schedule = deps.schedule ?? ((fn, ms) => setTimeout(fn, ms))
    this.cancel = deps.cancel ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.deps.onStatus({ state: 'connecting' })
    void this.run()
  }

  stop(): void {
    this.running = false
    this.cancel(this.timer)
    this.deps.onStatus({ state: 'stopped', head: this.next === undefined ? undefined : this.next - 1 })
  }

  /** Try now instead of waiting (network back online, tab visible again). */
  kick(): void {
    if (!this.running || this.busy) return
    this.cancel(this.timer)
    void this.run()
  }

  private async run(): Promise<void> {
    if (!this.running || this.busy) return
    this.busy = true
    let delay: number
    try {
      await this.tick()
      this.failures = 0
      delay = this.network.pollMs
    } catch (e) {
      this.failures++
      delay = backoffMs(this.failures)
      this.deps.onStatus({
        state: 'retrying',
        head: this.next === undefined ? undefined : this.next - 1,
        retryAt: this.now() + delay,
        error: e instanceof Error ? e.message : String(e),
      })
    } finally {
      this.busy = false
    }
    if (this.running) this.timer = this.schedule(() => void this.run(), delay)
  }

  /** One round: read the head, then every block range up to it. */
  async tick(): Promise<void> {
    const { rpc } = this.deps
    const net = this.network
    const head = hexToNumber(await rpc.call<string>('eth_blockNumber', [])) - net.lag
    let from = this.next ?? head - net.backfillBlocks + 1
    // a long pause (sleeping laptop, background tab): skip the gap instead of reading hours of blocks
    if (head - from + 1 > net.backfillBlocks) from = head - net.backfillBlocks + 1
    from = Math.max(0, from)
    while (from <= head) {
      const to = Math.min(head, from + net.maxRange - 1)
      const logs = await rpc.call<RpcLog[]>('eth_getLogs', [
        { address: net.factory, topics: [PAIR_CREATED_TOPIC], fromBlock: numberToHex(from), toBlock: numberToHex(to) },
      ])
      const events = (Array.isArray(logs) ? logs : [])
        .map((l) => decodePairCreated(l, net.id))
        .filter((e): e is PairEvent => e !== null)
      await this.fillTimestamps(events)
      this.next = to + 1
      if (events.length) this.deps.onPairs(events)
      from = to + 1
    }
    // a node behind the previous one (load balancers) never moves the cursor back
    this.next = Math.max(this.next ?? 0, head + 1)
    this.deps.onStatus({ state: 'live', head: this.next - 1 })
  }

  /** Older nodes do not put blockTimestamp in the log: read it from the block header. */
  private async fillTimestamps(events: PairEvent[]): Promise<void> {
    const missing = [...new Set(events.filter((e) => e.timestamp === undefined).map((e) => e.blockNumber))]
    if (!missing.length) return
    const out = await this.deps.rpc.batch(
      missing.map((b) => ({ method: 'eth_getBlockByNumber', params: [numberToHex(b), false] })),
    )
    const ts = new Map<number, number>()
    missing.forEach((b, i) => {
      const t = (out[i]?.result as { timestamp?: string } | null)?.timestamp
      if (t) ts.set(b, hexToNumber(t))
    })
    for (const e of events) if (e.timestamp === undefined) e.timestamp = ts.get(e.blockNumber) ?? Math.floor(this.now() / 1000)
  }
}
