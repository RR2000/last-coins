import { describe as group, expect, it } from 'vitest'
import { decodePairCreated, type PairEvent } from './abi'
import { describe, FEED_LIMIT, mergeFeed, type FeedItem } from './feed'
import { pairLog } from './testutil'
import type { TokenInfo } from './tokens'

const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const A = '0x1111111111111111111111111111111111111111'
const FAKE_USDT = '0x3333333333333333333333333333333333333333'
const PAIR = '0x2222222222222222222222222222222222222222'

const tok = (address: string, symbol: string | null, known = false): TokenInfo => ({ address, symbol, name: null, known })

type EvOpts = Partial<{ t0: string; t1: string; block: number; logIndex: number; ts: number; tx: string }>
const ev = (o: EvOpts = {}): PairEvent =>
  decodePairCreated(
    pairLog({ token0: o.t0 ?? A, token1: o.t1 ?? WBNB, pair: PAIR, index: 1, block: o.block ?? 1, logIndex: o.logIndex, ts: o.ts ?? 100, tx: o.tx }),
    'bsc',
  )!
const txOf = (n: number) => '0x' + n.toString(16).padStart(64, '0')

group('describe', () => {
  const tokens = new Map([
    [WBNB, tok(WBNB, 'WBNB', true)],
    [A, tok(A, 'FROG')],
    [FAKE_USDT, tok(FAKE_USDT, 'USDT')],
  ])

  it('puts the new token first, whatever side it is on', () => {
    expect(describe(ev({ t0: A, t1: WBNB }), tokens).coin.symbol).toBe('FROG')
    const flipped = describe(ev({ t0: WBNB, t1: A }), tokens)
    expect(flipped.coin.symbol).toBe('FROG')
    expect(flipped.base.symbol).toBe('WBNB')
  })

  it('flags a fake famous symbol', () => {
    expect(describe(ev({ t0: FAKE_USDT }), tokens).lookalike).toBe(true)
    expect(describe(ev({ t0: A }), tokens).lookalike).toBe(false)
  })

  it('copes with tokens it could not read', () => {
    const item = describe(ev({ t0: '0x' + '9'.repeat(40) }), tokens)
    expect(item.coin.symbol).toBeNull()
    expect(item.lookalike).toBe(false)
  })
})

group('mergeFeed', () => {
  const item = (o: EvOpts): FeedItem => describe(ev(o), new Map())

  it('keeps the newest first and drops duplicates', () => {
    const one = item({ block: 1, ts: 100, tx: txOf(1) })
    const two = item({ block: 2, ts: 103, tx: txOf(2) })
    const three = item({ block: 2, ts: 103, logIndex: 5, tx: txOf(2) })
    const list = mergeFeed(mergeFeed([], [one, two]), [two, three, one, three])
    expect(list.map((i) => i.key)).toEqual([three.key, two.key, one.key])
  })

  it('never keeps more than the limit', () => {
    const many = Array.from({ length: 250 }, (_, i) => item({ block: i, ts: i, tx: txOf(i) }))
    const list = mergeFeed([], many)
    expect(list).toHaveLength(FEED_LIMIT)
    expect(list[0].blockNumber).toBe(249)
    expect(mergeFeed(list, [item({ block: 0, ts: 0, tx: txOf(9999) })])).toHaveLength(FEED_LIMIT)
  })

  it('returns the same array when nothing is new', () => {
    const list = mergeFeed([], [item({})])
    expect(mergeFeed(list, [item({})])).toBe(list)
  })
})
