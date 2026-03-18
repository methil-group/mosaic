<template>
    <div class="space-y-8 mt-24 mb-24">
        <div class="border-t border-[var(--border-color)] pt-24">
            <h2 class="text-xs font-black uppercase tracking-widest text-red-600 mb-1">Danger Zone</h2>
            <p class="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Irreversible actions on your local
                data</p>
        </div>

        <div class="max-w-xl p-6 rounded-2xl border border-red-100 bg-red-50/10 space-y-4">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 class="w-5 h-5" />
                </div>
                <div class="flex-1">
                    <h3 class="text-sm font-black uppercase tracking-tight text-[var(--text-main)] mb-1">Reset All Data</h3>
                    <p class="text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
                        This will permanently delete your SQLite database, clearing all agents, sessions, and
                        local settings. The application will relaunch immediately.
                    </p>
                    
                    <div class="flex flex-col gap-2">
                        <button @click="showConfirmModal = true"
                            class="w-full px-6 py-3 rounded-xl bg-[var(--panel-bg)] border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all">
                            Delete Every Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <ConfirmModal 
            :show="showConfirmModal"
            title="Réinitialiser les données"
            subtitle="ZONE DE DANGER"
            message="Cette action supprimera définitivement votre base de données SQLite, effaçant tous les agents, sessions et paramètres locaux. L'application redémarrera immédiatement."
            confirm-text="RÉINITIALISER"
            type="danger"
            @confirm="handleReset"
            @cancel="showConfirmModal = false"
        />
    </div>
</template>

<script setup lang="ts">
const { invoke } = (window as any).api
import ConfirmModal from '../ui/ConfirmModal.vue'
import { Trash2 } from 'lucide-vue-next'

const showConfirmModal = ref(false)

const handleReset = async () => {
    try {
        await invoke('app_reset_data')
    } catch (e) {
        console.error('Failed to reset data:', e)
    } finally {
        showConfirmModal.value = false
    }
}
</script>
