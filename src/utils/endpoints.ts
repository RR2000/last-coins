export enum Endpoint {
  Ferraglia,
  Ganache,
  BSC,
  Ethereum
}

export type EndpointConfig = {
  explorer: string;
  webSocket: string;
}

export function getEndpoint(endpoint: Endpoint): EndpointConfig {
  switch (endpoint) {
    case Endpoint.Ferraglia:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "ws://127.0.0.1:8546"
      }
    case Endpoint.Ganache:
      return {
        explorer: "#",
        webSocket: "ws://127.0.0.1:8546"
      }
    case Endpoint.BSC:
      return {
        explorer: "https://bscscan.com/address/",
        webSocket: "wss://bsc-rpc.publicnode.com"
      }
    case Endpoint.Ethereum:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "wss://ethereum-rpc.publicnode.com"
      }
    default:
      throw ("Not a valid endpoint")
  }
}
