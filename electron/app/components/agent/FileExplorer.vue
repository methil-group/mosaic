<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Home, ArrowUp, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
    instanceId?: string,
    title?: string,
    subtitle?: string
}>()

const emit = defineEmits(['select', 'cancel'])

const store = useAgentStore()
const instance = computed(() => props.instanceId ? store.instances[props.instanceId] : null)

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

// Load directories for current path
const loadDirectories = async (path: string) => {
    isLoading.value = true
    error.value = null
    try {
        const result = await store.listDirectories(path)
        directories.value = result.filter(d => !d.startsWith('.')).sort((a, b) => a.localeCompare(b))
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
    const separator = (currentPath.value === '/' || currentPath.value.endsWith('/')) ? '' : '/'
    const newPath = `${currentPath.value}${separator}${folderName}`
    loadDirectories(newPath)
}

// Go up one level
const navigateUp = () => {
    const path = currentPath.value
    if (path === '~' || path === '/') return

    // Special case for home relative paths
    if (path === '~') return

    const lastSlash = path.lastIndexOf('/')
    if (lastSlash > 0) {
        loadDirectories(path.substring(0, lastSlash))
    } else if (lastSlash === 0) {
        loadDirectories('/')
    } else if (path.startsWith('~')) {
        // If it's something like ~/Documents
        const homeParts = path.split('/')
        if (homeParts.length > 1) {
            homeParts.pop()
            loadDirectories(homeParts.join('/'))
        } else {
            loadDirectories('~')
        }
    }
}

// Go to home
const navigateHome = () => {
    loadDirectories('~')
}

// Select current folder
const handleSelect = () => {
    if (!selectedFolder.value) return
    
    if (instance.value) {
        instance.value.currentWorkspace = selectedFolder.value
    }
    
    emit('select', selectedFolder.value)
}

// Initialize
onMounted(() => {
    loadDirectories('~')
})

// Format path for display
const displayPath = computed(() => {
    return currentPath.value
})
</script>

<template>
    <div class="h-full flex flex-col bg-gray-50 select-none">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <FolderOpen class="w-5 h-5 text-gray-500" />
                </div>
                <div>
                    <h2 class="text-xs font-black tracking-[0.2em] uppercase text-gray-900">Select Workspace</h2>
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Choose a folder for
                        your agent</p>
                </div>
            </div>

            <!-- Path bar -->
            <div class="flex items-center gap-2">
                <button @click="navigateHome"
                    class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                    title="Go to home">
                    <Home class="w-4 h-4" />
                </button>
                <button @click="navigateUp"
                    class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                    :disabled="currentPath === '~' || currentPath === '/'"
                    :class="{ 'opacity-30 cursor-not-allowed': currentPath === '~' || currentPath === '/' }"
                    title="Go up">
                    <ArrowUp class="w-4 h-4" />
                </button>
                <button @click="loadDirectories(currentPath)"
                    class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                    title="Refresh">
                    <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                </button>
                <div
                    class="flex-1 px-4 py-2 bg-white rounded-lg border border-gray-200 text-[11px] font-mono text-gray-600 truncate">
                    {{ displayPath }}
                </div>
            </div>
        </div>

        <!-- Directory List -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar bg-white">
            <div v-if="isLoading && directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <RefreshCw class="w-6 h-6 animate-spin text-gray-500" />
                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Loading...</span>
                </div>
            </div>

            <div v-else-if="error" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-red-500">{{ error }}</span>
                </div>
            </div>

            <div v-else-if="directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <Folder class="w-8 h-8 text-gray-400" />
                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">No folders here</span>
                </div>
            </div>

            <div v-else class="space-y-1">
                <button v-for="dir in directories" :key="dir" @click="navigateTo(dir)"
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-left transition-all group">
                    <Folder class="w-4 h-4 text-amber-500/60 group-hover:text-amber-600 transition-colors" />
                    <span class="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors truncate">{{
                        dir }}</span>
                    <ChevronRight class="w-3 h-3 text-gray-300 group-hover:text-gray-500 ml-auto transition-colors" />
                </button>
            </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 p-6 border-t border-gray-100 space-y-4 bg-gray-50">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Selected</p>
                    <p class="text-xs font-mono text-gray-600 mt-1 truncate max-w-[300px]">{{ selectedFolder || 'None'
                    }}</p>
                </div>
                <button @click="createAgent" :disabled="!selectedFolder"
                    class="px-6 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
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
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.1);
}
</style>
