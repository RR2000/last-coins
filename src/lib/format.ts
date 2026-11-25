import type { Network } from './networks'

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

/** "just now", "42 s ago", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(unixSeconds: number, nowMs: number): string {
  const s = Math.max(0, Math.floor(nowMs / 1000 - unixSeconds))
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const full = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'long' })

export function clockTime(unixSeconds: number): string {
  return clock.format(new Date(unixSeconds * 1000))
}

export function fullTime(unixSeconds: number): string {
  return full.format(new Date(unixSeconds * 1000))
}

const int = new Intl.NumberFormat('en-US')

export function formatInt(n: number): string {
  return int.format(n)
}

export function explorerUrl(net: Network, kind: 'address' | 'token' | 'tx', value: string): string {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error('not a hex value')
  return `${net.explorer}/${kind}/${value.toLowerCase()}`
}

export function seconds(ms: number): string {
  return `${Math.max(0, Math.ceil(ms / 1000))} s`
}
