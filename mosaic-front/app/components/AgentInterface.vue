<script setup lang="ts">
import { ref } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Sparkles, Plus, LayoutGrid, Sidebar as SidebarIcon, Settings, Menu, X, Bot, ChevronRight, ChevronLeft } from 'lucide-vue-next'
import AgentInstance from './AgentInstance.vue'

const store = useAgentStore()
const isSidebarExpanded = ref(false)

const addAgent = () => {
  store.createInstance()
}

const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value
}
</script>

<template>
  <div class="flex h-screen bg-[#000000] text-white font-sans selection:bg-white/10 overflow-hidden relative">
    <!-- Mini Persistent Sidebar -->
    <aside
      class="h-full border-r border-white/10 bg-black/50 backdrop-blur-2xl transition-all duration-300 ease-in-out z-[100] flex flex-col shrink-0 relative group"
      :class="isSidebarExpanded ? 'w-64' : 'w-16'">
      <!-- Expand/Collapse Button (Top) -->
      <div class="p-4 flex items-center justify-center border-b border-white/5 h-16 shrink-0 overflow-hidden">
        <button @click="toggleSidebar"
          class="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center min-w-[32px]">
          <Menu v-if="!isSidebarExpanded" class="w-4 h-4 text-white/40 group-hover:text-white" />
          <X v-else class="w-4 h-4 text-white/40 group-hover:text-white" />
        </button>
        <div v-if="isSidebarExpanded" class="ml-3 flex items-center gap-2 animate-in fade-in duration-300">
          <div class="w-6 h-6 rounded bg-white flex items-center justify-center shrink-0">
            <Sparkles class="w-3.5 h-3.5 text-black" />
          </div>
          <h1 class="text-[10px] font-black tracking-[0.2em] text-white truncate">MOSAIC_OS</h1>
        </div>
      </div>

      <!-- Navigation Icons/Labels -->
      <nav class="flex-1 overflow-y-auto py-6 space-y-8 scroll-none">
        <!-- Agents Section -->
        <div class="px-3">
          <h3 v-if="isSidebarExpanded"
            class="px-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-300">
            Agents</h3>
          <div class="space-y-1.5">
            <div v-for="id in store.instanceIds" :key="id" v-tooltip="!isSidebarExpanded ? id : null"
              class="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white/5 border border-white/5 text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer overflow-hidden group/item">
              <Bot class="w-4 h-4 shrink-0 transition-transform group-hover/item:scale-110" />
              <span v-if="isSidebarExpanded"
                class="truncate uppercase text-[9px] tracking-widest font-bold animate-in slide-in-from-left-2 duration-300">{{
                  store.instances[id]?.name || id }}</span>
            </div>

            <button @click="addAgent" v-tooltip="!isSidebarExpanded ? 'Deploy Agent' : null"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-white/10 text-white/20 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-xs overflow-hidden">
              <Plus class="w-4 h-4 shrink-0" />
              <span v-if="isSidebarExpanded"
                class="text-[9px] font-bold uppercase tracking-widest animate-in slide-in-from-left-2 duration-300">Deploy</span>
            </button>
          </div>
        </div>

        <!-- Navigation Section -->
        <div class="px-3">
          <h3 v-if="isSidebarExpanded"
            class="px-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-300">
            Control</h3>
          <div class="space-y-1.5">
            <button v-tooltip="!isSidebarExpanded ? 'Workspace' : null"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden">
              <LayoutGrid class="w-4 h-4 shrink-0" />
              <span v-if="isSidebarExpanded" class="animate-in slide-in-from-left-2 duration-300 truncate">Grid</span>
            </button>
            <button v-tooltip="!isSidebarExpanded ? 'Settings' : null"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden">
              <Settings class="w-4 h-4 shrink-0" />
              <span v-if="isSidebarExpanded"
                class="animate-in slide-in-from-left-2 duration-300 truncate">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Footer/Info -->
      <footer class="p-4 border-t border-white/5 flex flex-col items-center overflow-hidden">
        <div v-if="isSidebarExpanded" class="w-full px-2 animate-in fade-in duration-300">
          <div class="text-[7px] font-bold text-white/10 uppercase tracking-[0.4em] truncate">BUILD 1.0.5</div>
        </div>
        <div v-else class="text-[7px] font-bold text-white/10 uppercase tracking-widest">v1</div>
      </footer>
    </aside>

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col min-w-0 bg-black overflow-hidden relative">
      <div
        class="flex-1 p-2 grid gap-2 transition-all duration-500 overflow-auto bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px]"
        :style="{
          gridTemplateColumns: store.instanceIds.length > 1 ? 'repeat(2, 1fr)' : '1fr'
        }">
        <div v-for="(id, index) in store.instanceIds" :key="id"
          class="min-h-0 min-w-0 animate-in zoom-in-95 fade-in duration-500 transition-all" :class="{
            'col-span-2': store.instanceIds.length % 2 !== 0 && index === store.instanceIds.length - 1 && store.instanceIds.length > 1
          }">
          <AgentInstance :instance-id="id" />
        </div>
      </div>
    </main>
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
