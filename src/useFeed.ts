import { onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { loadConfig } from './lib/config'
import { describe, mergeFeed, type FeedItem } from './lib/feed'
import { NETWORKS, NETWORK_IDS, type NetworkId } from './lib/networks'
import { createRpc } from './lib/rpc'
import { createTokenReader } from './lib/tokens'
import { Watcher, type WatchStatus } from './lib/watcher'

/** Starts one watcher per network and exposes the merged list and each connection's state. */
export function useFeed() {
  const items = shallowRef<FeedItem[]>([])
  const status = reactive<Record<NetworkId, WatchStatus>>({ bsc: { state: 'connecting' }, eth: { state: 'connecting' } })
  const rpcHosts = reactive<Record<NetworkId, string>>({ bsc: '', eth: '' })
  const now = ref(Date.now())
  const watchers: Watcher[] = []
  let clock: ReturnType<typeof setInterval> | undefined

  const kickAll = () => watchers.forEach((w) => w.kick())
  const onVisible = () => { if (document.visibilityState === 'visible') kickAll() }

  onMounted(async () => {
    clock = setInterval(() => (now.value = Date.now()), 1_000)
    window.addEventListener('online', kickAll)
    document.addEventListener('visibilitychange', onVisible)
    const overrides = await loadConfig()
    for (const id of NETWORK_IDS) {
      const net = NETWORKS[id]
      const rpc = createRpc(overrides[id] ?? net.rpc)
      rpcHosts[id] = new URL(rpc.url).host
      const readTokens = createTokenReader(rpc, net.quoteTokens)
      // pairs found while catching up on start are history; after the first live round they are news
      let caughtUp = false
      const w = new Watcher(net, {
        rpc,
        onStatus: (s) => {
          status[id] = s
          if (s.state === 'live') caughtUp = true
        },
        onPairs: async (events) => {
          const arrivedAt = caughtUp ? Date.now() : undefined
          const tokens = await readTokens(events.flatMap((e) => [e.token0, e.token1]))
          items.value = mergeFeed(items.value, events.map((e) => ({ ...describe(e, tokens), arrivedAt })))
        },
      })
      watchers.push(w)
      w.start()
    }
  })

  onBeforeUnmount(() => {
    watchers.forEach((w) => w.stop())
    clearInterval(clock)
    window.removeEventListener('online', kickAll)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { items, status, rpcHosts, now }
}
