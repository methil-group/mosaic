<script setup lang="ts">
import { useUserStore } from '~/stores/user'
import { User, Save, ArrowLeft } from 'lucide-vue-next'

const userStore = useUserStore()
const nameInput = ref(userStore.userName)

const saveProfile = () => {
    userStore.setUserName(nameInput.value)
}
</script>

<template>
    <div class="min-h-screen bg-black text-white p-8 font-sans selection:bg-purple-500/30">
        <div class="max-w-2xl mx-auto space-y-12">
            <!-- Header -->
            <header class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <NuxtLink to="/" class="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <ArrowLeft class="w-5 h-5 text-white/40 group-hover:text-white" />
                    </NuxtLink>
                    <h1 class="text-2xl font-black tracking-tighter uppercase italic">User Profile</h1>
                </div>
            </header>

            <!-- Profile Card -->
            <section class="relative group">
                <div class="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div class="relative bg-black border border-white/10 rounded-2xl p-8 space-y-8 backdrop-blur-3xl">
                    
                    <div class="flex items-center gap-6">
                        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center relative overflow-hidden group/avatar">
                           <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 opacity-0 group-hover/avatar:opacity-20 transition-opacity duration-500"></div>
                           <User class="w-10 h-10 text-white/50 group-hover/avatar:text-white transition-colors duration-500" />
                        </div>
                        <div>
                            <h2 class="text-xl font-bold tracking-tight">{{ userStore.userName || 'Anonymous Entity' }}</h2>
                            <p class="text-sm text-white/40 font-mono uppercase tracking-widest">Mosaic Resident</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <label class="block text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Identity Designation (Name)</label>
                        <div class="relative">
                            <input 
                                v-model="nameInput"
                                type="text" 
                                placeholder="Enter your name..."
                                class="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <button 
                        @click="saveProfile"
                        class="w-full flex items-center justify-center gap-3 bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-purple-500 hover:text-white transition-all duration-300 active:scale-[0.98]"
                    >
                        <Save class="w-4 h-4" />
                        Update Designation
                    </button>
                </div>
            </section>

            <!-- Info -->
            <footer class="text-center space-y-2">
                <p class="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">
                    Your designation will be transmitted to agents for personalized resonance.
                </p>
            </footer>
        </div>
    </div>
</template>
