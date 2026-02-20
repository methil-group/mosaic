<template>
    <div
        class="p-8 rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
        <div class="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-2">
            <User class="w-8 h-8 text-gray-400" />
        </div>
        <div>
            <h3 class="text-sm font-black uppercase tracking-widest text-gray-900">{{ name ||
                'Anonymous Entity' }}</h3>
            <p class="text-[9px] font-mono uppercase tracking-[0.3em] text-gray-400 mt-1">Authorized
                User</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next'

defineProps<{
    name: string
}>()
</script>
