<script setup lang="ts">
import { computed, ref } from 'vue'
import { clockTime, explorerUrl, formatInt, fullTime, seconds, shortAddress, timeAgo } from './lib/format'
import { FEED_LIMIT, type FeedItem } from './lib/feed'
import { NETWORKS, NETWORK_IDS, type NetworkId } from './lib/networks'
import type { WatchStatus } from './lib/watcher'
import { useFeed } from './useFeed'

const { items, status, rpcHosts, now } = useFeed()

type Filter = 'all' | NetworkId
const filter = ref<Filter>('all')
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...NETWORK_IDS.map((id) => ({ id, label: NETWORKS[id].name })),
]

const shown = computed(() => (filter.value === 'all' ? items.value : items.value.filter((i) => i.network === filter.value)))
const hosts = computed(() => [...new Set(Object.values(rpcHosts).filter(Boolean))].join(' and '))

/** A pair seen live stays marked as new this long. */
const FRESH_MS = 30_000
const isFresh = (it: FeedItem) => it.arrivedAt !== undefined && now.value - it.arrivedAt < FRESH_MS

function statusText(s: WatchStatus): string {
  switch (s.state) {
    case 'live':
      return s.head === undefined ? 'live' : `live · block ${formatInt(s.head)}`
    case 'retrying':
      return `node not answering, retry in ${seconds((s.retryAt ?? now.value) - now.value)}`
    case 'stopped':
      return 'stopped'
    default:
      return 'connecting…'
  }
}
</script>

<template>
  <div class="page">
    <header class="top">
      <div class="brand">
        <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="12" cy="16" r="9" />
          <circle cx="20" cy="16" r="9" />
        </svg>
        <h1>Last coins</h1>
      </div>
      <p class="lede">
        New trading pairs, the moment they are created on PancakeSwap (BNB Smart Chain) and Uniswap
        (Ethereum), read straight from the chain.
      </p>
      <ul class="status" aria-label="Connection">
        <li v-for="id in NETWORK_IDS" :key="id" :class="['conn', status[id].state]" :title="status[id].error">
          <span class="dot" aria-hidden="true" />
          <strong>{{ NETWORKS[id].short }}</strong>
          <span class="conn-text">{{ statusText(status[id]) }}</span>
        </li>
      </ul>
    </header>

    <aside class="warn" role="note">
      <strong>Look, don't touch.</strong>
      Nearly every token on this list is a scam, a honeypot or somebody's experiment. This page only shows what
      the factory contracts announce: it is not advice, and it has no buy links.
    </aside>

    <div class="toolbar">
      <div class="seg" role="group" aria-label="Show network">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          :aria-pressed="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }}
        </button>
      </div>
      <span class="count">{{ shown.length }} pairs · newest {{ FEED_LIMIT }} kept</span>
    </div>

    <ol v-if="shown.length" class="feed">
      <li v-for="it in shown" :key="it.key" :class="['item', { fresh: isFresh(it) }]">
        <span :class="['net', it.network]" :title="`${NETWORKS[it.network].name}, ${NETWORKS[it.network].dex}`">
          {{ NETWORKS[it.network].short }}
        </span>

        <div class="what">
          <div class="pairline">
            <span class="sym" :class="{ missing: !it.coin.symbol }">{{ it.coin.symbol ?? 'unknown' }}</span>
            <span class="slash" aria-label="paired with">/</span>
            <span class="base">{{ it.base.symbol ?? shortAddress(it.base.address) }}</span>
            <span
              v-if="it.lookalike"
              class="tag bad"
              title="Uses the symbol of a famous token, but it is a different contract"
            >lookalike</span>
            <span v-if="isFresh(it)" class="tag new">new</span>
          </div>
          <div class="name">
            <span class="coin-name">{{ it.coin.name ?? 'name not readable' }}</span>
            <span class="addr">{{ shortAddress(it.coin.address) }}</span>
            <span class="idx">pair #{{ formatInt(it.index) }}</span>
          </div>
        </div>

        <div class="when">
          <template v-if="it.timestamp">
            <time :datetime="new Date(it.timestamp * 1000).toISOString()" :title="fullTime(it.timestamp)">{{
              timeAgo(it.timestamp, now)
            }}</time>
            <span class="clock">{{ clockTime(it.timestamp) }}</span>
          </template>
        </div>

        <nav class="links" :aria-label="`Explorer links for ${it.coin.symbol ?? 'this pair'}`">
          <a :href="explorerUrl(NETWORKS[it.network], 'token', it.coin.address)" target="_blank" rel="noopener noreferrer">Token</a>
          <a :href="explorerUrl(NETWORKS[it.network], 'address', it.pair)" target="_blank" rel="noopener noreferrer">Pair</a>
          <a :href="explorerUrl(NETWORKS[it.network], 'tx', it.txHash)" target="_blank" rel="noopener noreferrer">Tx</a>
        </nav>
      </li>
    </ol>

    <p v-else class="empty">Waiting for the first new pair…</p>

    <footer class="foot">
      <p>
        Reads the <code>PairCreated</code> events of the PancakeSwap v2 and Uniswap v2 factories with
        <code>eth_getLogs</code> from public nodes<template v-if="hosts"> ({{ hosts }})</template>, and token names
        with <code>eth_call</code>. No keys, no cookies, nothing stored. Links go to BscScan and Etherscan.
      </p>
      <p><a href="https://github.com/RR2000/last-coins" rel="noopener noreferrer">Source on GitHub</a></p>
    </footer>
  </div>
