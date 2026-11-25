import { describe, expect, it } from 'vitest'
import { cleanText, decodeAbiText, decodePairCreated, hexToNumber, MAX_TEXT, wordToAddress } from './abi'
import { abiString, bytes32, pairLog, word } from './testutil'

const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const COIN = '0x1111111111111111111111111111111111111111'
const PAIR = '0x2222222222222222222222222222222222222222'

describe('decodePairCreated', () => {
  it('reads tokens, pair, index, block and time', () => {
    const log = pairLog({ token0: COIN, token1: '0xBB4CDB9CBD36B01BD1CBAEBF2DE08D9173BC095C', pair: PAIR, index: 1_876_543, block: 135_698_221, logIndex: 7, ts: 1_764_000_000 })
    const ev = decodePairCreated(log, 'bsc')
    expect(ev).toMatchObject({
      network: 'bsc',
      token0: COIN,
      token1: WBNB,
      pair: PAIR,
      index: 1_876_543,
      blockNumber: 135_698_221,
      logIndex: 7,
      timestamp: 1_764_000_000,
    })
    expect(ev?.key).toBe(`bsc:0x${'ab'.repeat(32)}:7`)
  })

  it('leaves the time empty when the node does not send it', () => {
    const ev = decodePairCreated(pairLog({ token0: COIN, token1: WBNB, pair: PAIR, index: 1, block: 1 }), 'eth')
    expect(ev?.timestamp).toBeUndefined()
  })

  it('ignores other events, removed logs and broken data', () => {
    const ok = pairLog({ token0: COIN, token1: WBNB, pair: PAIR, index: 1, block: 1 })
    expect(decodePairCreated({ ...ok, topics: ['0x' + word('1'), ...ok.topics.slice(1)] }, 'bsc')).toBeNull()
    expect(decodePairCreated({ ...ok, topics: ok.topics.slice(0, 2) }, 'bsc')).toBeNull()
    expect(decodePairCreated({ ...ok, removed: true }, 'bsc')).toBeNull()
    expect(decodePairCreated({ ...ok, data: '0x1234' }, 'bsc')).toBeNull()
    expect(decodePairCreated({ ...ok, blockNumber: 'zz' }, 'bsc')).toBeNull()
  })
})

describe('decodeAbiText', () => {
  it('decodes an ABI string', () => {
    expect(decodeAbiText(abiString('Pepe Coin'))).toBe('Pepe Coin')
    expect(decodeAbiText(abiString('🐸 frog'))).toBe('🐸 frog')
    expect(decodeAbiText(abiString('a'.repeat(40)))).toBe('a'.repeat(40))
  })

  it('decodes a bytes32 symbol (old tokens like MKR)', () => {
    expect(decodeAbiText(bytes32('MKR'))).toBe('MKR')
  })

  it('returns null for empty, reverted or malformed returns', () => {
    expect(decodeAbiText('0x')).toBeNull()
    expect(decodeAbiText(undefined)).toBeNull()
    expect(decodeAbiText('0x' + '0'.repeat(64))).toBeNull()
    expect(decodeAbiText(abiString(''))).toBeNull()
    expect(decodeAbiText('0x' + word('20') + word('ff'))).toBeNull() // length beyond the data
    expect(decodeAbiText('0x' + word('1000') + word('1'))).toBeNull() // offset beyond the data
    expect(decodeAbiText('not hex')).toBeNull()
  })

  it('strips control characters, bidi overrides and zero-width spaces', () => {
    const tricky = 'Tether' + String.fromCharCode(0x202e) + ' USD' + String.fromCharCode(0x200b, 10, 9)
    expect(decodeAbiText(abiString(tricky))).toBe('Tether USD')
  })
})

describe('cleanText', () => {
  it('caps the length', () => {
    const t = cleanText('x'.repeat(500))!
    expect(Array.from(t)).toHaveLength(MAX_TEXT)
    expect(t.endsWith('…')).toBe(true)
  })

  it('keeps markup as plain text (the page escapes it)', () => {
    expect(cleanText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })

  it('returns null when nothing readable is left', () => {
    expect(cleanText('   ')).toBeNull()
    expect(cleanText(String.fromCharCode(0, 1, 2))).toBeNull()
  })
})

describe('hex helpers', () => {
  it('converts quantities and words', () => {
    expect(hexToNumber('0x816982d')).toBe(135_698_477)
    expect(() => hexToNumber('0x')).toThrow()
    expect(() => hexToNumber('0x' + 'f'.repeat(20))).toThrow()
    expect(wordToAddress('0x' + word(PAIR))).toBe(PAIR)
    expect(() => wordToAddress('0x1234')).toThrow()
  })
})
