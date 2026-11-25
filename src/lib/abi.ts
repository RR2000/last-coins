import type { NetworkId } from './networks'

/** keccak256("PairCreated(address,address,address,uint256)") */
export const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9'

/** Function selectors of the ERC-20 metadata calls. */
export const SELECTOR = { name: '0x06fdde03', symbol: '0x95d89b41' } as const

export interface RpcLog {
  address: string
  topics: string[]
  data: string
  blockNumber: string
  transactionHash: string
  logIndex: string
  blockTimestamp?: string
  removed?: boolean
}

export interface PairEvent {
  key: string
  network: NetworkId
  token0: string
  token1: string
  pair: string
  /** Value of allPairs.length after this pair: the pair's number in the factory. */
  index: number
  blockNumber: number
  txHash: string
  logIndex: number
  /** Unix seconds, when the node sent it with the log. */
  timestamp?: number
}

const HEX = /^0x[0-9a-fA-F]*$/

export function hexToNumber(hex: string): number {
  if (!HEX.test(hex) || hex.length < 3) throw new Error(`not a hex quantity: ${hex}`)
  const n = Number.parseInt(hex.slice(2), 16)
  if (!Number.isSafeInteger(n)) throw new Error(`hex quantity too large: ${hex}`)
  return n
}

export function numberToHex(n: number): string {
  return '0x' + n.toString(16)
}

/** Last 20 bytes of a 32-byte word, lowercase. */
export function wordToAddress(word: string): string {
  const w = word.startsWith('0x') ? word.slice(2) : word
  if (w.length !== 64 || !/^[0-9a-fA-F]+$/.test(w)) throw new Error('not a 32-byte word')
  return ('0x' + w.slice(24)).toLowerCase()
}

/** Decodes a PairCreated log of a Uniswap v2 style factory. Returns null for anything else. */
export function decodePairCreated(log: RpcLog, network: NetworkId): PairEvent | null {
  if (log.removed) return null
  if (!log.topics || log.topics.length !== 3 || log.topics[0]?.toLowerCase() !== PAIR_CREATED_TOPIC) return null
  const data = (log.data ?? '').replace(/^0x/, '')
  if (data.length < 128 || !/^[0-9a-fA-F]+$/.test(data)) return null
  try {
    const blockNumber = hexToNumber(log.blockNumber)
    const logIndex = hexToNumber(log.logIndex)
    const indexBig = BigInt('0x' + data.slice(64, 128))
    return {
      key: `${network}:${log.transactionHash.toLowerCase()}:${logIndex}`,
      network,
      token0: wordToAddress(log.topics[1]),
      token1: wordToAddress(log.topics[2]),
      pair: wordToAddress(data.slice(0, 64)),
      index: indexBig > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(indexBig),
      blockNumber,
      txHash: log.transactionHash.toLowerCase(),
      logIndex,
      timestamp: log.blockTimestamp ? hexToNumber(log.blockTimestamp) : undefined,
    }
  } catch {
    return null
  }
}

const decoder = new TextDecoder('utf-8', { fatal: false })

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** Longest text kept from a token name or symbol. */
export const MAX_TEXT = 64

/**
 * Makes a token name/symbol safe to show: no control characters, no bidi overrides or zero-width tricks,
 * spaces collapsed, length capped. Returns null when nothing readable is left.
 */
export function cleanText(s: string): string | null {
  const cleaned = s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[​-‏‪-‮⁠-⁩﻿�]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  const chars = Array.from(cleaned)
  return chars.length > MAX_TEXT ? chars.slice(0, MAX_TEXT - 1).join('') + '…' : cleaned
}

/**
 * Decodes the return value of name()/symbol(): an ABI `string`, or a `bytes32` for old tokens.
 * Returns null when the data cannot be read as text.
 */
export function decodeAbiText(ret: string | undefined | null): string | null {
  if (!ret || !HEX.test(ret)) return null
  const h = ret.slice(2)
  if (h.length === 64) {
    // bytes32, right-padded with zeros
    const bytes = hexToBytes(h)
    let end = bytes.length
    while (end > 0 && bytes[end - 1] === 0) end--
    return cleanText(decoder.decode(bytes.subarray(0, end)))
  }
  if (h.length < 128 || h.length % 2) return null
  const offset = Number.parseInt(h.slice(0, 64), 16)
  if (!Number.isSafeInteger(offset) || offset % 32 || offset * 2 + 64 > h.length) return null
  const len = Number.parseInt(h.slice(offset * 2, offset * 2 + 64), 16)
  const start = offset * 2 + 64
  if (!Number.isSafeInteger(len) || start + len * 2 > h.length) return null
  return cleanText(decoder.decode(hexToBytes(h.slice(start, start + len * 2))))
}
