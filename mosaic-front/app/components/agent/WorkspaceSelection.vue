<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Folder, Sparkles, ArrowRight, Bot } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

const workspacePath = ref('')
const agentName = ref(instance.value?.name || '')
const workspaceSuggestions = ref<string[]>([])
const allSuggestionsForPath = ref<string[]>([])
const lastFetchedPath = ref('')
const selectedIndex = ref(-1)
const isWorkspaceMenuOpen = ref(false)
const isInputFocused = ref(false)

const fetchWorkspaceSuggestions = async () => {
    if (!workspacePath.value) return
    const currentPath = workspacePath.value

    let parentPath = currentPath
    let partial = ''

    if (!currentPath.endsWith('/')) {
        const lastSlash = currentPath.lastIndexOf('/')
        if (lastSlash !== -1) {
            parentPath = currentPath.substring(0, lastSlash + 1)
            partial = currentPath.substring(lastSlash + 1)
        } else {
            parentPath = './'
            partial = currentPath
        }
    }

    if (parentPath !== lastFetchedPath.value) {
        const dirs = await store.listDirectories(parentPath)
        allSuggestionsForPath.value = dirs
        lastFetchedPath.value = parentPath
    }

    workspaceSuggestions.value = allSuggestionsForPath.value.filter(d =>
        d.toLowerCase().startsWith(partial.toLowerCase())
    )

    selectedIndex.value = -1
    isWorkspaceMenuOpen.value = workspaceSuggestions.value.length > 0
}

const handleTab = (event: KeyboardEvent) => {
    if (!isWorkspaceMenuOpen.value || workspaceSuggestions.value.length === 0) return
    event.preventDefault()

    selectedIndex.value = (selectedIndex.value + 1) % workspaceSuggestions.value.length

    const dir = workspaceSuggestions.value[selectedIndex.value]
    const lastSlash = workspacePath.value.lastIndexOf('/')
    const parent = workspacePath.value.substring(0, lastSlash + 1)
    workspacePath.value = `${parent}${dir}`
}

const handleEnter = (event: KeyboardEvent) => {
    if (isWorkspaceMenuOpen.value && workspaceSuggestions.value.length > 0) {
        if (selectedIndex.value !== -1 || workspaceSuggestions.value.length === 1) {
            event.preventDefault()
            const idx = selectedIndex.value === -1 ? 0 : selectedIndex.value
            const dir = workspaceSuggestions.value[idx]
            const lastSlash = workspacePath.value.lastIndexOf('/')
            const parent = workspacePath.value.substring(0, lastSlash + 1)

            workspacePath.value = `${parent}${dir}/`
            isWorkspaceMenuOpen.value = false
            fetchWorkspaceSuggestions()
            return
        }
    }
    
    if (workspacePath.value) {
        setWorkspace()
    }
}

const selectWorkspaceSuggestion = (dir: string) => {
    const lastSlash = workspacePath.value.lastIndexOf('/')
    const parent = workspacePath.value.substring(0, lastSlash + 1)

    workspacePath.value = `${parent}${dir}/`
    fetchWorkspaceSuggestions()
}

const setWorkspace = () => {
    if (instance.value && workspacePath.value) {
        instance.value.currentWorkspace = workspacePath.value
        instance.value.name = agentName.value
    }
}

const closeWorkspaceMenu = () => {
    setTimeout(() => {
        isWorkspaceMenuOpen.value = false
    }, 200)
}

watch(workspacePath, () => {
    if (isInputFocused.value) {
        fetchWorkspaceSuggestions()
    }
})
</script>

<template>
    <div class="flex flex-col items-center justify-center h-full p-8 bg-black relative">
        <!-- Background Glow -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-[120px]"></div>
            <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-white/2 rounded-full blur-[120px]"></div>
        </div>

        <div class="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
            <!-- Header -->
            <div class="flex flex-col items-center text-center space-y-4">
                <div class="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
                    <Bot class="w-8 h-8 text-black" />
                </div>
                <div class="space-y-1">
                    <h2 class="text-xs font-black uppercase tracking-[0.3em] text-white">Initialize Agent</h2>
                    <p class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Setup workspace & configuration</p>
                </div>
            </div>

            <!-- Form -->
            <div class="space-y-6">
                <!-- Name Section -->
                <div class="space-y-2">
                    <label class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Instance Name</label>
                    <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:ring-4 focus-within:ring-white/5 focus-within:border-white/20 transition-all">
                        <Sparkles class="w-4 h-4 text-white/20" />
                        <input v-model="agentName" 
                            class="flex-1 bg-transparent border-none p-0 text-sm font-bold text-white outline-none placeholder:text-white/10"
                            placeholder="AGENT NAME" />
                    </div>
                </div>

                <!-- Workspace Section -->
                <div class="space-y-2">
                    <label class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Workspace Path</label>
                    <div class="relative">
                        <div class="flex items-center gap-3 bg-white/5 border border-white/20 rounded-xl px-4 py-4 focus-within:ring-8 focus-within:ring-white/5 focus-within:border-white/40 transition-all bg-gradient-to-br from-white/[0.02] to-transparent">
                            <Folder class="w-5 h-5 text-white/40" />
                            <input v-model="workspacePath"
                                @focus="isInputFocused = true; fetchWorkspaceSuggestions()"
                                @blur="closeWorkspaceMenu" 
                                @keydown.tab="handleTab"
                                @keydown.enter="handleEnter"
                                class="flex-1 bg-transparent border-none p-0 text-base font-mono text-white outline-none placeholder:text-white/10"
                                placeholder="/path/to/workspace" />
                        </div>

                        <!-- Autocomplete Dropdown -->
                        <div v-if="isWorkspaceMenuOpen"
                            class="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl shadow-3xl z-[150] overflow-hidden">
                            <div class="max-h-48 overflow-y-auto p-1 space-y-0.5 custom-scrollbar-mini">
                                <button v-for="(dir, sIdx) in workspaceSuggestions" :key="dir"
                                    @mousedown.prevent="selectWorkspaceSuggestion(dir)"
                                    class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                                    :class="{ 'bg-white/10': selectedIndex === sIdx }">
                                    <Folder class="w-3.5 h-3.5 text-white/20 group-hover:text-white/60"
                                        :class="{ 'text-white/60': selectedIndex === sIdx }" />
                                    <span class="text-xs font-mono text-white/40 group-hover:text-white"
                                        :class="{ 'text-white': selectedIndex === sIdx }">{{ dir }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <button @click="setWorkspace"
                    :disabled="!workspacePath"
                    class="w-full group flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:pointer-events-none">
                    Create Workspace
                    <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            <!-- Footer Info -->
            <div class="flex items-center justify-center gap-4 text-white/10">
                <div class="h-px flex-1 bg-white/5"></div>
                <span class="text-[8px] font-bold uppercase tracking-widest">Mosaic OS</span>
                <div class="h-px flex-1 bg-white/5"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar-mini::-webkit-scrollbar {
    width: 3px;
}

.custom-scrollbar-mini::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar-mini::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}
</style>
