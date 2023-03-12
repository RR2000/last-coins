<script setup lang="ts">
import {computed, ref} from 'vue'
import {TransactionReceipt} from 'web3-core'
import {Endpoint, getEndpoint} from "../utils/endpoints";
import Web3 from "web3"

const endpointConfiguration = getEndpoint(Endpoint.BSC);
const web3 = new Web3(endpointConfiguration.webSocket);
const factory = new web3.eth.Contract(endpointConfiguration.exchangeAddresses[0], endpointConfiguration.exchangeAddresses[1])

let contractsCreated = ref<{ timestamp: number, token: string }[]>([])
let contractsPairAdded = ref<{ timestamp: number, token: string }[]>([])
let datetime = ref<string>()

factory.events.PairCreated({},
    function (error: any, event: any) {
      if (error) {
        console.error("error", error)
        return
      }

      web3.eth.getBlock(event.blockNumber, (error, block) => {
        if (error) {
          console.error(error)
          return
        }
        console.log("New pair added", event.returnValues.token0, "at", new Date(<number>block.timestamp * 1000));
        contractsPairAdded.value.push({
          timestamp: <number>block.timestamp * 1000,
          token: event.returnValues.token0
        })
      })
    }
)


web3.eth.isSyncing((error, syncing) => {
  if (syncing)
    datetime.value = ((syncing.currentBlock / syncing.highestBlock) * 100).toFixed(2).toString() + "%"
})

const updateContracts = (receipt: TransactionReceipt, timestamp: number) => {
  if (receipt.contractAddress != null) {
    console.log('New contract created', receipt.contractAddress, "at", new Date(timestamp));
    contractsCreated.value.push({
      timestamp: timestamp,
      token: receipt.contractAddress
    })
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
        receipts.forEach((receipt) => updateContracts(receipt, timestamp))
      }).catch((error) => console.error(error))
    }
  })
})

const mergedContracts = computed(() => {
  const created = contractsCreated.value.map(c => ({...c, type: "created"}))
  const added = contractsPairAdded.value.map(c => ({...c, type: "added"}))
  return [...created, ...added].sort((a, b) => b.timestamp - a.timestamp)
})

const contractsByType = computed(() => {
  const contracts = {
    created: [],
    added: []
  } as Record<string, any[]>

  mergedContracts.value.forEach((c: { timestamp: number, token: string, type: string }) => {
    contracts[c.type].push(c)
  })
  return contracts
})


</script>
<template>
  <h1>Welcome to Raoul's Crypto ultra mega rafforzato pro</h1>
  <h2>Updated to {{ datetime }}</h2>
  <table style="margin: 0 auto;table-layout: fixed; width: 100%;">
    <thead>
    <tr>
      <th>Timestamp</th>
      <th>Contracts created</th>
      <th>Pairs created</th>
    </tr>
    </thead>
    <tbody>
    <tr v-for="contract in mergedContracts">
      <td>{{ new Date(contract.timestamp).toLocaleString() }}</td>
      <td style="font-family: monospace;">
        <a v-if="contract.type === 'created'"
           :href="endpointConfiguration.explorer + contract.token"
           target="_blank">
          {{ contract.token }}
        </a>
      </td>
      <td style="font-family: monospace;">
        <a v-if="contract.type === 'added'"
           :href="endpointConfiguration.explorer + contract.token"
           target="_blank">
          {{ contract.token }}
        </a>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
