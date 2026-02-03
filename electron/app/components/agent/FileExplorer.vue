<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Home, ArrowUp, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

interface FolderEntry {
    name: string
    path: string
    isExpanded: boolean
    isLoading: boolean
    children: FolderEntry[]
}

const currentPath = ref('~')
const directories = ref<string[]>([])
const selectedFolder = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const expandedFolders = ref<Set<string>>(new Set())

// Load directories for current path
const loadDirectories = async (path: string) => {
    isLoading.value = true
    error.value = null
    try {
        const result = await store.listDirectories(path)
        directories.value = result.filter(d => !d.startsWith('.'))
        currentPath.value = path
        selectedFolder.value = path
    } catch (e) {
        error.value = 'Failed to load directories'
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

// Navigate into a folder
const navigateTo = (folderName: string) => {
    const newPath = currentPath.value.endsWith('/')
        ? `${currentPath.value}${folderName}`
        : `${currentPath.value}/${folderName}`
    loadDirectories(newPath)
}

// Go up one level
const navigateUp = () => {
    const path = currentPath.value
    if (path === '~' || path === '/') return

    const lastSlash = path.lastIndexOf('/')
    if (lastSlash > 0) {
        loadDirectories(path.substring(0, lastSlash))
    } else if (lastSlash === 0) {
        loadDirectories('/')
    } else if (path.startsWith('~')) {
        loadDirectories('~')
    }
}

// Go to home
const navigateHome = () => {
    loadDirectories('~')
}

// Select current folder and create agent
const createAgent = () => {
    if (!selectedFolder.value || !instance.value) return

    // Set the workspace - this triggers the chat UI to show
    instance.value.currentWorkspace = selectedFolder.value
}

// Initialize
onMounted(() => {
    loadDirectories('~')
})

// Format path for display
const displayPath = computed(() => {
    return currentPath.value.replace(/^~/, '~')
})
</script>

<template>
    <div class="h-full flex flex-col bg-[#050505] select-none">
        <!-- Header -->
        <div class="p-6 border-b border-white/5 space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <FolderOpen class="w-5 h-5 text-white/40" />
                </div>
                <div>
                    <h2 class="text-xs font-black tracking-[0.2em] uppercase text-white">Select Workspace</h2>
                    <p class="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Choose a folder for
                        your agent</p>
                </div>
            </div>

            <!-- Path bar -->
            <div class="flex items-center gap-2">
                <button @click="navigateHome"
                    class="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    title="Go to home">
                    <Home class="w-4 h-4" />
                </button>
                <button @click="navigateUp"
                    class="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    :disabled="currentPath === '~' || currentPath === '/'"
                    :class="{ 'opacity-30 cursor-not-allowed': currentPath === '~' || currentPath === '/' }"
                    title="Go up">
                    <ArrowUp class="w-4 h-4" />
                </button>
                <button @click="loadDirectories(currentPath)"
                    class="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    title="Refresh">
                    <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                </button>
                <div
                    class="flex-1 px-4 py-2 bg-white/5 rounded-lg border border-white/5 text-[11px] font-mono text-white/60 truncate">
                    {{ displayPath }}
                </div>
            </div>
        </div>

        <!-- Directory List -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
            <div v-if="isLoading && directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <RefreshCw class="w-6 h-6 animate-spin" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
                </div>
            </div>

            <div v-else-if="error" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-red-400">{{ error }}</span>
                </div>
            </div>

            <div v-else-if="directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <Folder class="w-8 h-8" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">No folders here</span>
                </div>
            </div>

            <div v-else class="space-y-1">
                <button v-for="dir in directories" :key="dir" @click="navigateTo(dir)"
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left transition-all group">
                    <Folder class="w-4 h-4 text-yellow-500/60 group-hover:text-yellow-500 transition-colors" />
                    <span class="text-xs font-bold text-white/60 group-hover:text-white transition-colors truncate">{{
                        dir }}</span>
                    <ChevronRight class="w-3 h-3 text-white/20 group-hover:text-white/40 ml-auto transition-colors" />
                </button>
            </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 p-6 border-t border-white/5 space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-[9px] text-white/20 font-bold uppercase tracking-widest">Selected</p>
                    <p class="text-xs font-mono text-white/60 mt-1 truncate max-w-[300px]">{{ selectedFolder || 'None'
                    }}</p>
                </div>
                <button @click="createAgent" :disabled="!selectedFolder"
                    class="px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
                    <Plus class="w-4 h-4" />
                    Create Agent
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.1);
}
</style>
