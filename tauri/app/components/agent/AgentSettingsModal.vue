<template>
    <Teleport to="body">
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="modelValue && instance" class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/40 backdrop-blur-md" @click="close"></div>

                <!-- Modal Content -->
                <div
                    class="relative w-full max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                    <div
                        class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                                <Settings class="w-4 h-4 text-white" />
                            </div>
                            <h2 class="text-xs font-black uppercase tracking-widest text-gray-900">Agent Configuration
                            </h2>
                        </div>
                        <button @click="close"
                            class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                    <div class="flex-1 overflow-hidden">
                        <div class="grid grid-cols-2 h-full">
                            <!-- Left Column: Metadata -->
                            <div class="p-6 space-y-6 overflow-y-auto border-r border-gray-100 custom-scrollbar-mini">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                                    Metadata & Config</h3>

                                <!-- Name Section -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Instance
                                        Name</label>
                                    <input v-model="instance.name"
                                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all outline-none"
                                        placeholder="Enter instance name..." />
                                </div>

                                <!-- Workspace Section -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Workspace
                                        Path</label>
                                    <div class="relative">
                                        <div
                                            class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 focus-within:ring-8 focus-within:ring-gray-100 focus-within:border-gray-400 transition-all">
                                            <Folder class="w-5 h-5 text-gray-400" />
                                            <input v-model="instance.currentWorkspace"
                                                @focus="isInputFocused = true; fetchWorkspaceSuggestions()"
                                                @blur="closeWorkspaceMenu" @keydown.tab="handleTab"
                                                @keydown.enter="handleEnter"
                                                class="flex-1 bg-transparent border-none p-0 text-base font-mono text-gray-900 outline-none placeholder:text-gray-300"
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
                                                    <span
                                                        class="text-xs font-mono text-gray-500 group-hover:text-gray-900"
                                                        :class="{ 'text-gray-900': selectedIndex === sIdx }">{{ dir
                                                        }}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <!-- Right Column: Provider -->
                            <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar-mini bg-gray-50">
                                <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                                    Inference Configuration</h3>

                                <!-- Model Selection -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Logic
                                        Model</label>
                                    <div
                                        class="grid grid-cols-1 gap-1.5 overflow-y-auto pr-2 custom-scrollbar-mini max-h-48">
                                        <button v-for="model in store.availableModels" :key="model.id"
                                            @click="selectModel(model.id)"
                                            class="flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left group"
                                            :class="instance.currentModel === model.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-100'">
                                            <div class="flex items-center justify-between w-full mb-0.5">
                                                <span class="text-xs font-black uppercase tracking-tight">{{
                                                    model.name }}</span>
                                                <Check v-if="instance.currentModel === model.id" class="w-3 h-3" />
                                            </div>
                                            <span class="text-[9px] font-mono opacity-50 uppercase tracking-widest">{{
                                                model.id }}</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Provider Selection -->
                                <div class="space-y-2">
                                    <label
                                        class="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Inference
                                        Provider</label>

                                    <div class="grid grid-cols-1 gap-2">
                                        <button v-for="provider in store.availableProviders" :key="provider.id"
                                            class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                            :class="isProviderActive(provider.id) ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-900 opacity-60 pointer-events-none'">
                                            <div class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                                :class="isProviderActive(provider.id) ? 'bg-white' : 'bg-gray-100'">
                                                <Globe class="w-4 h-4" :class="isProviderActive(provider.id) ? 'text-gray-900' : 'text-gray-400'" />
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs font-black uppercase tracking-tight">{{
                                                        provider.name }}</span>
                                                    <Check v-if="isProviderActive(provider.id)" class="w-3 h-3" />
                                                </div>
                                                <span
                                                    class="text-[9px] font-mono opacity-60 uppercase tracking-widest">{{ 
                                                        isProviderActive(provider.id) ? 'Active' : 
                                                        (provider.models.length > 0 ? 'Available' : 'Offline' ) 
                                                    }}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end px-6 shrink-0">
                        <button @click="close"
                            class="px-6 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Settings, X, Folder, Check, Globe } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

const workspaceSuggestions = ref<string[]>([])
const allSuggestionsForPath = ref<string[]>([])
const lastFetchedPath = ref('')
const selectedIndex = ref(-1)
const isWorkspaceMenuOpen = ref(false)
const isInputFocused = ref(false)

const fetchWorkspaceSuggestions = async () => {
    if (!instance.value?.currentWorkspace) return
    const currentPath = instance.value.currentWorkspace

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
    const current = instance.value!.currentWorkspace
    const lastSlash = current.lastIndexOf('/')
    const parent = current.substring(0, lastSlash + 1)
    instance.value!.currentWorkspace = `${parent}${dir}`
}

const handleEnter = (event: KeyboardEvent) => {
    if (!isWorkspaceMenuOpen.value || workspaceSuggestions.value.length === 0) return

    if (selectedIndex.value !== -1 || workspaceSuggestions.value.length === 1) {
        event.preventDefault()
        const idx = selectedIndex.value === -1 ? 0 : selectedIndex.value
        const dir = workspaceSuggestions.value[idx]
        const current = instance.value!.currentWorkspace
        const lastSlash = current.lastIndexOf('/')
        const parent = current.substring(0, lastSlash + 1)

        instance.value!.currentWorkspace = `${parent}${dir}/`
        isWorkspaceMenuOpen.value = false
        fetchWorkspaceSuggestions()
    }
}

const selectWorkspaceSuggestion = (dir: string) => {
    if (!instance.value) return
    const current = instance.value.currentWorkspace
    const lastSlash = current.lastIndexOf('/')
    const parent = current.substring(0, lastSlash + 1)

    instance.value.currentWorkspace = `${parent}${dir}/`
    fetchWorkspaceSuggestions()
}

const closeWorkspaceMenu = () => {
    setTimeout(() => {
        isWorkspaceMenuOpen.value = false
    }, 200)
}

const selectModel = (modelId: string) => {
    store.updateInstanceModel(props.instanceId, modelId)
}

const isProviderActive = (providerId: string) => {
    if (!instance.value) return false
    const provider = store.availableProviders.find(p => p.id === providerId)
    if (!provider) return false
    return provider.models.some(m => m.id === instance.value?.currentModel)
}

watch(() => instance.value?.currentWorkspace, () => {
    if (isInputFocused.value) {
        fetchWorkspaceSuggestions()
    }
})

const close = () => {
    emit('update:modelValue', false)
}
</script>

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
