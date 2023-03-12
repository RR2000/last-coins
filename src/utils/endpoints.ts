import PancakeSwapFactoryJson from '../abis/PancakeSwap/PancakeSwapFactory.json';
import UniSwapFactoryJson from '../abis/UniSwap/UniSwapFactory.json';
import {AbiItem} from 'web3-utils'

// @ts-ignore
const PancakeSwapFactory: AbiItem = PancakeSwapFactoryJson;
// @ts-ignore
const UniSwapFactory: AbiItem = UniSwapFactoryJson;

export enum Endpoint {
  Ferraglia = "Ferraglia -> Ethereum",
  Ganache = "Blockchain Locale" ,
  BSC = "API -> BSC",
  Ethereum = "API -> Ethereum"
}

export type EndpointConfig = {
  explorer: string;
  webSocket: string;
  exchangeAddresses: [{abi: AbiItem, address: string}] | undefined
}

export function getEndpointConfiguration(endpoint: Endpoint): EndpointConfig {
  switch (endpoint) {
    case Endpoint.Ferraglia:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "ws://127.0.0.1:8546",
        exchangeAddresses: [{abi:UniSwapFactory, address:"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"}]
      }
    case Endpoint.Ganache:
      return {
        explorer: "#",
        webSocket: "ws://127.0.0.1:8546",
        exchangeAddresses: undefined
      }
    case Endpoint.BSC:
      return {
        explorer: "https://bscscan.com/address/",
        webSocket: "wss://bsc-rpc.publicnode.com",
        exchangeAddresses: [{abi:PancakeSwapFactory, address:"0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}]
      }
    case Endpoint.Ethereum:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "wss://ethereum-rpc.publicnode.com",
        exchangeAddresses: [{abi:UniSwapFactory, address:"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"}]
      }
    default:
      throw ("Not a valid endpoint")
  }
}
