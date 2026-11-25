import { PAIR_CREATED_TOPIC, type RpcLog } from './abi'

export const word = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0')
export const topicOf = (addr: string) => '0x' + word(addr)

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

/** ABI encoding of a single `string` return value. */
export function abiString(s: string): string {
  const bytes = toHex(new TextEncoder().encode(s))
  const padded = bytes.length ? bytes.padEnd(Math.ceil(bytes.length / 64) * 64, '0') : ''
  return '0x' + word('20') + word((bytes.length / 2).toString(16)) + padded
}

/** A bytes32 return value (old tokens such as MKR). */
export function bytes32(s: string): string {
  return '0x' + toHex(new TextEncoder().encode(s)).padEnd(64, '0')
}

export function pairLog(o: {
  token0: string
  token1: string
  pair: string
  index: number
  block: number
  tx?: string
  logIndex?: number
  ts?: number
}): RpcLog {
  return {
    address: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    topics: [PAIR_CREATED_TOPIC, topicOf(o.token0), topicOf(o.token1)],
    data: '0x' + word(o.pair) + word(o.index.toString(16)),
    blockNumber: '0x' + o.block.toString(16),
    transactionHash: o.tx ?? '0x' + 'ab'.repeat(32),
    logIndex: '0x' + (o.logIndex ?? 0).toString(16),
    blockTimestamp: o.ts === undefined ? undefined : '0x' + o.ts.toString(16),
    removed: false,
  }
}
