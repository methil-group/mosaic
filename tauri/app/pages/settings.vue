<template>
    <div class="h-full overflow-y-auto bg-gray-50">
        <div class="flex flex-col min-h-full p-12 md:p-20 max-w-5xl mx-auto w-full">
            <!-- Header -->
            <div class="mb-12">
                <h1 class="text-3xl font-black uppercase tracking-widest text-gray-900 mb-2">Global Settings</h1>
                <p class="text-gray-500 font-mono text-sm">Configure default behaviors for new agents.</p>
            </div>

            <!-- Settings Group -->
            <div class="space-y-24">

                <!-- Default Inference Settings -->
                <div class="space-y-8">
                    <div>
                        <h2 class="text-xs font-black uppercase tracking-widest text-gray-600 mb-1">Inference Defaults
                        </h2>
                        <p class="text-[10px] uppercase tracking-wider text-gray-400">Applied to all newly created
                            agents
                        </p>
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
            </div>

            <!-- API Preferences -->
            <div class="space-y-8 mt-24">
                <div>
                    <h2 class="text-xs font-black uppercase tracking-widest text-gray-600 mb-1">API Preferences</h2>
                    <p class="text-[10px] uppercase tracking-wider text-gray-400">Manage your external service keys</p>
                </div>

                <div class="max-w-xl space-y-4">
                    <div class="space-y-3">
                        <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">OpenRouter API
                            Key</label>
                        <div class="flex gap-2">
                            <input v-model="openRouterKey" type="password" placeholder="sk-or-v1-..."
                                class="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-all font-mono" />
                            <button @click="saveApiKey" :disabled="isSavingKey"
                                class="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shrink-0"
                                :class="saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'">
                                <span v-if="saveStatus === 'success'">Saved</span>
                                <span v-else-if="isSavingKey">Saving...</span>
                                <span v-else>Save key</span>
                            </button>
                        </div>
                        <p class="text-[9px] text-gray-400 ml-1 italic">Your key is stored securely in your local SQLite
                            database.</p>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="space-y-8 mt-24 mb-24">
                <div class="border-t border-gray-200 pt-24">
                    <h2 class="text-xs font-black uppercase tracking-widest text-red-600 mb-1">Danger Zone</h2>
                    <p class="text-[10px] uppercase tracking-wider text-gray-400">Irreversible actions on your local
                        data</p>
                </div>

                <div class="max-w-xl p-6 rounded-2xl border border-red-100 bg-red-50/30 space-y-4">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Trash2 class="w-5 h-5" />
                        </div>
                        <div class="flex-1">
                            <h3 class="text-sm font-black uppercase tracking-tight text-gray-900 mb-1">Reset All Data</h3>
                            <p class="text-xs text-gray-500 mb-4 leading-relaxed">
                                This will permanently delete your SQLite database, clearing all agents, sessions, and
                                local settings. The application will relaunch immediately.
                            </p>
                            
                            <div class="flex flex-col gap-2">
                                <button v-if="!showResetConfirm" @click="showResetConfirm = true"
                                    class="w-full px-6 py-3 rounded-xl bg-white border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">
                                    Delete Every Data
                                </button>
                                
                                <div v-else class="flex gap-2">
                                    <button @click="resetAllData"
                                        class="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                                        Confirm Deletion
                                    </button>
                                    <button @click="showResetConfirm = false"
                                        class="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '~/stores/agent'
import { Globe, Check, Trash2 } from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'

const store = useAgentStore()
const openRouterKey = ref('')
const isSavingKey = ref(false)
const saveStatus = ref<'idle' | 'success'>('idle')
const showResetConfirm = ref(false)

onMounted(async () => {
    const key = await store.getSetting('openrouter_api_key')
    if (key) openRouterKey.value = key
})

const saveApiKey = async () => {
    if (isSavingKey.value) return
    isSavingKey.value = true

    const success = await store.setSetting('openrouter_api_key', openRouterKey.value)
    if (success) {
        saveStatus.value = 'success'
        setTimeout(() => {
            saveStatus.value = 'idle'
        }, 2000)
    }

    isSavingKey.value = false
}

const availableModelsForDefault = computed(() => {
    const provider = store.availableProviders.find(p => p.id === store.defaultProviderId)
    return provider ? provider.models : []
})

const resetAllData = async () => {
    if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('app:resetData')
    }
}
</script>
