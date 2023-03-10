<script setup lang="ts">
import {computed, ref} from 'vue'
import Web3 from 'web3'
import {TransactionReceipt} from 'web3-core'

enum Endpoint {
  Ferraglia,
  Ganache,
  BSC,
  Ethereum
}

function getEndpoint(endpoint: Endpoint): string {
  switch (endpoint) {
    case Endpoint.Ferraglia:
      return "ws://127.0.0.1:8546"
    case Endpoint.Ganache:
      return "ws://127.0.0.1:8545"
    case Endpoint.BSC:
      return "wss://bsc-rpc.publicnode.com"
    case Endpoint.Ethereum:
      return "wss://ethereum-rpc.publicnode.com"
  }
}

const web3 = new Web3(getEndpoint(Endpoint.Ferraglia));

let contracts = ref<string[]>([])
let datetime = ref<string>()
let notInteresting = ref<number>(0)
let interesting = ref<number>(0)

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
        <a :href="'https://etherscan.io/address/' + contract" target="_blank">{{ contract }}</a>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
