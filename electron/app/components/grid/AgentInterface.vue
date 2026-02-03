<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import AgentInstance from '../agent/AgentInstance.vue'
import { LayoutGrid } from 'lucide-vue-next'
import { useTileLayout } from '~/composables/useTileLayout'

const store = useAgentStore()

const visibleInstances = computed(() => {
  return store.instanceIds.filter(id => store.instances[id]?.isVisible)
})

const { gridStyle, getTileStyle } = useTileLayout(visibleInstances)
</script>

<template>
  <div class="h-full flex flex-col min-w-0 bg-black overflow-hidden relative">
    <div
      v-if="visibleInstances.length > 0"
      class="flex-1 p-2 overflow-hidden bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px]"
      :style="gridStyle">
      <TransitionGroup name="tile">
        <div 
          v-for="id in visibleInstances" 
          :key="id" 
          class="tile-item min-h-0 min-w-0 rounded-lg overflow-hidden relative border border-white/5"
          :style="getTileStyle(id)">
          <AgentInstance :instance-id="id" />
        </div>
      </TransitionGroup>
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
/* Tile transition animations - Hyprland style */
.tile-item {
  transition: 
    grid-column 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    grid-row 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Entry animation */
.tile-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.tile-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tile-enter-to {
  opacity: 1;
  transform: scale(1);
}

/* Exit animation */
.tile-leave-from {
  opacity: 1;
  transform: scale(1);
}

.tile-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}

.tile-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* Move animation for remaining tiles */
.tile-move {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

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
