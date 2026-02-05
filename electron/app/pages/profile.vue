<template>
    <div class="h-full overflow-y-auto bg-gray-50 selection:bg-gray-900 selection:text-white">
        <div class="flex flex-col min-h-full p-12 md:p-20 max-w-5xl mx-auto w-full">
            <!-- Header -->
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

            <!-- Main Config -->
            <div class="space-y-24">
                <section class="space-y-12">
                    <div class="flex items-end justify-between border-b border-gray-100 pb-6">
                        <div>
                            <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Resident
                                Profile</h2>
                            <p class="text-xs uppercase tracking-widest text-gray-400">How agents will recognize you in
                                the workspace</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        <!-- Left: Input -->
                        <div class="space-y-6">
                            <div class="space-y-3">
                                <label
                                    class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Profile
                                    Name</label>
                                <div class="relative group">
                                    <input v-model="nameInput" type="text" placeholder="Enter profile name..."
                                        class="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm font-black text-gray-900 focus:outline-none focus:bg-gray-50 focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm" />
                                    <div
                                        class="absolute inset-0 rounded-xl border border-gray-400 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity">
                                    </div>
                                </div>
                            </div>

                            <button @click="saveProfile"
                                class="w-full h-14 flex items-center justify-center gap-3 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50">
                                <Check v-if="showSaved" class="w-4 h-4" />
                                <Save v-else class="w-4 h-4" />
                                {{ showSaved ? 'Profile Updated' : 'Update Profile' }}
                            </button>
                        </div>

                        <!-- Right: Preview -->
                        <div
                            class="p-8 rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                            <div
                                class="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-2">
                                <User class="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                                <h3 class="text-sm font-black uppercase tracking-widest text-gray-900">{{ nameInput ||
                                    'Anonymous Entity' }}</h3>
                                <p class="text-[9px] font-mono uppercase tracking-[0.3em] text-gray-400 mt-1">Authorized
                                    User</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Global Footer Info -->
            <footer class="mt-auto pt-24 border-t border-gray-100">
                <p class="text-[8px] font-bold text-gray-300 uppercase tracking-[0.5em] text-center">
                    Mosaic ecosystem v1.1.0 // Protocol: identity_v1
                </p>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/user'
import { User, Save, ArrowLeft, Check } from 'lucide-vue-next'
import { ref } from 'vue'

const userStore = useUserStore()
const nameInput = ref(userStore.userName)
const showSaved = ref(false)

const saveProfile = () => {
    userStore.setUserName(nameInput.value)
    showSaved.value = true
    setTimeout(() => {
        showSaved.value = false
    }, 2000)
}
</script>
