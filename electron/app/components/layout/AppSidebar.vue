<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { useRoute } from 'vue-router'
import { Sparkles, Plus, LayoutGrid, Menu, X, Bot, Eye, EyeOff, Settings, User, Folder } from 'lucide-vue-next'

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
        class="h-full border-r border-gray-200 bg-white/80 backdrop-blur-2xl transition-all duration-300 ease-in-out z-[100] flex flex-col shrink-0 relative group"
        :class="isSidebarExpanded ? 'w-64' : 'w-16'">
        <!-- Expand/Collapse Button (Top) -->
        <div class="p-4 flex items-center justify-start border-b border-gray-100 h-16 shrink-0 overflow-hidden">
            <button @click="toggleSidebar"
                class="p-2 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 transition-all flex items-center justify-center min-w-[32px]">
                <Menu v-if="!isSidebarExpanded" class="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                <X v-else class="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
            </button>
            <div v-if="isSidebarExpanded" class="ml-3 flex items-center gap-2 animate-in fade-in duration-300">
                <div class="w-6 h-6 rounded bg-gray-900 flex items-center justify-center shrink-0">
                    <Sparkles class="w-3.5 h-3.5 text-white" />
                </div>
                <h1 class="text-[10px] font-black tracking-[0.2em] text-gray-900 truncate">MOSAIC</h1>
            </div>
        </div>

        <!-- Navigation Icons/Labels -->
        <nav class="flex-1 overflow-y-auto py-6 scroll-none flex flex-col">
            <!-- Agents Section -->
            <div class="transition-all duration-500 ease-in-out px-3 overflow-hidden origin-top"
                :class="isGridView ? 'max-h-[500px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0 pointer-events-none'">
                <h3 v-if="isSidebarExpanded"
                    class="px-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-300">
                    Agents</h3>
                <div class="space-y-1.5">
                    <div v-for="id in store.instanceIds" :key="id" @mouseenter="hoveredAgentId = id"
                        @mouseleave="hoveredAgentId = null"
                        @click="!store.instances[id]?.isVisible && toggleVisibility(id)"
                        class="relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-100 border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all cursor-pointer overflow-visible group/item justify-between">

                        <div class="flex items-center gap-3 min-w-0">
                            <Bot class="w-4 h-4 shrink-0 transition-transform group-hover/item:scale-110"
                                :class="{ 'opacity-50': !store.instances[id]?.isVisible }" />
                            <span v-if="isSidebarExpanded"
                                class="truncate uppercase text-[9px] tracking-widest font-bold animate-in slide-in-from-left-2 duration-300"
                                :class="{ 'opacity-50 text-gray-300': !store.instances[id]?.isVisible }">{{
                                    store.instances[id]?.name || id }}</span>
                        </div>
                        <button v-if="isSidebarExpanded" @click.stop="toggleVisibility(id)"
                            class="text-gray-300 hover:text-gray-900 transition-colors">
                            <Eye v-if="store.instances[id]?.isVisible" class="w-3 h-3" />
                            <EyeOff v-else class="w-3 h-3" />
                        </button>

                        <!-- Tooltip Popup -->
                        <div v-if="hoveredAgentId === id"
                            class="absolute left-full top-0 ml-4 w-64 bg-white text-gray-900 p-4 rounded-lg shadow-2xl z-[999] animate-in fade-in slide-in-from-left-2 duration-200 border border-gray-200 flex flex-col gap-3">

                            <!-- Header -->
                            <div class="flex flex-col border-b border-gray-100 pb-2">
                                <span class="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Agent</span>
                                <span class="text-base font-black uppercase tracking-wider">{{ store.instances[id]?.name
                                }}</span>
                            </div>

                            <!-- Info -->
                            <div class="space-y-2">
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Workspace</span>
                                    <span class="text-[10px] font-mono text-gray-600 break-all leading-tight">{{
                                        store.instances[id]?.currentWorkspace }}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span
                                        class="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Model</span>
                                    <div
                                        class="self-start px-2 py-1 rounded bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider">
                                        {{ store.instances[id]?.currentModel }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button @click="addAgent" v-tooltip="!isSidebarExpanded ? 'Deploy Agent' : null"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-gray-300 text-gray-400 hover:text-gray-900 hover:border-gray-500 hover:bg-gray-100 transition-all text-xs overflow-hidden">
                        <Plus class="w-4 h-4 shrink-0" />
                        <span v-if="isSidebarExpanded"
                            class="text-[9px] font-bold uppercase tracking-widest animate-in slide-in-from-left-2 duration-300">Deploy</span>
                    </button>
                </div>
            </div>

            <!-- Navigation Section -->
            <div class="px-3">
                <h3 v-if="isSidebarExpanded"
                    class="px-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 animate-in fade-in duration-300">
                    Application</h3>
                <div class="space-y-1.5">
                    <NuxtLink to="/" v-tooltip="!isSidebarExpanded ? 'Workspace' : null"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                        active-class="bg-gray-200 text-gray-900">
                        <LayoutGrid class="w-4 h-4 shrink-0" />
                        <span v-if="isSidebarExpanded"
                            class="animate-in slide-in-from-left-2 duration-300 truncate">Grid</span>
                    </NuxtLink>
                    <NuxtLink to="/agents" v-tooltip="!isSidebarExpanded ? 'Agents' : null"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                        active-class="bg-gray-200 text-gray-900">
                        <Bot class="w-4 h-4 shrink-0" />
                        <span v-if="isSidebarExpanded"
                            class="animate-in slide-in-from-left-2 duration-300 truncate">Agents</span>
                    </NuxtLink>
                </div>
            </div>
        </nav>

        <!-- Lower Section: Controls -->
        <div class="px-3 pb-4 space-y-1.5">
            <div class="h-px bg-gray-100 mx-2 mb-4"></div>
            <NuxtLink to="/settings" v-tooltip="!isSidebarExpanded ? 'Settings' : null"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                active-class="bg-gray-200 text-gray-900">
                <Settings class="w-4 h-4 shrink-0" />
                <span v-if="isSidebarExpanded"
                    class="animate-in slide-in-from-left-2 duration-300 truncate">Settings</span>
            </NuxtLink>
            <NuxtLink to="/profile" v-tooltip="!isSidebarExpanded ? 'Profile' : null"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-bold uppercase tracking-widest overflow-hidden"
                active-class="bg-gray-200 text-gray-900">
                <User class="w-4 h-4 shrink-0" />
                <span v-if="isSidebarExpanded"
                    class="animate-in slide-in-from-left-2 duration-300 truncate">Profile</span>
            </NuxtLink>
        </div>

        <!-- Footer/Info -->
        <footer class="p-4 border-t border-gray-100 flex flex-col items-center overflow-hidden">
            <div v-if="isSidebarExpanded" class="w-full px-2 animate-in fade-in duration-300">
                <div class="text-[7px] font-bold text-gray-300 uppercase tracking-[0.4em] truncate">BUILD 1.0.5</div>
            </div>
            <div v-else class="text-[7px] font-bold text-gray-300 uppercase tracking-widest">v1</div>
        </footer>
    </aside>
</template>
