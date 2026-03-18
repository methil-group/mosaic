<template>
    <div class="h-full overflow-y-auto bg-[var(--bg-color)]">
        <div class="flex flex-col min-h-full p-12 md:p-20 max-w-5xl mx-auto w-full">
            <!-- Header -->
            <div class="mb-12">
                <h1 class="text-3xl font-black uppercase tracking-widest text-[var(--text-main)] mb-2">Global Settings</h1>
                <p class="text-[var(--text-dim)] font-mono text-sm uppercase">Configure default behaviors for new agents.</p>
            </div>

            <!-- Settings Group -->
            <div class="space-y-24">
                <section class="space-y-8">
                    <div>
                        <h2 class="text-[12px] font-black uppercase tracking-[0.3em] text-[var(--text-dim)] mb-6">Appearance</h2>
                        <div class="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Interface Theme</p>
                                    <p class="text-[10px] text-[var(--text-dim)] font-mono mt-1 uppercase tracking-widest">Switch between light and dark aesthetics.</p>
                                </div>
                                <div class="flex bg-[var(--bg-color)] p-1 rounded-xl border border-[var(--border-color)]">
                                    <button 
                                        @click="store.setTheme('light')"
                                        :class="store.theme === 'light' ? 'bg-[var(--panel-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'"
                                        class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Light
                                    </button>
                                    <button 
                                        @click="store.setTheme('dark')"
                                        :class="store.theme === 'dark' ? 'bg-[var(--panel-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'"
                                        class="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <SettingsInference />
            </div>

            <!-- API Preferences -->
            <SettingsApiKeys v-model="openRouterKey" :success="saveStatus === 'success'" :disabled="isSavingKey" @save="saveApiKey" />

            <!-- Danger Zone -->
            <SettingsDangerZone />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '~/stores/agent'
import { ref, onMounted } from 'vue'
import SettingsInference from '../components/settings/SettingsInference.vue'
import SettingsApiKeys from '../components/settings/SettingsApiKeys.vue'
import SettingsDangerZone from '../components/settings/SettingsDangerZone.vue'

const store = useAgentStore()
const openRouterKey = ref('')
const isSavingKey = ref(false)
const saveStatus = ref<'idle' | 'success'>('idle')

onMounted(async () => {
    store.fetchProviders()
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
</script>

