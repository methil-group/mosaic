<template>
    <div class="flex h-screen bg-gray-50 text-gray-900">
        <AppSidebar />
        <main class="flex-1 overflow-hidden relative">
            <slot />
        </main>
    </div>
</template>

<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'
import { useAgentStore } from '~/stores/agent'
import { onMounted } from 'vue'

const store = useAgentStore()

onMounted(async () => {
    await store.loadAgents()
    await store.fetchProviders()
})
</script>

<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

body {
    margin: 0;
    padding: 0;
    background: #f9fafb;
}

::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
}
</style>

