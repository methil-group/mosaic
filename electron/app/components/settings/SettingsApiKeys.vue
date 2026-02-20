<template>
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
                    <input :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                        type="password" placeholder="sk-or-v1-..."
                        class="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-all font-mono" />
                    <button @click="$emit('save')" :disabled="disabled"
                        class="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shrink-0"
                        :class="success ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'">
                        <span v-if="success">Saved</span>
                        <span v-else-if="disabled">Saving...</span>
                        <span v-else>Save key</span>
                    </button>
                </div>
                <p class="text-[9px] text-gray-400 ml-1 italic">Your key is stored securely in your local SQLite
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
