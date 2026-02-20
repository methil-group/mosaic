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

