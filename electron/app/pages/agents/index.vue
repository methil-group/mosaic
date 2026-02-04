<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Bot, Plus, Search, MoreVertical, ExternalLink, Trash2, Cpu, Activity, LayoutGrid } from 'lucide-vue-next'

const store = useAgentStore()
const searchQuery = ref('')

const activeAgents = computed(() => {
    return store.instanceIds
        .map(id => store.instances[id])
        .filter((a): a is any => !!a)
})

const filteredAgents = computed(() => {
    if (!searchQuery.value) return activeAgents.value
    return activeAgents.value.filter(a =>
        a.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        a.currentWorkspace.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

const deployAgent = () => {
    store.createInstance()
}

const deleteAgent = (id: string) => {
    if (confirm('Terminate this agent instance?')) {
        store.removeInstance(id)
    }
}

const openAgentDetail = (id: string) => {
    navigateTo(`/agents/${id}`)
}
</script>

<template>
    <div class="h-full flex flex-col bg-gray-50">
        <!-- Header -->
        <header
            class="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <Bot class="w-4 h-4 text-gray-500" />
                </div>
                <div>
                    <h1 class="text-xs font-black tracking-[0.2em] text-gray-900 uppercase">Agent Directory</h1>
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{{
                        store.instanceIds.length }} Active Instances</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="relative group">
                    <Search
                        class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                    <input v-model="searchQuery" type="text" placeholder="FILTER AGENTS..."
                        class="bg-gray-100 border border-gray-200 rounded-full py-2 pl-10 pr-4 text-[10px] font-bold tracking-widest text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all w-64" />
                </div>
                <button @click="deployAgent"
                    class="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-2">
                    <Plus class="w-3 h-3" />
                    Deploy New Agent
                </button>
            </div>
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div v-if="filteredAgents.length === 0" class="h-full flex flex-col items-center justify-center opacity-30">
                <Cpu class="w-12 h-12 mb-4 text-gray-500" />
                <p class="text-xs font-bold tracking-widest uppercase text-gray-500">No agents active</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="agent in filteredAgents" :key="agent.id"
                    class="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-400 transition-all cursor-pointer overflow-hidden flex flex-col gap-6 shadow-sm"
                    @click="openAgentDetail(agent.id)">
                    <!-- Status Ring -->
                    <div class="absolute top-4 right-4 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full"
                            :class="agent.isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'"></span>
                        <span class="text-[8px] font-black uppercase tracking-widest text-gray-400">{{
                            agent.isProcessing ? 'Processing' : 'Standby' }}</span>
                    </div>

                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center relative">
                            <Bot class="w-6 h-6 text-gray-600" />
                            <div v-if="agent.isProcessing"
                                class="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                <Activity class="w-2 h-2 text-white" />
                            </div>
                        </div>
                        <div>
                            <h2
                                class="text-base font-black text-gray-900 uppercase tracking-wider group-hover:tracking-[0.1em] transition-all">
                                {{ agent.name }}</h2>
                            <p class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{{ agent.id }}</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="flex flex-col gap-1">
                            <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Workspace</span>
                            <span
                                class="text-[10px] font-mono text-gray-600 truncate bg-gray-100 px-2 py-1 rounded border border-gray-200">{{
                                    agent.currentWorkspace || '/root' }}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Compute
                                Core</span>
                            <span class="text-[10px] font-bold text-gray-700 uppercase tracking-widest">{{
                                agent.currentModel }}</span>
                        </div>
                    </div>

                    <div class="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div class="flex gap-2">
                            <button @click.stop="navigateTo('/')"
                                class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                                title="View in Grid">
                                <LayoutGrid class="w-3.5 h-3.5" />
                            </button>
                            <button @click.stop="deleteAgent(agent.id)"
                                class="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
                                title="Terminate">
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div
                            class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                            <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">{{
                                agent.messages.length }} Messages</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.1);
}
</style>
