<template>
    <div class="space-y-8">
        <div>
            <h2 class="text-xs font-black uppercase tracking-widest text-gray-600 mb-1">Inference Defaults</h2>
            <p class="text-[10px] uppercase tracking-wider text-gray-400">Applied to all newly created agents</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-24">
            <!-- Default Provider -->
            <div class="space-y-3">
                <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Default
                    Provider</label>
                <div class="grid grid-cols-1 gap-2">
                    <button v-for="provider in store.availableProviders" :key="provider.id"
                        @click="store.defaultProviderId = provider.id"
                        class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group"
                        :class="store.defaultProviderId === provider.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-100'">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            :class="store.defaultProviderId === provider.id ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'">
                            <Globe class="w-4 h-4" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-0.5">
                                <span class="text-xs font-black uppercase tracking-tight truncate">{{
                                    provider.name }}</span>
                                <Check v-if="store.defaultProviderId === provider.id" class="w-3 h-3" />
                            </div>
                            <span
                                class="text-[9px] font-mono opacity-60 uppercase tracking-widest block truncate">{{
                                    provider.id }}</span>
                        </div>
                    </button>
                </div>
            </div>

            <!-- Default Model -->
            <div class="space-y-3">
                <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Default
                    Model</label>
                <div class="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar-mini">
                    <button v-for="model in availableModelsForDefault" :key="model.id"
                        @click="store.defaultModelId = model.id"
                        class="flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left"
                        :class="store.defaultModelId === model.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-100'">
                        <div class="flex items-center justify-between w-full mb-0.5">
                            <span class="text-xs font-black uppercase tracking-tight">{{ model.name
                                }}</span>
                            <Check v-if="store.defaultModelId === model.id" class="w-3 h-3" />
                        </div>
                        <span class="text-[9px] font-mono opacity-50 uppercase tracking-widest">{{ model.id
                            }}</span>
                    </button>
                </div>
                <p v-if="availableModelsForDefault.length === 0"
                    class="text-[10px] text-gray-400 italic p-2">
                    Select a provider to see available models.
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Globe, Check } from 'lucide-vue-next'

const store = useAgentStore()

const availableModelsForDefault = computed(() => {
    const provider = store.availableProviders.find(p => p.id === store.defaultProviderId)
    return provider ? provider.models : []
})
</script>
