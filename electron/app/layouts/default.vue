<template>
    <div class="flex h-screen bg-black text-white">
        <AppSidebar />
        <main class="flex-1 overflow-hidden relative">
            <slot />
        </main>
    </div>
</template>

<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'
</script>

<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

body {
    margin: 0;
    padding: 0;
    background: #000000;
}

::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}
</style>
