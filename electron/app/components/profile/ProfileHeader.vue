<template>
    <header class="flex items-center justify-between mb-16">
        <div class="flex items-center gap-6">
            <NuxtLink to="/"
                class="p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 transition-all group shadow-sm">
                <ArrowLeft class="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
            </NuxtLink>
            <div>
                <h1 class="text-3xl font-black uppercase tracking-[0.2em] text-gray-900 mb-2 italic">Identity
                    Profile</h1>
                <p class="text-gray-500 font-mono text-sm uppercase tracking-widest">Digital Resident
                    Configuration</p>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
</script>
