<template>
    <div class="flex flex-col h-full bg-black p-12 max-w-4xl mx-auto w-full">
        <!-- Header -->
        <div class="mb-12">
            <h1 class="text-3xl font-black uppercase tracking-widest text-white mb-2">Global Settings</h1>
            <p class="text-white/40 font-mono text-sm">Configure default behaviors for new agents.</p>
        </div>

        <!-- Settings Group -->
        <div class="space-y-24">

            <!-- Default Inference Settings -->
            <div class="space-y-8">
                <div>
                    <h2 class="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Inference Defaults</h2>
                    <p class="text-[10px] uppercase tracking-wider text-white/20">Applied to all newly created agents
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-24">
                    <!-- Default Provider -->
                    <div class="space-y-3">
                        <label class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Default
                            Provider</label>
                        <div class="grid grid-cols-1 gap-2">
                            <button v-for="provider in store.availableProviders" :key="provider.id"
                                @click="store.defaultProviderId = provider.id"
                                class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group"
                                :class="store.defaultProviderId === provider.id ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                    :class="store.defaultProviderId === provider.id ? 'bg-black text-white' : 'bg-white/10 text-white/40'">
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
                        <label class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Default
                            Model</label>
                        <div class="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar-mini">
                            <button v-for="model in availableModelsForDefault" :key="model.id"
                                @click="store.defaultModelId = model.id"
                                class="flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left"
                                :class="store.defaultModelId === model.id ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'">
                                <div class="flex items-center justify-between w-full mb-0.5">
                                    <span class="text-xs font-black uppercase tracking-tight">{{ model.name }}</span>
                                    <Check v-if="store.defaultModelId === model.id" class="w-3 h-3" />
                                </div>
                                <span class="text-[9px] font-mono opacity-40 uppercase tracking-widest">{{ model.id
                                }}</span>
                            </button>
                        </div>
                        <p v-if="availableModelsForDefault.length === 0" class="text-[10px] text-white/20 italic p-2">
                            Select a provider to see available models.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '~/stores/agent'
import { Globe, Check } from 'lucide-vue-next'
import { computed } from 'vue'

const store = useAgentStore()

const availableModelsForDefault = computed(() => {
    const provider = store.availableProviders.find(p => p.id === store.defaultProviderId)
    return provider ? provider.models : []
})
</script>
