import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUserStore = defineStore('user', () => {
    const userName = ref<string>(localStorage.getItem('mosaic_user_name') || '')

    watch(userName, (newName) => {
        localStorage.setItem('mosaic_user_name', newName)
    })

    const setUserName = (name: string) => {
        userName.value = name
    }

    return {
        userName,
        setUserName
    }
})
