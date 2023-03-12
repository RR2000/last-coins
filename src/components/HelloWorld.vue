<script setup lang="ts">
import {computed, ref} from 'vue'
import {TransactionReceipt} from 'web3-core'
import {Endpoint, getEndpoint} from "../utils/endpoints";
import Web3 from "web3";

const endpointConfiguration = getEndpoint(Endpoint.BSC);
const web3 = new Web3(endpointConfiguration.webSocket);


let contracts = ref<string[]>([])
let datetime = ref<string>()
let notInteresting = ref<number>(0)
let interesting = ref<number>(0)

web3.eth.isSyncing((error, syncing) => {
  if(syncing)
    datetime.value = ((syncing.currentBlock / syncing.highestBlock)*100).toFixed(2).toString() + "%"
})

const updateContracts = (receipt: TransactionReceipt) => {
  if (receipt.contractAddress != null) {
    console.log('New contract created', receipt.contractAddress)
    contracts.value = [...contracts.value, receipt.contractAddress]
    interesting.value++
  } else {
    notInteresting.value++
  }
}

web3.eth.subscribe('newBlockHeaders').on('data', (header) => {
  let timestamp: number = <number>header.timestamp * 1000
  datetime.value = (new Date(timestamp).toLocaleString())
  web3.eth.getBlock(header.hash, (error, block) => {
    if (error) {
      console.error(error)
      return
    }
    if (block && block.transactions.length > 0) {

      const promises = block.transactions.map((txHash) => {
        return web3.eth.getTransactionReceipt(txHash)
      })

      Promise.all(promises).then((receipts) => {
        receipts.forEach((receipt) => updateContracts(receipt))
      }).catch((error) => console.error(error))
    }
  })
})

const sortedContracts = computed(() => {
  return contracts.value.reverse()
})

</script>

<template>
  <table>
    <thead>
    <tr>
      <th>Updated to {{ datetime }}</th>
    </tr>
    <tr>
      <td>Contracts scraped {{ notInteresting + interesting }}</td>
    </tr>
    </thead>
    <tbody>
    <tr v-for="contract in sortedContracts" :key="contract">
      <td style="font-family: monospace;">
        <a :href="endpointConfiguration.explorer + contract" target="_blank">{{ contract }}</a>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
