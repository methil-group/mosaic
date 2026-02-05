<template>
    <div v-if="instance" class="relative group w-full">
        <!-- Queue Indicator -->
        <div v-if="instance.messageQueue.length > 0"
            class="absolute -top-10 left-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
                class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 backdrop-blur-md">
                <div class="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse"
                    :style="{ backgroundColor: instance.color }"></div>
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                    {{ instance.messageQueue.length }} Queued
                </span>
            </div>
        </div>

        <!-- Autocomplete Menu -->
        <div v-if="isMenuOpen && filteredFiles.length > 0"
            class="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div class="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">Files in Workspace</span>
            </div>
            <div class="max-h-64 overflow-y-auto p-1 custom-scrollbar-mini">
                <button v-for="(file, idx) in filteredFiles" :key="file" @mousedown.prevent="selectFile(file)"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all group"
                    :class="idx === menuIndex ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-600'"
                    :style="idx === menuIndex ? { backgroundColor: instance.color } : {}">
                    <File class="w-3.5 h-3.5 opacity-40 shrink-0" :class="{ 'opacity-100': idx === menuIndex }" />
                    <span class="text-xs font-mono truncate">{{ file }}</span>
                </button>
            </div>
        </div>

        <div class="flex items-end gap-2">
            <div class="input-box flex-1 flex items-end gap-2 transition-all focus-within:border-gray-400"
                :style="{ borderColor: isMenuOpen ? instance.color : '#eee' }">
                <textarea ref="textareaRef" v-model="prompt" @keydown="handleKeydown" @input="handleInput"
                    placeholder="Command..."
                    class="chat-input flex-1 bg-transparent border-none outline-none resize-none py-1 min-h-[24px] max-h-48 font-medium text-sm transition-all"
                    :class="{ 'overflow-y-auto': textareaRef && textareaRef.scrollHeight > 192 }"></textarea>

                <button v-if="instance.isProcessing" @click="store.stopProcessing(instanceId)"
                    class="p-1 text-red-500 hover:scale-110 transition-transform mb-1" title="Stop">
                    <Square class="w-4 h-4 fill-current" />
                </button>
                <button v-else-if="prompt.trim()" @click="handleSend"
                    class="p-1 hover:scale-110 transition-transform mb-1" :style="{ color: instance.color }"
                    title="Send">
                    <Send class="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Send, Square, File, Terminal } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])
const prompt = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Autocomplete State
const isMenuOpen = ref(false)
const menuQuery = ref('')
const menuIndex = ref(0)
const allFiles = ref<string[]>([])

const filteredFiles = computed(() => {
    if (!menuQuery.value) return allFiles.value.slice(0, 10)
    const q = menuQuery.value.toLowerCase()
    return allFiles.value
        .filter(f => f.toLowerCase().includes(q))
        .sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(q)
            const bStarts = b.toLowerCase().startsWith(q)
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1
            return a.length - b.length
        })
        .slice(0, 10)
})

const handleInput = async (e: Event) => {
    adjustHeight()
    const target = e.target as HTMLTextAreaElement
    const cursor = target.selectionStart
    const textBefore = target.value.substring(0, cursor)

    const lastAt = textBefore.lastIndexOf('@')
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBefore.charAt(lastAt - 1)))) {
        const query = textBefore.substring(lastAt + 1)
        if (!/\s/.test(query)) {
            if (!isMenuOpen.value) {
                isMenuOpen.value = true
                if (instance.value && instance.value.currentWorkspace) {
                    allFiles.value = await store.fetchFiles(instance.value.currentWorkspace)
                }
            }
            menuQuery.value = query
            menuIndex.value = 0
            return
        }
    }
    isMenuOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
    if (isMenuOpen.value && filteredFiles.value.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            menuIndex.value = (menuIndex.value + 1) % filteredFiles.value.length
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            menuIndex.value = (menuIndex.value - 1 + filteredFiles.value.length) % filteredFiles.value.length
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            const file = filteredFiles.value[menuIndex.value]
            if (file) selectFile(file)
        } else if (e.key === 'Escape') {
            isMenuOpen.value = false
        }
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
    }
}

const selectFile = (file: string) => {
    const target = textareaRef.value
    if (!target) return

    const cursor = target.selectionStart
    const textBefore = target.value.substring(0, cursor)
    const textAfter = target.value.substring(cursor)

    const lastAt = textBefore.lastIndexOf('@')
    const newText = textBefore.substring(0, lastAt) + file + ' ' + textAfter

    prompt.value = newText
    isMenuOpen.value = false

    nextTick(() => {
        const newCursor = lastAt + file.length + 1
        target.setSelectionRange(newCursor, newCursor)
        target.focus()
        adjustHeight()
    })
}

const adjustHeight = async () => {
    if (!textareaRef.value) return
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
}

watch(prompt, () => {
    nextTick(adjustHeight)
})

const handleSend = async () => {
    if (!instance.value || !prompt.value.trim() || instance.value.isProcessing) return
    const currentPrompt = prompt.value
    prompt.value = ''
    await store.sendMessage(props.instanceId, currentPrompt)
}
</script>
