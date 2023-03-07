<template>
  <table>
    <thead>
    <tr>
      <th>{{ datetime }}</th>
    </tr>
    <tr>
      <td>{{ counter }}</td>
    </tr>
    </thead>
    <tbody>
    <tr v-for="contract in contracts.reverse()" :key="contract">
      <td style="font-family: monospace;">{{ contract }}</td>
    </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import {ref} from 'vue'

import Web3 from 'web3'

const web3 = new Web3('wss://ethereum-rpc.publicnode.com')
//const web3 = new Web3('ws://127.0.0.1:8545')
//const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://bsc-rpc.publicnode.com'));

let contracts = ref<string[]>([])
let datetime = ref<Date>()
let counter = ref<number>(0)


console.log("subscribing...")
web3.eth.subscribe('newBlockHeaders', (error, header) => {
  let timestamp: number = <number>header.timestamp * 1000
  datetime.value = new Date(timestamp)
  web3.eth.getBlock(header.hash, (error, block) => {
    if (error)
      return
    if (block && block.transactions.length > 0) {
      block.transactions.forEach((txHash) => {
        web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
          if (error)
            return

          if (receipt.contractAddress != null) {
            console.log('New contract created', receipt.contractAddress)
            contracts.value.push(receipt.contractAddress)
          } else {
            counter.value++
          }
        })
      })
    }
  })
})

</script>

<style scoped>

</style>
