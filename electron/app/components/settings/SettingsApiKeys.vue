<template>
    <div class="space-y-8 mt-24">
        <div>
            <h2 class="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-1">API Preferences</h2>
            <p class="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Manage your external service keys</p>
        </div>

        <div class="max-w-xl space-y-4">
            <div class="space-y-3">
                <label class="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">OpenRouter API
                    Key</label>
                <div class="flex gap-2">
                    <input :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                        type="password" placeholder="sk-or-v1-..."
                        class="flex-1 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-dim)]/50 focus:outline-none focus:border-[var(--text-dim)] transition-all font-mono" />
                    <button @click="$emit('save')" :disabled="disabled"
                        class="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shrink-0"
                        :class="success ? 'bg-emerald-500 text-white' : 'bg-[var(--accent-color)] text-[var(--panel-bg)] hover:opacity-90 disabled:opacity-50'">
                        <span v-if="success">Saved</span>
                        <span v-else-if="disabled">Saving...</span>
                        <span v-else>Save key</span>
                    </button>
                </div>
                <p class="text-[9px] text-[var(--text-dim)] ml-1 italic">Your key is stored securely in your local SQLite
                    database.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string
    success: boolean
    disabled?: boolean
}>()

defineEmits(['update:modelValue', 'save'])
</script>
