<script setup lang="ts">
import {ref} from 'vue'

import Web3 from 'web3'

const web3 = new Web3("wss://ethereum-rpc.publicnode.com")
//const web3 = new Web3('ws://127.0.0.1:8545')
//const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://bsc-rpc.publicnode.com'));


web3.eth.subscribe('newBlockHeaders', (error, header) => {
  web3.eth.getBlock(header.hash, (error, block) => {
    if (block.transactions.length > 0) {
      block.transactions.forEach((txHash) => {
        web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
          if (receipt.contractAddress != null)
            console.log("New contract created", receipt.contractAddress);
          else
            console.log("nope")
        });
      });
    }
  });
});


defineProps<{ msg: string }>()


const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
    >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Install
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
    in your IDE for a better DX
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
