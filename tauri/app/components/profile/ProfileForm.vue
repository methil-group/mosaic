<template>
    <div class="space-y-6">
        <div class="space-y-3">
            <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Profile
                Name</label>
            <div class="relative group">
                <input :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                    type="text" placeholder="Enter profile name..."
                    class="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm font-black text-gray-900 focus:outline-none focus:bg-gray-50 focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm" />
                <div
                    class="absolute inset-0 rounded-xl border border-gray-400 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity">
                </div>
            </div>
        </div>

        <button @click="$emit('save')" :disabled="disabled"
            class="w-full h-14 flex items-center justify-center gap-3 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50">
            <Check v-if="success" class="w-4 h-4" />
            <Save v-else class="w-4 h-4" />
            {{ success ? 'Profile Updated' : 'Update Profile' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { Save, Check } from 'lucide-vue-next'

defineProps<{
    modelValue: string
    success: boolean
    disabled?: boolean
}>()

defineEmits(['update:modelValue', 'save'])
</script>
