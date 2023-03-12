import Web3 from 'web3';
import {Contract} from 'web3-eth-contract'
// @ts-ignore
import PancakeSwapFactory from '../abis/PancakeSwap/PancakeSwapFactory.js'
// @ts-ignore
import UniSwapFactory from '../abis/UniSwap/UniSwapFactory.js'

const web3 = new Web3();

export enum Endpoint {
  Ferraglia,
  Ganache,
  BSC,
  Ethereum
}

export type EndpointConfig = {
  explorer: string;
  webSocket: string;
  exchangeAddresses: any
}

export function getEndpoint(endpoint: Endpoint): EndpointConfig {
  switch (endpoint) {
    case Endpoint.Ferraglia:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "ws://127.0.0.1:8546",
        exchangeAddresses: []
      }
    case Endpoint.Ganache:
      return {
        explorer: "#",
        webSocket: "ws://127.0.0.1:8546",
        exchangeAddresses: []
      }
    case Endpoint.BSC:
      return {
        explorer: "https://bscscan.com/address/",
        webSocket: "wss://bsc-rpc.publicnode.com",
        exchangeAddresses: {0:PancakeSwapFactory, 1:"0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}
      }
    case Endpoint.Ethereum:
      return {
        explorer: "https://etherscan.io/address/",
        webSocket: "wss://ethereum-rpc.publicnode.com",
        exchangeAddresses: {0:UniSwapFactory, 1:"0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"}
      }
    default:
      throw ("Not a valid endpoint")
  }
}
