<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import AgentInstance from '../agent/AgentInstance.vue'

const store = useAgentStore()

const visibleInstances = computed(() => {
  return store.instanceIds.filter(id => store.instances[id]?.isVisible)
})
</script>

<template>
  <div class="h-full flex flex-col min-w-0 bg-black overflow-hidden relative">
    <div
      class="flex-1 p-2 grid gap-2 overflow-auto bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px]"
      :style="{
        gridTemplateColumns: 'repeat(2, 1fr)'
      }">
      <div v-for="(id, index) in visibleInstances" :key="id" class="min-h-0 min-w-0 rounded-md overflow-hidden relative"
        :class="{
          'col-span-2': visibleInstances.length === 1 || (visibleInstances.length % 2 !== 0 && index === visibleInstances.length - 1)
        }">
        <AgentInstance :instance-id="id" />
      </div>
    </div>
  </div>
</template>

<style>
/* Global scrollbar for the tiling manager */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.scroll-none::-webkit-scrollbar {
  display: none;
}
</style>
