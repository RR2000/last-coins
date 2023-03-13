<script setup lang="ts">
import {computed, ref} from 'vue'
import {TransactionReceipt} from 'web3-core'
import {Endpoint, getEndpointConfiguration} from "../utils/endpoints";
import Web3 from "web3"

const endpoint: Endpoint = Endpoint.BSC
const endpointConfiguration = getEndpointConfiguration(endpoint);
const web3 = new Web3(endpointConfiguration.webSocket);

let contractsCreated = ref<{ timestamp: number, token: string }[]>([])
let contractsPairAdded = ref<{ timestamp: number, token: string }[]>([])
let datetime = ref<string>()

web3.eth.isSyncing((error, syncing) => {
  if (syncing)
    datetime.value = ((syncing.currentBlock / syncing.highestBlock) * 100).toFixed(2).toString() + "%"
  else {
    if (typeof endpointConfiguration.factoryAddresses === "undefined") {
      throw "exchangeAddresses is undefined"
    }
    const factory = new web3.eth.Contract(endpointConfiguration.factoryAddresses[0].abi, endpointConfiguration.factoryAddresses[0].address)
    factory.events.PairCreated({},
        function (error: any, event: any) {
          if (error) {
            console.error("error in factory events ", error)
            return
          }

          web3.eth.getBlock(event.blockNumber, (error, block) => {
            if (error) {
              console.error("error while getting block number in events factory ", error)
              return
            }
            console.log(event.returnValues)
            console.log("New pair added", event.returnValues.token0, "at", new Date(<number>block.timestamp * 1000));
            contractsPairAdded.value.push({
              timestamp: <number>block.timestamp * 1000,
              token: event.returnValues.token0.toUpperCase() !== endpointConfiguration.baseTokenAddress?.toUpperCase() ?
                  event.returnValues.token0 : event.returnValues.token1
            })
          })
        }
    )
  }
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

/*
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
*/

type MergedRow = {
  timestamp: number,
  created: string[],
  added: string[],
  [key: string]: any
}

const mergeRows = (list: { timestamp: number, token: string, type: string }[]): MergedRow[] => {
  const mergedList: MergedRow[] = []
  let currentRow: MergedRow = {timestamp: 0, created: [], added: []}

  list.forEach((row: { timestamp: number, token: string, type: string }) => {
    if (row.timestamp !== currentRow.timestamp || (currentRow.created.indexOf(row.token) === -1 && currentRow.added.indexOf(row.token) === -1)) {
      if (currentRow.created.length > 0 || currentRow.added.length > 0) {
        mergedList.push(currentRow)
      }
      currentRow = {timestamp: row.timestamp, created: [], added: []}
    }
    currentRow[row.type].push(row.token)
  })

  if (currentRow.created.length > 0 || currentRow.added.length > 0) {
    mergedList.push(currentRow)
  }

  return mergedList
}


const mergedContracts = computed(() => {
  const created = contractsCreated.value.map(c => ({...c, type: "created"}))
  const added = contractsPairAdded.value.map(c => ({...c, type: "added"}))
  return mergeRows([...created, ...added].sort((a, b) => b.timestamp - a.timestamp))
})


</script>
<template>
  <h1>Welcome to Raoul's Crypto ultra mega rafforzato pro</h1>
  <h2>Updated to {{ datetime }} of {{ endpoint }}</h2>
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
        <a v-if="contract.created.length === 1"
           :href="endpointConfiguration.explorer + contract.created[0]"
           target="_blank">
          {{ contract.created[0] }}
        </a>
      </td>
      <td style="font-family: monospace;">
        <a v-if="contract.added.length === 1"
           :href="endpointConfiguration.explorer + contract.added[0]"
           target="_blank">
          {{ contract.added[0] }}
        </a>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
