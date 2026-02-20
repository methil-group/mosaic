<template>
    <div class="h-full overflow-y-auto bg-gray-50 selection:bg-gray-900 selection:text-white">
        <div class="flex flex-col min-h-full p-12 md:p-20 max-w-5xl mx-auto w-full">
            <ProfileHeader />

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
                        <!-- Left: Form -->
                        <ProfileForm v-model="nameInput" :success="showSaved" @save="saveProfile" />

                        <!-- Right: Preview -->
                        <ProfilePreview :name="nameInput" />
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
import { ref } from 'vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import ProfileForm from '../components/profile/ProfileForm.vue'
import ProfilePreview from '../components/profile/ProfilePreview.vue'

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
