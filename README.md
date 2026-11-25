# Last coins

A live list of the trading pairs that are being created right now on PancakeSwap v2 (BNB Smart Chain) and
Uniswap v2 (Ethereum).

Demo: https://coins.raoulrondinella.dev

> Nearly every token that shows up here is a scam, a honeypot or somebody's experiment. This is a window on
> what the chain is doing, not a list of things to buy: there is no advice and there are no buy links.

## How it works

Everything runs in the browser, there is no backend.

- Every few seconds (3 s on BSC, 12 s on Ethereum) the page asks a public JSON-RPC node for the
  `PairCreated` events of the factory contract, with `eth_getLogs` over the blocks it has not read yet.
  On start it looks back a little (about 15 minutes on BSC, a few hours on Ethereum) so the list is not empty.
- Plain HTTP polling rather than a websocket subscription: it keeps working on flaky mobile networks and
  sleeping tabs, and after an error it retries with a growing pause (2 s up to 1 min) and carries on from the
  last block it read.
- For each new token it reads `name()` and `symbol()` with `eth_call` (string or `bytes32`; contracts that
  revert or return garbage are shown as unreadable). Names are cleaned of control characters and
  direction-override tricks and shown as plain text.
- A new token that uses the symbol of a famous one (USDT, WETH, LINK...) is marked as a *lookalike*.
- The list keeps the newest 200 pairs. Links go to BscScan and Etherscan only.

Default nodes, no API key: `https://bsc-rpc.publicnode.com` and `https://ethereum-rpc.publicnode.com`.

## Run it

Node 24:

```bash
npm ci
npm run dev      # http://127.0.0.1:5173
npm test         # unit tests, no network
npm run build    # type check + static build in dist/
```

## Container

A static nginx image. The two node URLs come from the environment and end up both in `/config.json`
(read by the page) and in the `connect-src` of the Content-Security-Policy, so the page cannot talk to anything else.

```bash
docker build -t last-coins .
docker run -p 8080:80 \
  -e BSC_RPC_URL=https://bsc-rpc.publicnode.com \
  -e ETH_RPC_URL=https://ethereum-rpc.publicnode.com \
  last-coins
```

CI runs the tests and the build on every pull request and publishes `ghcr.io/rr2000/last-coins:main` and
`:sha-<commit>` on every push to `main`.

## History

Started in March 2023 as a Vue + web3.js experiment with private node endpoints; rewritten in 2026 without
web3.js and without keys, on public nodes.
