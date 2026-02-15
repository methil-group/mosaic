<template>
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
                        <button v-if="!showConfirm" @click="showConfirm = true"
                            class="w-full px-6 py-3 rounded-xl bg-white border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">
                            Delete Every Data
                        </button>
                        
                        <div v-else class="flex gap-2">
                            <button @click="handleReset"
                                class="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                                Confirm Deletion
                            </button>
                            <button @click="showConfirm = false"
                                class="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'

const showConfirm = ref(false)

const handleReset = async () => {
    try {
        await invoke('app_reset_data')
    } catch (e) {
        console.error('Failed to reset data:', e)
        if (confirm('Reset all data? This will clear your database.')) {
            // Manual fallback if invoke fails? 
        }
    }
}
</script>
