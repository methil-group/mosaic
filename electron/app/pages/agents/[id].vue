<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAgentStore } from '~/stores/agent'
import { ArrowLeft, Bot, Settings, Code, Terminal, BotIcon, Save, History, Database, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const store = useAgentStore()

const id = route.params.id as string
const agent = computed(() => store.instances[id])

const goBack = () => {
    router.push('/agents')
}

const terminateAgent = () => {
    if (confirm('Terminate this agent?')) {
        store.removeInstance(id)
        router.push('/agents')
    }
}
</script>

<template>
    <div v-if="agent" class="h-full flex flex-col bg-[#050505] overflow-hidden">
        <!-- Header -->
        <header class="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-xl shrink-0">
            <div class="flex items-center gap-6">
                <button @click="goBack" class="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <ArrowLeft class="w-4 h-4" />
                </button>
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Bot class="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                        <h1 class="text-[14px] font-black tracking-widest text-white uppercase">{{ agent.name }}</h1>
                        <p class="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-0.5">INSTANCE ID: {{ agent.id }}</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button @click="terminateAgent" class="px-6 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-red-500 transition-all flex items-center gap-2">
                    <Trash2 class="w-3.5 h-3.5" />
                    Terminate Process
                </button>
            </div>
        </header>

        <!-- Dynamic Content -->
        <div class="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div class="max-w-4xl mx-auto space-y-12">
                <!-- Overview Stats -->
                <div class="grid grid-cols-4 gap-6">
                    <div v-for="stat in [
                        { label: 'Process Status', value: agent.isProcessing ? 'Processing' : 'Standby', icon: Terminal, color: agent.isProcessing ? 'text-blue-400' : 'text-green-400' },
                        { label: 'Context Tokens', value: agent.messages.length, icon: Database, color: 'text-purple-400' },
                        { label: 'Memory Span', value: 'Episodic', icon: History, color: 'text-orange-400' },
                        { label: 'Core Model', value: agent.currentModel.split('/').pop(), icon: BotIcon, color: 'text-yellow-400' }
                    ]" :key="stat.label" class="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-3">
                        <component :is="stat.icon" class="w-4 h-4" :class="stat.color" />
                        <div>
                            <p class="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">{{ stat.label }}</p>
                            <p class="text-xs font-black text-white mt-1">{{ stat.value }}</p>
                        </div>
                    </div>
                </div>

                <!-- Main Settings -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3 text-white/20">
                        <Settings class="w-4 h-4" />
                        <h3 class="text-[10px] font-bold uppercase tracking-[0.3em]">Runtime Parameters</h3>
                    </div>

                    <div class="space-y-4">
                        <div class="p-8 bg-white/5 border border-white/5 rounded-3xl space-y-8">
                            <div class="grid grid-cols-2 gap-8">
                                <div class="space-y-2">
                                    <label class="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Identity Override</label>
                                    <input v-model="agent.name" type="text" class="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all uppercase tracking-widest" />
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Current Workspace</label>
                                    <input v-model="agent.currentWorkspace" type="text" class="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-mono text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all" />
                                </div>
                            </div>

                             <div class="space-y-2">
                                <label class="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Active Model</label>
                                <select v-model="agent.currentModel" class="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all uppercase tracking-widest">
                                    <option v-for="m in store.availableModels" :key="m.id" :value="m.id">{{ m.name }}</option>
                                </select>
                            </div>

                            <div class="pt-4 flex justify-end">
                                <button class="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95">
                                    <Save class="w-4 h-4" />
                                    Save Runtime Config
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
    <div v-else class="h-full flex items-center justify-center bg-[#050505]">
        <div class="flex flex-col items-center gap-4 opacity-50">
            <div class="w-12 h-12 rounded-full border-2 border-white/10 border-t-white animate-spin"></div>
            <p class="text-[10px] font-black uppercase tracking-widest">Resolving Workspace...</p>
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
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}
</style>
