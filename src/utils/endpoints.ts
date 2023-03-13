import PancakeSwapFactoryJson from '../abis/PancakeSwap/PancakeSwapFactory.json';
import PancakeSwapRouterJson from '../abis/PancakeSwap/PancakeSwapRouter.json';
import PancakeSwapPairJson from '../abis/PancakeSwap/PancakeSwapPair.json';
import UniSwapFactoryJson from '../abis/UniSwap/UniSwapFactory.json';
import {AbiItem} from 'web3-utils'

// @ts-ignore
const PancakeSwapFactory: AbiItem = PancakeSwapFactoryJson;
// @ts-ignore
const PancakeSwapRouter: AbiItem = PancakeSwapRouterJson;
// @ts-ignore
const PancakeSwapPair: AbiItem = PancakeSwapPairJson;
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
  factoryAddresses: [{abi: AbiItem, address: string}] | undefined
  routerAddresses: [{abi: AbiItem, address: string}] | undefined
  pairAddresses: AbiItem[] | undefined
  baseTokenAddress: string | undefined
}

export function getEndpointConfiguration(endpoint: Endpoint): EndpointConfig {
  switch (endpoint) {
    case Endpoint.Ferraglia:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "ws://127.0.0.1:8546",
        factoryAddresses: [{abi:UniSwapFactory, address:"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"}],
        routerAddresses: undefined,
        pairAddresses: undefined,
        baseTokenAddress: undefined
      }
    case Endpoint.Ganache:
      return {
        explorer: "#",
        webSocket: "ws://127.0.0.1:8546",
        factoryAddresses: undefined,
        routerAddresses: undefined,
        pairAddresses: undefined,
        baseTokenAddress: undefined
      }
    case Endpoint.BSC:
      return {
        explorer: "https://bscscan.com/address/",
        webSocket: "wss://bsc-rpc.publicnode.com",
        factoryAddresses: [{abi:PancakeSwapFactory, address:"0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}],
        routerAddresses: [{abi: PancakeSwapRouter, address: "0x10ED43C718714eb63d5aA57B78B54704E256024E"}],
        pairAddresses: [PancakeSwapPair],
        baseTokenAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
      }
    case Endpoint.Ethereum:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "wss://ethereum-rpc.publicnode.com",
        factoryAddresses: [{abi:UniSwapFactory, address:"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"}],
        pairAddresses: undefined,
        routerAddresses: undefined,
        baseTokenAddress: undefined
      }
    default:
      throw ("Not a valid endpoint")
  }
}
