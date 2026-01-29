<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { useRoute } from 'vue-router'
import { Sparkles, Plus, LayoutGrid, Menu, X, Bot, Eye, EyeOff, Settings } from 'lucide-vue-next'

const store = useAgentStore()
const route = useRoute()
const isSidebarExpanded = ref(false)
const hoveredAgentId = ref<string | null>(null)

const isGridView = computed(() => route.path === '/')

const addAgent = () => {
    store.createInstance()
}

const toggleSidebar = () => {
    isSidebarExpanded.value = !isSidebarExpanded.value
}

const toggleVisibility = (id: string) => {
    if (store.instances[id]) {
        store.instances[id].isVisible = !store.instances[id].isVisible
    }
}
</script>

<template>
    <!-- Mini Persistent Sidebar -->
    <aside
        class="h-full border-r border-white/10 bg-black/50 backdrop-blur-2xl transition-all duration-300 ease-in-out z-[100] flex flex-col shrink-0 relative group"
        :class="isSidebarExpanded ? 'w-64' : 'w-16'">
        <!-- Expand/Collapse Button (Top) -->
        <div class="p-4 flex items-center justify-start border-b border-white/5 h-16 shrink-0 overflow-hidden">
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
        <nav class="flex-1 overflow-y-auto py-6 scroll-none flex flex-col">
            <!-- Agents Section -->
            <div class="transition-all duration-500 ease-in-out px-3 overflow-hidden origin-top"
                :class="isGridView ? 'max-h-[500px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0 pointer-events-none'">
                <h3 v-if="isSidebarExpanded"
                    class="px-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-300">
                    Agents</h3>
                <div class="space-y-1.5">
                    <div v-for="id in store.instanceIds" :key="id" @mouseenter="hoveredAgentId = id"
                        @mouseleave="hoveredAgentId = null"
                        class="relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-white/5 border border-white/5 text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer overflow-visible group/item justify-between">

                        <div class="flex items-center gap-3 min-w-0">
                            <Bot class="w-4 h-4 shrink-0 transition-transform group-hover/item:scale-110"
                                :class="{ 'opacity-50': !store.instances[id]?.isVisible }" />
                            <span v-if="isSidebarExpanded"
                                class="truncate uppercase text-[9px] tracking-widest font-bold animate-in slide-in-from-left-2 duration-300"
                                :class="{ 'opacity-50 text-white/20': !store.instances[id]?.isVisible }">{{
                                    store.instances[id]?.name || id }}</span>
                        </div>
                        <button v-if="isSidebarExpanded" @click.stop="toggleVisibility(id)"
                            class="text-white/20 hover:text-white transition-colors">
                            <Eye v-if="store.instances[id]?.isVisible" class="w-3 h-3" />
                            <EyeOff v-else class="w-3 h-3" />
                        </button>

                        <!-- Tooltip Popup -->
                        <div v-if="hoveredAgentId === id"
                            class="absolute left-full top-0 ml-4 w-64 bg-white text-black p-4 rounded-lg shadow-2xl z-[999] animate-in fade-in slide-in-from-left-2 duration-200 border border-white/20 flex flex-col gap-3">

                            <!-- Header -->
                            <div class="flex flex-col border-b border-black/10 pb-2">
                                <span class="text-[10px] uppercase tracking-widest text-black/40 font-bold">Agent</span>
                                <span class="text-base font-black uppercase tracking-wider">{{ store.instances[id]?.name
                                    }}</span>
                            </div>

                            <!-- Info -->
                            <div class="space-y-2">
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] uppercase tracking-widest text-black/40 font-bold mb-0.5">Workspace</span>
                                    <span class="text-[10px] font-mono text-black/70 break-all leading-tight">{{
                                        store.instances[id]?.currentWorkspace }}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] uppercase tracking-widest text-black/40 font-bold mb-0.5">Model</span>
                                    <div
                                        class="self-start px-2 py-1 rounded bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                                        {{ store.instances[id]?.currentModel }}
                                    </div>
                                </div>
                            </div>
                        </div>
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
                    <NuxtLink to="/" v-tooltip="!isSidebarExpanded ? 'Workspace' : null"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                        active-class="bg-white/10 text-white">
                        <LayoutGrid class="w-4 h-4 shrink-0" />
                        <span v-if="isSidebarExpanded"
                            class="animate-in slide-in-from-left-2 duration-300 truncate">Grid</span>
                    </NuxtLink>
                    <NuxtLink to="/settings" v-tooltip="!isSidebarExpanded ? 'Settings' : null"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                        active-class="bg-white/10 text-white">
                        <Settings class="w-4 h-4 shrink-0" />
                        <span v-if="isSidebarExpanded"
                            class="animate-in slide-in-from-left-2 duration-300 truncate">Settings</span>
                    </NuxtLink>
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
</template>
