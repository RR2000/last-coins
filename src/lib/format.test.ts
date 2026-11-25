import { describe, expect, it } from 'vitest'
import { explorerUrl, formatInt, seconds, shortAddress, timeAgo } from './format'
import { NETWORKS } from './networks'

describe('format', () => {
  it('shortens addresses', () => {
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678')
    expect(shortAddress('0x12')).toBe('0x12')
  })

  it('says how long ago', () => {
    const now = 1_764_000_000_000
    const t = now / 1000
    expect(timeAgo(t, now)).toBe('just now')
    expect(timeAgo(t + 30, now)).toBe('just now') // node clock slightly ahead
    expect(timeAgo(t - 42, now)).toBe('42 s ago')
    expect(timeAgo(t - 5 * 60, now)).toBe('5 min ago')
    expect(timeAgo(t - 3 * 3600 - 10, now)).toBe('3 h ago')
    expect(timeAgo(t - 2 * 86400, now)).toBe('2 d ago')
  })

  it('formats numbers and countdowns', () => {
    expect(formatInt(135698221)).toBe('135,698,221')
    expect(seconds(7100)).toBe('8 s')
    expect(seconds(-5)).toBe('0 s')
  })

  it('builds explorer links and nothing else', () => {
    expect(explorerUrl(NETWORKS.bsc, 'token', '0xABCDEF')).toBe('https://bscscan.com/token/0xabcdef')
    expect(explorerUrl(NETWORKS.eth, 'tx', '0x01')).toBe('https://etherscan.io/tx/0x01')
    expect(() => explorerUrl(NETWORKS.eth, 'address', 'javascript:alert(1)')).toThrow()
  })
})
