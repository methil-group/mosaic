<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import AgentInstance from '../agent/AgentInstance.vue'
import { LayoutGrid } from 'lucide-vue-next'

const store = useAgentStore()

const visibleInstances = computed(() => {
  return store.instanceIds.filter(id => store.instances[id]?.isVisible)
})
</script>

<template>
  <div class="h-full flex flex-col min-w-0 bg-black overflow-hidden relative">
    <div
      v-if="visibleInstances.length > 0"
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
    <div v-else class="flex-1 flex flex-col items-center justify-center bg-black gap-6 opacity-40 select-none">
        <div class="relative">
            <div class="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 animate-pulse">
                <LayoutGrid class="w-8 h-8 text-white/20" />
            </div>
        </div>
        <div class="text-center space-y-2">
            <h2 class="text-xs font-black tracking-[0.3em] uppercase text-white">Mosaic Grid Empty</h2>
            <p class="text-[9px] font-bold tracking-widest uppercase text-white/20">Deploy an agent from the sidebar or workspaces</p>
        </div>
        <button @click="store.createInstance()" class="mt-4 px-6 py-2.5 rounded-full border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-[0.2em] text-white">
            Initialize Primary Unit
        </button>
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
