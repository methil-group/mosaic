<template>
    <Teleport to="body">
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="modelValue && instance" class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/40 backdrop-blur-md" @click="close"></div>

                <!-- Modal Content -->
                <div
                    class="relative w-full max-w-4xl bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                    <div
                        class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-color)]/50 shrink-0">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-[var(--accent-color)] flex items-center justify-center">
                                <Settings class="w-4 h-4 text-[var(--panel-bg)]" />
                            </div>
                            <h2 class="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Agent Configuration
                            </h2>
                        </div>
                        <button @click="close"
                            class="p-2 hover:bg-[var(--bg-color)] rounded-lg transition-colors text-[var(--text-dim)] hover:text-[var(--text-main)]">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                    <div class="flex-1 overflow-hidden">
                        <div class="grid grid-cols-2 h-full">
                            <!-- Left Column: Metadata -->
                            <div class="p-6 space-y-6 overflow-y-auto border-r border-[var(--border-color)] custom-scrollbar-mini">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-4">
                                    Metadata & Config</h3>

                                <!-- Name Section -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Instance
                                        Name</label>
                                    <input v-model="instance.name"
                                        class="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:ring-4 focus:ring-[var(--accent-color)]/5 focus:border-[var(--text-dim)] transition-all outline-none"
                                        placeholder="Enter instance name..." />
                                </div>


                            </div>

                            <!-- Right Column: Provider -->
                            <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar-mini bg-[var(--bg-color)]/30">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-4">
                                    Inference Configuration</h3>

                                <!-- Model Selection -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Logic
                                        Model</label>
                                    <div
                                        class="grid grid-cols-1 gap-1.5 overflow-y-auto pr-2 custom-scrollbar-mini max-h-48">
                                        <button v-for="model in filteredModels" :key="model.id"
                                            @click="selectModel(model.id)"
                                            class="flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left group"
                                            :class="instance.currentModel === model.id ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--panel-bg)]' : 'bg-[var(--panel-bg)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--panel-hover)]'">
                                            <div class="flex items-center justify-between w-full mb-0.5">
                                                <span class="text-xs font-black uppercase tracking-tight">{{
                                                    model.name }}</span>
                                                <Check v-if="instance.currentModel === model.id" class="w-3 h-3" />
                                            </div>
                                            <span class="text-[9px] font-mono opacity-50 uppercase tracking-widest">{{
                                                model.id }}</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Provider Selection -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Inference
                                        Provider</label>

                                    <div class="grid grid-cols-1 gap-2">
                                        <button v-for="provider in store.availableProviders" :key="provider.id"
                                            @click="selectProvider(provider.id)"
                                            class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group"
                                            :class="selectedProviderId === provider.id ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--panel-bg)]' : 'bg-[var(--panel-bg)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--panel-hover)] hover:border-[var(--text-dim)]'">
                                            <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                                :class="selectedProviderId === provider.id ? 'bg-[var(--panel-bg)]' : 'bg-[var(--bg-color)]'">
                                                <Globe class="w-4 h-4" :class="selectedProviderId === provider.id ? 'text-[var(--accent-color)]' : 'text-[var(--text-dim)]'" />
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs font-black uppercase tracking-tight">{{
                                                        provider.name }}</span>
                                                    <Check v-if="selectedProviderId === provider.id" class="w-3 h-3" />
                                                </div>
                                                <span
                                                    class="text-[9px] font-mono opacity-60 uppercase tracking-widest">{{ 
                                                        provider.models.length > 0 ? 'Available' : 'Offline' 
                                                    }}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Provider-specific Settings Section (New) -->
                        <div class="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--panel-bg)] shrink-0">
                            <h3 class="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">
                                Provider Settings</h3>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between">
                                        <label class="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">
                                            LM Studio Base URL (WSL/Remote)
                                        </label>
                                        <span v-if="isWslDetected" class="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                            WSL Detected
                                        </span>
                                    </div>
                                    <div class="flex gap-2">
                                        <input v-model="lmStudioUrl"
                                            class="flex-1 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-mono text-[var(--text-main)] focus:ring-4 focus:ring-[var(--accent-color)]/5 focus:border-[var(--text-dim)] transition-all outline-none"
                                            placeholder="http://localhost:1234/v1" />
                                        <button @click="saveLmStudioUrl"
                                            class="px-4 py-3 bg-[var(--accent-color)] text-[var(--panel-bg)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95">
                                            Save
                                        </button>
                                    </div>
                                    <p class="text-[9px] text-gray-400 ml-1">
                                        Restart app after changing this value. Default is http://localhost:1234/v1.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-[var(--bg-color)]/50 border-t border-[var(--border-color)] flex justify-end px-6 shrink-0">
                        <button @click="close"
                            class="px-6 py-2 rounded-xl bg-[var(--accent-color)] text-[var(--panel-bg)] text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Settings, X, Check, Globe } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const store = useAgentStore()
const lmStudioUrl = ref('')
const isWslDetected = ref(false)

const saveLmStudioUrl = async () => {
    await store.setSetting('lm_studio_base_url', lmStudioUrl.value)
}

const instance = computed(() => store.instances[props.instanceId])
const selectedProviderId = ref('')

const filteredModels = computed(() => {
    const provider = store.availableProviders.find(p => p.id === selectedProviderId.value)
    return provider?.models || []
})

onMounted(async () => {
    lmStudioUrl.value = await store.getSetting('lm_studio_base_url') || ''

    // Initialize selectedProviderId based on current model
    const currentInstance = instance.value
    if (currentInstance) {
        const currentModelId = currentInstance.currentModel
        const provider = store.availableProviders.find(p => 
            p.models && p.models.some(m => m.id === currentModelId)
        )
        if (provider) {
            selectedProviderId.value = provider.id
        } else if (store.availableProviders.length > 0) {
            const firstProvider = store.availableProviders[0]
            if (firstProvider) {
                selectedProviderId.value = firstProvider.id
            }
        }
    }
})

const selectProvider = (providerId: string) => {
    selectedProviderId.value = providerId
    
    // Auto-select first model if current isn't in new provider
    const provider = store.availableProviders.find(p => p.id === providerId)
    const currentInstance = instance.value
    if (provider && provider.models && provider.models.length > 0 && currentInstance) {
        const hasCurrentModel = provider.models.some(m => m.id === currentInstance.currentModel)
        if (!hasCurrentModel) {
            const firstModel = provider.models[0]
            if (firstModel) {
                selectModel(firstModel.id)
            }
        } else {
            // Even if model hasn't changed, the provider has.
            store.updateInstance(props.instanceId, { provider: providerId })
        }
    }
}



const selectModel = (modelId: string) => {
    store.updateInstance(props.instanceId, { 
        model: modelId,
        provider: selectedProviderId.value 
    })
}



const close = () => {
    emit('update:modelValue', false)
}
</script>

<style scoped>
.custom-scrollbar-mini::-webkit-scrollbar {
    width: 3px;
}

.custom-scrollbar-mini::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar-mini::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 10px;
}
</style>
