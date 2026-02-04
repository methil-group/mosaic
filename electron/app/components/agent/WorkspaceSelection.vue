<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Folder, Sparkles, ArrowRight, Bot, Cpu, Check } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

const workspacePath = ref('')
const agentName = ref(instance.value?.name || '')
const selectedModel = ref(store.defaultModelId)
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
        instance.value.currentModel = selectedModel.value
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
    <div class="w-full h-full overflow-y-auto bg-gray-50 relative custom-scrollbar-mini">
        <!-- Background Glow -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gray-200/50 rounded-full blur-[120px]"></div>
            <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gray-100/50 rounded-full blur-[120px]"></div>
        </div>

        <div class="flex flex-col items-center justify-center min-h-full p-4 lg:p-10 w-full box-border">
            <div class="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500 relative z-10">
                <!-- Header (Always centered on top) -->
                <div class="flex flex-col items-center text-center space-y-3 mb-8 lg:mb-12">
                    <div class="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center shadow-2xl">
                        <Bot class="w-6 h-6 text-white" />
                    </div>
                    <div class="space-y-1">
                        <h2 class="text-xs font-black uppercase tracking-[0.3em] text-gray-900">Initialize Agent</h2>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setup workspace &
                            configuration</p>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

                    <!-- Left: Identity & Path -->
                    <div class="space-y-5">
                        <!-- Name Section -->
                        <div class="space-y-1.5">
                            <label class="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Instance
                                Name</label>
                            <div
                                class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-4 focus-within:ring-gray-100 focus-within:border-gray-400 transition-all shadow-sm">
                                <Sparkles class="w-4 h-4 text-gray-400" />
                                <input v-model="agentName"
                                    class="flex-1 bg-transparent border-none p-0 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
                                    placeholder="AGENT NAME" />
                            </div>
                        </div>

                        <!-- Workspace Section -->
                        <div class="space-y-1.5">
                            <label class="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Workspace
                                Path</label>
                            <div class="relative">
                                <div
                                    class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus-within:ring-8 focus-within:ring-gray-100 focus-within:border-gray-400 transition-all shadow-sm">
                                    <Folder class="w-5 h-5 text-gray-400" />
                                    <input v-model="workspacePath"
                                        @focus="isInputFocused = true; fetchWorkspaceSuggestions()"
                                        @blur="closeWorkspaceMenu" @keydown.tab="handleTab" @keydown.enter="handleEnter"
                                        class="flex-1 bg-transparent border-none p-0 text-[13px] font-mono text-gray-900 outline-none placeholder:text-gray-300"
                                        placeholder="/path/to/workspace" />
                                </div>

                                <!-- Autocomplete Dropdown -->
                                <div v-if="isWorkspaceMenuOpen"
                                    class="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[150] overflow-hidden">
                                    <div class="max-h-48 overflow-y-auto p-1 space-y-0.5 custom-scrollbar-mini">
                                        <button v-for="(dir, sIdx) in workspaceSuggestions" :key="dir"
                                            @mousedown.prevent="selectWorkspaceSuggestion(dir)"
                                            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left transition-colors group"
                                            :class="{ 'bg-gray-200': selectedIndex === sIdx }">
                                            <Folder class="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600"
                                                :class="{ 'text-gray-600': selectedIndex === sIdx }" />
                                            <span class="text-xs font-mono text-gray-500 group-hover:text-gray-900"
                                                :class="{ 'text-gray-900': selectedIndex === sIdx }">{{ dir }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Logic Model -->
                    <div class="space-y-5">
                        <div class="space-y-1.5 h-full">
                            <label class="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Logic
                                Model</label>
                            <div
                                class="grid grid-cols-1 gap-1.5 max-h-48 md:max-h-64 overflow-y-auto pr-2 custom-scrollbar-mini">
                                <button v-for="model in store.availableModels" :key="model.id"
                                    @click="selectedModel = model.id"
                                    class="flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left w-full shadow-sm"
                                    :class="selectedModel === model.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-100'">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-black uppercase tracking-tight">{{ model.name
                                            }}</span>
                                        <span
                                            class="text-[7px] font-mono opacity-50 uppercase tracking-widest line-clamp-1">{{
                                            model.id }}</span>
                                    </div>
                                    <Check v-if="selectedModel === model.id" class="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button (Full Width Spanning Columns) -->
                    <div class="md:col-span-2 w-full pt-2">
                        <button @click="setWorkspace" :disabled="!workspacePath"
                            class="w-full group flex items-center justify-center gap-3 px-6 py-4 md:py-5 rounded-2xl bg-gray-900 text-white text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:pointer-events-none shadow-2xl">
                            Create Workspace
                            <ArrowRight class="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>

                <!-- Footer Info -->
                <div class="flex items-center justify-center gap-6 text-gray-300 mt-12 lg:mt-20">
                    <div class="h-px flex-1 bg-gray-200"></div>
                    <span class="text-[9px] font-bold uppercase tracking-[0.4em]">Mosaic OS</span>
                    <div class="h-px flex-1 bg-gray-200"></div>
                </div>
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
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}
</style>
