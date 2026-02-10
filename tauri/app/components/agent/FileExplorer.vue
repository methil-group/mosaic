<template>
    <div class="h-full flex flex-col bg-white select-none relative overflow-hidden">
        <!-- Decoration Gradient -->
        <div
            class="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none">
        </div>

        <!-- Header -->
        <div class="p-6 space-y-4 relative z-10">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div
                        class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                        <FolderOpen class="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h2 class="text-xs font-black tracking-[0.2em] uppercase text-gray-900">{{ title ||
                            'Explorateur' }}</h2>
                        <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{{ subtitle ||
                            'Choisissez un emplacement' }}</p>
                    </div>
                </div>
                <button v-if="!instanceId" @click="emit('cancel')"
                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Path bar -->
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                    <button @click="navigateHome"
                        class="p-2.5 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 text-gray-500 hover:text-indigo-600 shadow-sm hover:shadow transition-all"
                        title="Go to home">
                        <Home class="w-4 h-4" />
                    </button>
                    <button @click="navigateUp"
                        class="p-2.5 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 text-gray-500 hover:text-indigo-600 shadow-sm hover:shadow transition-all"
                        :disabled="currentPath === '~' || currentPath === '/'"
                        :class="{ 'opacity-30 cursor-not-allowed': currentPath === '~' || currentPath === '/' }"
                        title="Go up">
                        <ArrowUp class="w-4 h-4" />
                    </button>
                    <button @click="loadDirectories(currentPath)"
                        class="p-2.5 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 text-gray-500 hover:text-indigo-600 shadow-sm hover:shadow transition-all"
                        title="Refresh">
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                    </button>
                    <button @click="startFolderCreation"
                        class="p-2.5 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 text-gray-500 hover:text-indigo-600 shadow-sm hover:shadow transition-all"
                        title="New Folder">
                        <Plus class="w-4 h-4" />
                    </button>
                </div>
                <div
                    class="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] font-mono text-gray-500 truncate shadow-inner">
                    {{ displayPath }}
                </div>
            </div>
        </div>

        <!-- Directory List -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar bg-white relative z-10">
            <div v-if="isLoading && directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <RefreshCw class="w-8 h-8 animate-spin text-indigo-500" />
                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scan en cours...</span>
                </div>
            </div>

            <div v-else-if="error" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <AlertCircle class="w-8 h-8 text-red-400" />
                    <span class="text-[10px] font-bold uppercase tracking-widest text-red-500">{{ error }}</span>
                </div>
            </div>

            <div v-else-if="directories.length === 0" class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 opacity-40">
                    <Folder class="w-10 h-10 text-gray-300" />
                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Aucun dossier</span>
                </div>
            </div>

            <div v-else class="grid grid-cols-1 gap-1">
                <!-- New Folder Input -->
                <div v-if="isCreatingFolder" class="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-indigo-50/30 border border-indigo-200 animate-in fade-in slide-in-from-top-2">
                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-indigo-100">
                        <Folder class="w-4 h-4 text-indigo-500" />
                    </div>
                    <input v-model="newFolderName" ref="newFolderInput" placeholder="Nom du dossier..." 
                        @keydown.enter="handleCreateFolder" @keydown.esc="cancelFolderCreation"
                        class="flex-1 bg-transparent border-none text-xs font-bold text-indigo-900 placeholder:text-indigo-300 focus:ring-0 outline-none" />
                    <div class="flex gap-1">
                        <button @click="handleCreateFolder" class="p-1 px-2 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-100/50 rounded-lg">CRÉER</button>
                        <button @click="cancelFolderCreation" class="p-1 px-2 text-[10px] font-black uppercase text-gray-400 hover:bg-gray-100 rounded-lg">ANNULER</button>
                    </div>
                </div>

                <button v-for="dir in directories" :key="dir" @click="navigateTo(dir)"
                    class="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-indigo-50/50 text-left transition-all group border border-transparent hover:border-indigo-100">
                    <div
                        class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-indigo-100 transition-all">
                        <Folder class="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span
                        class="text-xs font-bold text-gray-600 group-hover:text-indigo-900 transition-colors truncate">{{
                        dir }}</span>
                    <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-indigo-400 ml-auto transition-colors" />
                </button>
            </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 p-6 border-t border-gray-100 bg-gray-50/50 relative z-10 backdrop-blur-sm">
            <div class="flex items-center justify-between gap-6">
                <div class="flex-1 min-w-0">
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Emplacement
                        sélectionné</p>
                    <p class="text-[11px] font-mono text-indigo-600 mt-1.5 truncate">{{ selectedFolder || '...' }}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button v-if="!instanceId" @click="emit('cancel')"
                        class="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                        ANNULER
                    </button>
                    <button @click="handleSelect" :disabled="!selectedFolder"
                        class="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
                        <Plus class="w-4 h-4" />
                        {{ instanceId ? 'CHOISIR' : 'SÉLECTIONNER' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Home, ArrowUp, RefreshCw, X, AlertCircle } from 'lucide-vue-next'

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

// Folder creation state
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const newFolderInput = ref<HTMLInputElement | null>(null)

// Load directories for current path
const loadDirectories = async (path: string) => {
    isLoading.value = true
    error.value = null
    isCreatingFolder.value = false // Close creation UI on navigation
    newFolderName.value = ''
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

// Folder creation logic
const startFolderCreation = () => {
    isCreatingFolder.value = true
    newFolderName.value = ''
    setTimeout(() => {
        newFolderInput.value?.focus()
    }, 100)
}

const cancelFolderCreation = () => {
    isCreatingFolder.value = false
    newFolderName.value = ''
}

const handleCreateFolder = async () => {
    if (!newFolderName.value) return
    
    try {
        if ((window as any).api?.createDirectory) {
            await (window as any).api.createDirectory(currentPath.value, newFolderName.value)
            await loadDirectories(currentPath.value)
            isCreatingFolder.value = false
            newFolderName.value = ''
        } else {
            throw new Error('API not available')
        }
    } catch (e: any) {
        error.value = `Erreur: ${e.message}`
        console.error(e)
    }
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.1);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.2);
}
</style>
