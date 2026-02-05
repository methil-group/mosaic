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
