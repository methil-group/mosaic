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

<template>
    <div class="h-full overflow-y-auto bg-black selection:bg-white selection:text-black">
        <div class="flex flex-col min-h-full p-12 md:p-20 max-w-5xl mx-auto w-full">
            <!-- Header -->
            <header class="flex items-center justify-between mb-16">
                <div class="flex items-center gap-6">
                    <NuxtLink to="/" class="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                        <ArrowLeft class="w-4 h-4 text-white/40 group-hover:text-white" />
                    </NuxtLink>
                    <div>
                        <h1 class="text-3xl font-black uppercase tracking-[0.2em] text-white mb-2 italic">Identity Designation</h1>
                        <p class="text-white/40 font-mono text-sm uppercase tracking-widest">Digital Resident Configuration</p>
                    </div>
                </div>
            </header>

            <!-- Main Config -->
            <div class="space-y-24">
                <section class="space-y-12">
                    <div class="flex items-end justify-between border-b border-white/5 pb-6">
                        <div>
                            <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2">Resident Profile</h2>
                            <p class="text-xs uppercase tracking-widest text-white/20">How agents will recognize you in the workspace</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                        <!-- Left: Input -->
                        <div class="space-y-6">
                            <div class="space-y-3">
                                <label class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Designation Name</label>
                                <div class="relative group">
                                    <input 
                                        v-model="nameInput"
                                        type="text" 
                                        placeholder="Enter designation..."
                                        class="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm font-black text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-white/10"
                                    />
                                    <div class="absolute inset-0 rounded-xl border border-white/20 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"></div>
                                </div>
                            </div>

                            <button 
                                @click="saveProfile"
                                class="w-full h-14 flex items-center justify-center gap-3 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <Check v-if="showSaved" class="w-4 h-4" />
                                <Save v-else class="w-4 h-4" />
                                {{ showSaved ? 'Designation Updated' : 'Update Designation' }}
                            </button>
                        </div>

                        <!-- Right: Preview -->
                        <div class="p-8 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                            <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                <User class="w-8 h-8 text-white/20" />
                            </div>
                            <div>
                                <h3 class="text-sm font-black uppercase tracking-widest text-white">{{ nameInput || 'Anonymous Entity' }}</h3>
                                <p class="text-[9px] font-mono uppercase tracking-[0.3em] text-white/20 mt-1">Authorized User</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Global Footer Info -->
            <footer class="mt-auto pt-24 border-t border-white/5">
                <p class="text-[8px] font-bold text-white/10 uppercase tracking-[0.5em] text-center">
                    Mosaic ecosystem v1.1.0 // Protocol: identity_v1
                </p>
            </footer>
        </div>
    </div>
</template>
