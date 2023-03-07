<script setup lang="ts">
import {computed, ref} from 'vue'
import Web3 from 'web3'

//const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://bsc-rpc.publicnode.com'));

//const web3 = new Web3('ws://127.0.0.1:8545')
const web3 = new Web3('wss://ethereum-rpc.publicnode.com')

let contracts = ref<string[]>([])
let datetime = ref<string>()
let notInteresting = ref<number>(0)
let interesting = ref<number>(0)

const updateContracts = (receipt: any) => {
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
    if (error)
      return
    if (block && block.transactions.length > 0) {
      //it should check if it's a candidate. u can check if it doesn't have a to.
      //and only in that case call getTransactionMap to get the newContract address
      const promises = block.transactions.map((txHash) => {
        return web3.eth.getTransactionReceipt(txHash)
      })
      Promise.all(promises).then((receipts) => {
        receipts.forEach((receipt) => {
          if (receipt) {
            updateContracts(receipt)
          }
        })
      })
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
      <th>{{ datetime }}</th>
    </tr>
    <tr>
      <td>{{ notInteresting }}</td>
    </tr>
    </thead>
    <tbody>
    <tr v-for="contract in sortedContracts" :key="contract">
      <td style="font-family: monospace;">{{ contract }}</td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
