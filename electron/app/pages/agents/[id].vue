<template>
  <div class="h-full">
    <div v-if="agent" class="h-full flex flex-col bg-[var(--bg-color)] overflow-hidden transition-colors duration-300">
        <!-- Header -->
        <header
            class="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-8 bg-[var(--panel-bg)]/80 backdrop-blur-xl shrink-0">
            <div class="flex items-center gap-6">
                <button @click="goBack"
                    class="p-2 rounded-lg hover:bg-[var(--panel-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all">
                    <ArrowLeft class="w-4 h-4" />
                </button>
                <div class="flex items-center gap-4">
                    <div
                        class="w-10 h-10 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] flex items-center justify-center">
                        <Bot class="w-5 h-5 text-[var(--text-dim)]" />
                    </div>
                    <div>
                        <h1 class="text-[14px] font-black tracking-widest text-[var(--text-main)] uppercase">{{ agent.name }}</h1>
                        <p class="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-0.5">INSTANCE ID: {{
                            agent.id }}</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button @click="terminateAgent"
                    class="px-6 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-red-500 transition-all flex items-center gap-2">
                    <Trash2 class="w-3.5 h-3.5" />
                    Terminate Process
                </button>
            </div>
        </header>

        <!-- Dynamic Content -->
        <div class="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div class="max-w-4xl mx-auto space-y-12">
                <!-- Overview Stats -->
                <div class="grid grid-cols-3 gap-6">
                    <div v-for="stat in [
                        { label: 'Process Status', value: agent.isProcessing ? 'Processing' : 'Standby', icon: Terminal, color: agent.isProcessing ? 'text-blue-500' : 'text-green-500' },
                        { label: 'Memory Span', value: 'Episodic', icon: History, color: 'text-orange-500' },
                        { label: 'Core Model', value: agent.currentModel.split('/').pop(), icon: BotIcon, color: 'text-amber-500' }
                    ]" :key="stat.label"
                        class="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
                        <component :is="stat.icon" class="w-4 h-4" :class="stat.color" />
                        <div>
                            <p class="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">{{ stat.label }}
                            </p>
                            <p class="text-xs font-black text-[var(--text-main)] mt-1">{{ stat.value }}</p>
                        </div>
                    </div>
                </div>

                <!-- Main Settings -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3 text-[var(--text-dim)]">
                        <Settings class="w-4 h-4" />
                        <h3 class="text-[10px] font-bold uppercase tracking-[0.3em]">Runtime Parameters</h3>
                    </div>

                    <div class="space-y-4">
                        <div class="p-8 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl space-y-8 shadow-sm">
                            <div class="grid grid-cols-2 gap-8">
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Identity
                                        Override</label>
                                    <input v-model="agent.name" type="text"
                                        class="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--text-dim)] focus:bg-[var(--panel-bg)] transition-all uppercase tracking-widest" />
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Provider</label>
                                    <select v-model="agent.currentProvider" @change="onProviderChange"
                                        class="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--text-dim)] focus:bg-[var(--panel-bg)] transition-all uppercase tracking-widest">
                                        <option v-for="p in store.availableProviders" :key="p.id" :value="p.id">{{ p.name }}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Active Model</label>
                                <select v-model="agent.currentModel"
                                    class="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--text-dim)] focus:bg-[var(--panel-bg)] transition-all uppercase tracking-widest">
                                    <option v-for="m in currentProviderModels" :key="m.id" :value="m.id">{{ m.name }}
                                    </option>
                                </select>
                            </div>

                            <div class="pt-4 flex justify-end">
                                <button @click="saveConfig" :disabled="isSaving"
                                    class="px-8 py-3 bg-[var(--accent-color)] text-[var(--panel-bg)] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Save class="w-4 h-4" />
                                    {{ isSaving ? 'Saving...' : 'Save Runtime Config' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>


    </div>
    <div v-else class="h-full flex items-center justify-center bg-[var(--bg-color)]">
        <div class="flex flex-col items-center gap-4 opacity-50">
            <div class="w-12 h-12 rounded-full border-2 border-[var(--border-color)] border-t-[var(--accent-color)] animate-spin"></div>
            <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Resolving Workspace...</p>
        </div>
    </div>

    <!-- Confirm Termination Modal -->
    <ConfirmModal 
        :show="showConfirm"
        title="Terminer le processus"
        subtitle="ZONE DE DANGER"
        message="Voulez-vous vraiment terminer ce processus d'agent ? L'instance sera supprimée de votre session actuelle."
        confirm-text="TERMINER"
        type="danger"
        @confirm="onTerminateConfirm"
        @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAgentStore } from '~/stores/agent'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import { ArrowLeft, Bot, Settings, Terminal, BotIcon, Save, History, Database, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const store = useAgentStore()

const id = route.params.id as string
const agent = computed(() => store.instances[id])

onMounted(() => {
    store.fetchProviders()
})

const goBack = () => {
    router.back()
}

const showConfirm = ref(false)

const terminateAgent = () => {
    showConfirm.value = true
}

const onTerminateConfirm = () => {
    store.removeInstance(id)
    router.push('/agents')
    showConfirm.value = false
}

const currentProviderModels = computed(() => {
    const a = agent.value
    if (!a) return []
    const provider = store.availableProviders.find(p => p.id === a.currentProvider)
    return provider ? provider.models : []
})

const onProviderChange = () => {
    const a = agent.value
    const models = currentProviderModels.value
    if (a && models.length > 0 && models[0]) {
        a.currentModel = models[0].id
    }
}

const isSaving = ref(false)

const saveConfig = async () => {
    const a = agent.value
    if (a) {
        isSaving.value = true
        try {
            await store.updateInstance(id, {
                name: a.name,
                workspace: a.currentWorkspace,
                model: a.currentModel,
                provider: a.currentProvider
            })
        } finally {
            isSaving.value = false
        }
    }
}

</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 10px;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from>div:last-child,
.modal-leave-to>div:last-child {
    transform: scale(0.95);
}
</style>