</template>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.top {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 30px;
  height: 30px;
  flex: none;
}

.logo circle {
  fill: none;
  stroke-width: 2.5;
}

.logo circle:first-child {
  stroke: var(--bsc-fg);
}

.logo circle:last-child {
  stroke: var(--eth-fg);
}

h1 {
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: -0.01em;
}

.lede {
  margin: 0;
  color: var(--muted);
  max-width: 62ch;
}

.status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.conn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.85rem;
}

.conn-text {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--idle);
  flex: none;
}

.conn.live .dot {
  background: var(--live);
}

.conn.retrying .dot {
  background: transparent;
  border: 2px solid var(--retry);
}

.conn.connecting .dot {
  animation: pulse 1.2s ease-in-out infinite;
}

.warn {
  margin: 0 0 18px;
  padding: 12px 14px;
  border: 1px solid var(--warn-border);
  border-left-width: 4px;
  border-radius: var(--radius);
  background: var(--warn-bg);
  color: var(--warn-fg);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.seg {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}

.seg button {
  font: inherit;
  font-size: 0.9rem;
  padding: 6px 12px;
  border: 0;
  border-right: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.seg button:last-child {
  border-right: 0;
}

.seg button[aria-pressed='true'] {
  background: var(--chip);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--focus);
}

.count {
  color: var(--muted);
  font-size: 0.85rem;
}

.feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.item {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr) 6.5rem auto;
  grid-template-areas: 'net what when links';
  align-items: center;
  gap: 4px 14px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.item.fresh {
  animation: arrive 1.6s ease-out;
}

.net {
  grid-area: net;
  justify-self: start;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.net.bsc {
  color: var(--bsc-fg);
  background: var(--bsc-bg);
}

.net.eth {
  color: var(--eth-fg);
  background: var(--eth-bg);
}

.what {
  grid-area: what;
  min-width: 0;
}

.pairline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
  min-width: 0;
}

.sym {
  font-weight: 700;
  font-size: 1.05rem;
  overflow-wrap: anywhere;
  min-width: 0;
}

.sym.missing {
  color: var(--muted);
  font-style: italic;
  font-weight: 600;
}

.slash,
.base {
  color: var(--muted);
}

.base {
  font-weight: 600;
}

.tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 5px;
}

.tag.bad {
  color: var(--bad-fg);
  background: var(--bad-bg);
}

.tag.new {
  color: var(--fresh-fg);
  background: var(--fresh);
}

.name {
  display: flex;
  flex-wrap: wrap;
  gap: 0 10px;
  color: var(--muted);
  font-size: 0.85rem;
  min-width: 0;
}

.coin-name {
  overflow-wrap: anywhere;
  min-width: 0;
}

.addr,
.idx {
  font-family: var(--mono);
  font-size: 0.8rem;
  white-space: nowrap;
}

.when {
  grid-area: when;
  display: grid;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.when time {
  font-size: 0.9rem;
}

.clock {
  color: var(--muted);
  font-size: 0.78rem;
  font-family: var(--mono);
}

.links {
  grid-area: links;
  display: flex;
  gap: 6px;
}

.links a {
  padding: 4px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.82rem;
  text-decoration: none;
  white-space: nowrap;
}

.links a:hover {
  background: var(--chip);
}

.empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.foot {
  margin-top: 28px;
  color: var(--muted);
  font-size: 0.85rem;
}

.foot p {
  margin: 6px 0;
}

code {
  font-family: var(--mono);
  font-size: 0.9em;
}

@media (max-width: 640px) {
  .page {
    padding-top: 16px;
  }

  .item {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'net what when'
      'links links links';
    align-items: start;
    gap: 8px 10px;
    padding: 10px 12px;
  }

  .net {
    margin-top: 3px;
  }

  .links a {
    flex: 1;
    text-align: center;
    padding: 6px 0;
  }
}

@keyframes arrive {
  from {
    background: var(--fresh);
  }
  to {
    background: var(--surface);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .item.fresh,
  .conn.connecting .dot {
    animation: none;
  }
}
</style>
