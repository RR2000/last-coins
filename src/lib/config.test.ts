import { describe, expect, it } from 'vitest'
import { parseConfig, validRpcUrl } from './config'

describe('config', () => {
  it('accepts HTTPS endpoints and local nodes only', () => {
    expect(validRpcUrl('https://bsc-rpc.publicnode.com/')).toBe('https://bsc-rpc.publicnode.com')
    expect(validRpcUrl(' https://node.example/path ')).toBe('https://node.example/path')
    expect(validRpcUrl('http://127.0.0.1:8545')).toBe('http://127.0.0.1:8545')
    expect(validRpcUrl('http://node.example')).toBeUndefined()
    expect(validRpcUrl('javascript:alert(1)')).toBeUndefined()
    expect(validRpcUrl('')).toBeUndefined()
    expect(validRpcUrl(42)).toBeUndefined()
  })

  it('reads overrides and ignores the rest', () => {
    expect(parseConfig({ rpc: { bsc: 'https://a.example', eth: 'ftp://b', sol: 'https://c' } })).toEqual({ bsc: 'https://a.example' })
    expect(parseConfig({ rpc: { bsc: '', eth: '' } })).toEqual({})
    expect(parseConfig(null)).toEqual({})
    expect(parseConfig('x')).toEqual({})
  })
})
