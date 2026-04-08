<template>
    <div class="h-full flex flex-col bg-[var(--bg-color)] relative overflow-hidden select-none transition-colors duration-300">
        <!-- Ultra-Subtle Background Pattern -->
        <div class="absolute inset-0 bg-[radial-gradient(var(--text-main)_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.03] pointer-events-none"></div>

        <!-- Minimalist Header -->
        <header class="h-24 px-12 flex items-center justify-between shrink-0 z-10">
            <div>
                <h1 class="text-[10px] font-black tracking-[0.4em] text-[var(--text-dim)] uppercase opacity-60 mb-1">Infrastructure / Units</h1>
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] shadow-[0_0_8px_var(--accent-color)]"></div>
                    <span class="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">{{ store.instanceIds.length }} Active</span>
                </div>
            </div>

            <div class="flex items-center gap-8">
                <div class="relative group border-b border-[var(--border-color)] focus-within:border-[var(--text-dim)] transition-all pb-1">
                    <Search class="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-dim)] group-focus-within:text-[var(--text-main)] transition-colors" />
                    <input v-model="searchQuery" type="text" placeholder="FILTER..."
                        class="bg-transparent pl-5 pr-2 py-1 text-[10px] font-black tracking-[0.2em] text-[var(--text-main)] placeholder:text-[var(--text-dim)]/50 focus:outline-none w-48" />
                </div>
                <button @click="deployAgent"
                    class="w-10 h-10 bg-[var(--accent-color)] text-[var(--panel-bg)] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                    <Plus class="w-5 h-5" />
                </button>
            </div>
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-12 pb-12 custom-scrollbar z-0 relative">
            <div v-if="filteredAgents.length === 0" class="h-full flex flex-col items-center justify-center opacity-10">
                <Cpu class="w-24 h-24 mb-4 text-[var(--text-main)]" />
                <p class="text-[11px] font-black tracking-[0.5em] uppercase text-[var(--text-main)]">Empty Grid</p>
            </div>

            <TransitionGroup 
                v-else 
                name="grid-pop" 
                tag="div" 
                class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
                <div v-for="agent in filteredAgents" :key="agent.id"
                    class="agent-tile aspect-square group relative bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-6 hover:border-[var(--text-dim)]/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden"
                    @click="openAgentDetail(agent.id)">
                    
                    <!-- Background Visual Fill (Very Subtle) -->
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none"
                         :style="{ backgroundColor: agent.color || '#000' }"></div>

                    <!-- Hero SVG / Icon / Lottie -->
                    <div class="relative w-20 h-20 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                        <client-only v-if="agent.lottie">
                            <Vue3Lottie 
                                :animationLink="agent.lottie" 
                                :height="'100%'" 
                                :width="'100%'" 
                                :speed="0.5"
                                :rendererSettings="{ preserveAspectRatio: 'xMidYMid slice' }" 
                            />
                        </client-only>
                        <component 
                            v-else
                            :is="getIconComponent(agent.icon)" 
                            class="w-16 h-16 stroke-[1.5px]" 
                            :style="{ color: agent.color || '#000' }"
                        />
                        <div v-if="agent.isProcessing" class="absolute inset-x-0 inset-y-0 -m-4 animate-[spin_4s_linear_infinite] opacity-20">
                             <div class="w-full h-full rounded-full border border-dashed border-black"></div>
                        </div>
                    </div>

                    <!-- Minimal Info -->
                    <div class="text-center">
                        <h2 class="text-[11px] font-black text-[var(--text-main)] uppercase tracking-widest">{{ agent.name }}</h2>
                        <div class="flex items-center justify-center gap-1.5 mt-1">
                            <span class="w-1 h-1 rounded-full" :class="agent.isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'"></span>
                            <span class="text-[7px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{{ agent.isProcessing ? 'BUSY' : 'READY' }}</span>
                        </div>
                    </div>

                    <!-- Hidden Actions (Hover) -->
                    <div class="absolute inset-x-0 bottom-4 flex justify-center gap-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <button @click.stop="navigateTo('/')" class="p-2 bg-[var(--panel-bg)] rounded-full shadow-md border border-[var(--border-color)] hover:bg-[var(--panel-hover)] active:scale-90 transition-all">
                            <LayoutGrid class="w-3 h-3 text-[var(--text-dim)]" />
                        </button>
                        <button @click.stop="deleteAgent(agent.id)" class="p-2 bg-[var(--panel-bg)] rounded-full shadow-md border border-[var(--border-color)] hover:bg-red-500/10 hover:text-red-500 active:scale-90 transition-all text-[var(--text-dim)]">
                            <Trash2 class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </TransitionGroup>
        </div>
        
        <ConfirmModal 
            :show="showConfirm"
            title="Désinstaller l'unité"
            subtitle="ZONE DE DANGER"
            message="Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible et supprimera tout l'historique associé."
            confirm-text="SUPPRIMER"
            type="danger"
            @confirm="onDeleteConfirm"
            @cancel="showConfirm = false"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from 'vue'
import { useAgentStore } from '~/stores/agent'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import * as LucideIcons from 'lucide-vue-next'
import { Bot, Plus, Search, Trash2, Cpu, Activity, LayoutGrid, Sparkles } from 'lucide-vue-next'

const Vue3Lottie = defineAsyncComponent(() =>
  import('vue3-lottie').then(m => m.Vue3Lottie)
)

const store = useAgentStore()
const searchQuery = ref('')
const showConfirm = ref(false)
const agentToDeleteId = ref<string | null>(null)

onMounted(() => {
    store.fetchProviders()
})

const activeAgents = computed(() => {
    return store.instanceIds
        .map(id => store.instances[id])
        .filter((a): a is any => !!a && (a.workspaceId === null || a.workspaceId === undefined))
})

const filteredAgents = computed(() => {
    if (!searchQuery.value) return activeAgents.value
    return activeAgents.value.filter(a =>
        a.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (a.currentWorkspace && a.currentWorkspace.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
})

const getIconComponent = (iconName?: string) => {
    if (!iconName) return Bot
    const name = iconName.charAt(0).toUpperCase() + iconName.slice(1)
    return (LucideIcons as any)[name] || Bot
}

const deployAgent = () => {
    store.createInstance(null)
}

const deleteAgent = (id: string) => {
    agentToDeleteId.value = id
    showConfirm.value = true
}

const onDeleteConfirm = () => {
    if (agentToDeleteId.value) {
        store.removeInstance(agentToDeleteId.value)
        agentToDeleteId.value = null
        showConfirm.value = false
    }
}

const openAgentDetail = (id: string) => {
    navigateTo(`/agents/${id}`)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 2px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border-color);
}

/* Animations */
.grid-pop-enter-active,
.grid-pop-leave-active,
.grid-pop-move {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.grid-pop-enter-from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
}

.grid-pop-leave-to {
    opacity: 0;
    transform: scale(0.5);
}

.grid-pop-leave-active {
    position: absolute;
    z-index: 0;
}

.agent-tile {
    perspective: 1000px;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>


