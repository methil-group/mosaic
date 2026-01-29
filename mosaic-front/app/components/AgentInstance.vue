<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Send, Bot, User, Terminal, Loader2, Sparkles, Folder, Cpu, ChevronDown, Trash2, Copy, Check, Settings, X, Globe } from 'lucide-vue-next'
import TodoDisplay from './TodoDisplay.vue'
import MarkdownIt from 'markdown-it'

onMounted(() => {
    scrollToBottom()
    store.fetchProviders()
})

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true // Convert \n to <br> to help with dense AI output
})

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

const prompt = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const isModelMenuOpen = ref(false)
const expandedActions = ref<Record<number, boolean>>({})
const copiedIdx = ref<number | null>(null)
const isInputFocused = ref(false)
const workspaceSuggestions = ref<string[]>([])
const allSuggestionsForPath = ref<string[]>([])
const lastFetchedPath = ref('')
const isWorkspaceMenuOpen = ref(false)
const selectedIndex = ref(-1)
const isSettingsOpen = ref(false)

const fetchWorkspaceSuggestions = async () => {
    if (!instance.value?.currentWorkspace) return
    const currentPath = instance.value.currentWorkspace

    // Split into parent and partial
    let parentPath = currentPath
    let partial = ''

    if (!currentPath.endsWith('/')) {
        const lastSlash = currentPath.lastIndexOf('/')
        if (lastSlash !== -1) {
            parentPath = currentPath.substring(0, lastSlash + 1)
            partial = currentPath.substring(lastSlash + 1)
        } else {
            // Relative path or just starting
            parentPath = './'
            partial = currentPath
        }
    }

    // Only fetch if parent changed
    if (parentPath !== lastFetchedPath.value) {
        const dirs = await store.listDirectories(parentPath)
        allSuggestionsForPath.value = dirs
        lastFetchedPath.value = parentPath
    }

    // Filter by partial
    workspaceSuggestions.value = allSuggestionsForPath.value.filter(d =>
        d.toLowerCase().startsWith(partial.toLowerCase())
    )

    // Reset selection index when filtering
    selectedIndex.value = -1
    isWorkspaceMenuOpen.value = workspaceSuggestions.value.length > 0
}

const handleTab = (event: KeyboardEvent) => {
    if (!isWorkspaceMenuOpen.value || workspaceSuggestions.value.length === 0) return
    event.preventDefault()

    selectedIndex.value = (selectedIndex.value + 1) % workspaceSuggestions.value.length

    // Auto-update path as we cycle
    const dir = workspaceSuggestions.value[selectedIndex.value]
    const current = instance.value!.currentWorkspace
    const lastSlash = current.lastIndexOf('/')
    const parent = current.substring(0, lastSlash + 1)
    instance.value!.currentWorkspace = `${parent}${dir}`
}

const handleEnter = (event: KeyboardEvent) => {
    if (!isWorkspaceMenuOpen.value || workspaceSuggestions.value.length === 0) return

    // If something is selected, confirm it (append slash and fetch next)
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
    // After selection, we are at a new folder, so we fetch next suggestions
    fetchWorkspaceSuggestions()
}

const closeWorkspaceMenu = () => {
    setTimeout(() => {
        isWorkspaceMenuOpen.value = false
    }, 200)
}

watch(() => instance.value?.currentWorkspace, () => {
    if (isInputFocused.value) {
        fetchWorkspaceSuggestions()
    }
})

const toggleActions = (idx: number) => {
    expandedActions.value[idx] = !expandedActions.value[idx]
}

const formatContent = (content: string) => {
    if (!content) return '';

    // Remove tool tags but ensure a newline is left behind to prevent merging lines
    // and breaking markdown structural elements (like headers)
    const cleaned = content
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '\n')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines into 2
        .trim();

    return md.render(cleaned);
}

const handleSend = async () => {
    if (!instance.value || !prompt.value.trim() || instance.value.isProcessing) return
    const currentPrompt = prompt.value
    prompt.value = ''
    await store.sendMessage(props.instanceId, currentPrompt)
}

const copyToClipboard = async (text: string, idx: number) => {
    // Clean content for copying (strip tool tags)
    const cleaned = text
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    await navigator.clipboard.writeText(cleaned);
    copiedIdx.value = idx;
    setTimeout(() => {
        if (copiedIdx.value === idx) copiedIdx.value = null;
    }, 2000);
}

const getLatestTodo = (msg: any) => {
    if (!msg.events) return null;
    const todoEvents = msg.events
        .filter((e: any) => e.type === 'tool_finished' && e.name === 'manage_todos' && e.result)
        .reverse();
    return todoEvents[0]?.result || null;
}

const scrollToBottom = async () => {
    await nextTick()
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
}


// Watch messages for auto-scroll
watch(() => instance.value?.messages.length, scrollToBottom)
watch(() => instance.value?.messages[instance.value.messages.length - 1]?.content, scrollToBottom)

const selectModel = (modelId: string) => {
    store.updateInstanceModel(props.instanceId, modelId)
    isModelMenuOpen.value = false
}

</script>

<template>
    <div v-if="instance"
        class="flex flex-col h-full bg-black border border-white/10 overflow-hidden relative group/instance">
        <!-- Header -->
        <header
            class="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl shrink-0">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-7 h-7 rounded-md bg-white flex items-center justify-center shrink-0">
                    <Sparkles class="w-4 h-4 text-black" />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h1 class="text-[11px] font-black tracking-widest text-white uppercase truncate">{{
                            instance.name }}</h1>
                        <span class="w-1 h-1 rounded-full bg-white/10 shrink-0"></span>
                        <p class="text-[10px] font-mono text-white/40 truncate">{{ instance.currentWorkspace }}</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button @click="isSettingsOpen = true"
                    class="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                    <Settings class="w-3.5 h-3.5" />
                </button>

                <button @click="store.removeInstance(instanceId)"
                    class="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-white/20 hover:text-red-400">
                    <Trash2 class="w-3 h-3" />
                </button>
            </div>
        </header>

        <!-- Settings Modal -->
        <Teleport to="body">
            <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
                enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in"
                leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div v-if="isSettingsOpen" class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <!-- Backdrop -->
                    <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="isSettingsOpen = false"></div>

                    <!-- Modal Content -->
                    <div
                        class="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div
                            class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                                    <Settings class="w-4 h-4 text-black" />
                                </div>
                                <h2 class="text-xs font-black uppercase tracking-widest text-white">Agent Configuration
                                </h2>
                            </div>
                            <button @click="isSettingsOpen = false"
                                class="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                                <X class="w-4 h-4" />
                            </button>
                        </div>

                        <div class="flex-1 overflow-hidden">
                            <div class="grid grid-cols-2 h-full">
                                <!-- Left Column: Metadata -->
                                <div
                                    class="p-6 space-y-6 overflow-y-auto border-r border-white/5 custom-scrollbar-mini">
                                    <h3 class="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">
                                        Metadata & Config</h3>

                                    <!-- Name Section -->
                                    <div class="space-y-2">
                                        <label
                                            class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Instance
                                            Name</label>
                                        <input v-model="instance.name"
                                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-4 focus:ring-white/5 focus:border-white/20 transition-all outline-none"
                                            placeholder="Enter instance name..." />
                                    </div>

                                    <!-- Workspace Section -->
                                    <div class="space-y-2">
                                        <label
                                            class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Workspace
                                            Path</label>
                                        <div class="relative">
                                            <div
                                                class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:ring-4 focus-within:ring-white/5 focus-within:border-white/20 transition-all">
                                                <Folder class="w-4 h-4 text-white/20" />
                                                <input v-model="instance.currentWorkspace"
                                                    @focus="isInputFocused = true; fetchWorkspaceSuggestions()"
                                                    @blur="closeWorkspaceMenu" @keydown.tab="handleTab"
                                                    @keydown.enter="handleEnter"
                                                    class="flex-1 bg-transparent border-none p-0 text-sm font-mono text-white outline-none"
                                                    placeholder="/path/to/workspace" />
                                            </div>

                                            <!-- Autocomplete Dropdown -->
                                            <div v-if="isWorkspaceMenuOpen"
                                                class="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl shadow-3xl z-[150] overflow-hidden">
                                                <div
                                                    class="max-h-48 overflow-y-auto p-1 space-y-0.5 custom-scrollbar-mini">
                                                    <button v-for="(dir, sIdx) in workspaceSuggestions" :key="dir"
                                                        @mousedown.prevent="selectWorkspaceSuggestion(dir)"
                                                        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                                                        :class="{ 'bg-white/10': selectedIndex === sIdx }">
                                                        <Folder
                                                            class="w-3.5 h-3.5 text-white/20 group-hover:text-white/60"
                                                            :class="{ 'text-white/60': selectedIndex === sIdx }" />
                                                        <span
                                                            class="text-xs font-mono text-white/40 group-hover:text-white"
                                                            :class="{ 'text-white': selectedIndex === sIdx }">{{ dir
                                                            }}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Model Selection -->
                                    <div class="space-y-2">
                                        <label
                                            class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Logic
                                            Model</label>
                                        <div
                                            class="grid grid-cols-1 gap-1.5 overflow-y-auto pr-2 custom-scrollbar-mini">
                                            <button v-for="model in store.availableModels" :key="model.id"
                                                @click="selectModel(model.id)"
                                                class="flex flex-col items-start px-4 py-3 rounded-xl border transition-all text-left group"
                                                :class="instance.currentModel === model.id ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'">
                                                <div class="flex items-center justify-between w-full mb-0.5">
                                                    <span class="text-xs font-black uppercase tracking-tight">{{
                                                        model.name }}</span>
                                                    <Check v-if="instance.currentModel === model.id" class="w-3 h-3" />
                                                </div>
                                                <span
                                                    class="text-[9px] font-mono opacity-40 uppercase tracking-widest">{{
                                                    model.id }}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: Provider -->
                                <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar-mini bg-white/[0.01]">
                                    <h3 class="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">
                                        Inference Provider</h3>

                                    <div class="space-y-2">
                                        <label
                                            class="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Active
                                            Provider</label>
                                        <div class="grid grid-cols-1 gap-2">
                                            <button v-for="provider in store.availableProviders" :key="provider"
                                                class="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left bg-white border-white text-black">
                                                <div
                                                    class="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                                    <Globe class="w-4 h-4 text-white" />
                                                </div>
                                                <div class="flex-1">
                                                    <div class="flex items-center justify-between">
                                                        <span class="text-xs font-black uppercase tracking-tight">{{
                                                            provider }}</span>
                                                        <Check class="w-3 h-3" />
                                                    </div>
                                                    <span
                                                        class="text-[9px] font-mono opacity-60 uppercase tracking-widest">Active</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end px-6 shrink-0">
                            <button @click="isSettingsOpen = false"
                                class="px-6 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Chat Area -->
        <main ref="scrollContainer"
            class="flex-1 overflow-y-auto px-4 py-6 space-y-8 scroll-smooth custom-scrollbar-mini">
            <div v-if="instance.messages.length === 0"
                class="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                <Bot class="w-8 h-8 text-white mb-4" />
                <p class="text-[10px] uppercase font-bold tracking-widest leading-relaxed">System Idle<br />{{
                    instance.currentWorkspace }}</p>
            </div>

            <div v-for="(msg, idx) in instance.messages" :key="idx"
                class="group animate-in fade-in slide-in-from-bottom-2 duration-300"
                :class="msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
                <!-- User Message -->
                <template v-if="msg.role === 'user'">
                    <div class="flex items-center gap-1.5 mb-2 px-1">
                        <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest">User</span>
                        <div
                            class="w-5 h-5 rounded bg-white/10 flex items-center justify-center border border-white/10">
                            <User class="w-2.5 h-2.5 text-white/40" />
                        </div>
                    </div>
                    <div
                        class="max-w-[90%] px-4 py-3 rounded-2xl bg-white text-black leading-relaxed font-bold text-xs relative group/msg">
                        {{ msg.content }}
                        <button @click="copyToClipboard(msg.content, idx)"
                            class="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded bg-white/5 border border-white/10 opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-white/10 active:scale-95">
                            <Check v-if="copiedIdx === idx" class="w-3 h-3 text-green-400" />
                            <Copy v-else class="w-3 h-3 text-white/40" />
                        </button>
                    </div>
                </template>

                <!-- Assistant Message -->
                <template v-else>
                    <div class="flex items-center gap-1.5 mb-2 px-1 w-full box-border">
                        <div
                            class="w-5 h-5 rounded bg-white/10 flex items-center justify-center border border-white/10">
                            <Bot class="w-2.5 h-2.5 text-white" />
                        </div>
                        <span class="text-[9px] font-bold text-white uppercase tracking-widest">MOSAIC</span>
                        <Loader2 v-if="msg.isStreaming" class="w-2.5 h-2.5 text-white animate-spin opacity-50" />

                        <span v-if="msg.model"
                            class="ml-auto text-[8px] font-mono text-white/30 uppercase tracking-wider">
                            {{store.availableModels.find(m => m.id === msg.model)?.name || msg.model.split('/').pop()
                            }}
                        </span>
                    </div>

                    <div class="w-full space-y-3">
                        <!-- Top-level Todo (Latest Plan) -->
                        <TodoDisplay v-if="getLatestTodo(msg)" :result="getLatestTodo(msg)" />

                        <!-- Collapsible Actions -->
                        <div v-if="msg.events && msg.events.length > 0" class="space-y-1.5">
                            <button @click="toggleActions(idx)"
                                class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[8px] font-bold uppercase tracking-widest text-white/30">
                                <Terminal class="w-2.5 h-2.5" />
                                Actions ({{msg.events.filter(e => e.type !== 'token').length}})
                                <ChevronDown class="w-2.5 h-2.5 transition-transform"
                                    :class="{ 'rotate-180': expandedActions[idx] }" />
                            </button>

                            <div v-if="expandedActions[idx]"
                                class="space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <div v-for="(event, eIdx) in msg.events" :key="eIdx" v-show="event.type !== 'token'"
                                    class="flex flex-col px-3 py-2 rounded bg-white/[0.01] border border-white/5">
                                    <p class="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1">
                                        {{ event.type === 'tool_started' ? 'Call' : event.type === 'tool_finished' ?
                                            'Success' : 'Done' }}
                                    </p>
                                    <p class="text-[10px] font-mono text-white/60 truncate">
                                        {{ event.type === 'tool_started' ? `> ${event.name}` : event.type ===
                                            'tool_finished' ? `> ${event.name}` : '> Protocol finished' }}
                                    </p>
                                    <div v-if="event.type === 'tool_started' && event.parameters"
                                        class="mt-2 p-2 rounded bg-black/50 border border-white/5 text-[9px] font-mono text-white/20 overflow-x-auto max-h-32 whitespace-pre-wrap">
                                        {{ event.parameters }}
                                    </div>
                                    <div v-if="event.type === 'tool_finished' && event.result" class="mt-2">
                                        <TodoDisplay
                                            v-if="event.name === 'manage_todos' && event.result !== getLatestTodo(msg)"
                                            :result="event.result" />
                                        <div v-else-if="event.name !== 'manage_todos'"
                                            class="p-2 rounded bg-black/50 border border-white/5 text-[9px] font-mono text-white/20 overflow-x-auto max-h-32 whitespace-pre-wrap">
                                            {{ event.result }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Response Text -->
                        <div v-if="formatContent(msg.content)"
                            class="relative group/msg px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white leading-relaxed font-medium text-[13px] prose prose-invert prose-sm max-w-none shadow-2xl"
                            v-html="formatContent(msg.content)">
                        </div>

                        <!-- Message Actions -->
                        <div v-if="formatContent(msg.content)" class="flex justify-end pr-1">
                            <button @click="copyToClipboard(msg.content, idx)"
                                class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 opacity-40 hover:opacity-100 transition-all active:scale-95 group/copy">
                                <Check v-if="copiedIdx === idx" class="w-2.5 h-2.5 text-green-400" />
                                <template v-else>
                                    <Copy class="w-2.5 h-2.5 text-white/40 group-hover/copy:text-white" />
                                    <span
                                        class="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover/copy:text-white">Copy
                                        Answer</span>
                                </template>
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </main>

        <!-- Footer Input -->
        <footer class="p-6 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/5 shrink-0">
            <div class="relative group max-w-4xl mx-auto w-full">
                <textarea v-model="prompt" @keydown.enter.prevent="handleSend" @focus="isInputFocused = true"
                    @blur="isInputFocused = false" placeholder="Communicate with agent..."
                    class="w-full bg-white/5 border border-white/10 focus:border-white focus:bg-white/10 focus:ring-4 focus:ring-white/5 rounded-xl text-white placeholder-white/10 py-4 px-5 pr-12 resize-none h-16 max-h-48 font-bold text-sm transition-all shadow-2xl"
                    :disabled="instance.isProcessing"></textarea>

                <button @click="handleSend" :disabled="!prompt.trim() || instance.isProcessing"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-white text-black hover:bg-white/90 disabled:bg-white/5 disabled:text-white/10 flex items-center justify-center transition-all shadow-xl active:scale-90 border border-white/20">
                    <Loader2 v-if="instance.isProcessing" class="w-4 h-4 animate-spin" />
                    <Send v-else class="w-4 h-4" />
                </button>

                <div v-if="!prompt.trim() && !instance.isProcessing"
                    class="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-white/5 border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Awaiting Input</span>
                </div>
            </div>
        </footer>

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

:deep(.prose) {
    color: rgba(255, 255, 255, 0.9);
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4) {
    color: white;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

:deep(.prose p) {
    margin-bottom: 1.25em;
    line-height: 1.7;
}

:deep(.prose code) {
    color: white;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.15rem 0.35rem;
    border-radius: 0.3rem;
    font-size: 0.9em;
    font-family: inherit;
}

:deep(.prose pre) {
    background: #0a0a0a !important;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    padding: 1.25rem !important;
    margin: 1.5rem 0;
}

:deep(.prose pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.85em;
    color: rgba(255, 255, 255, 0.8);
    line-height: inherit;
}

:deep(.prose ul),
:deep(.prose ol) {
    margin-left: 1.25em;
    margin-bottom: 1em;
}

:deep(.prose li) {
    margin-bottom: 0.25em;
}

:deep(.prose strong) {
    color: white;
    font-weight: 700;
}

:deep(.prose a) {
    color: white;
    text-decoration: underline;
    text-underline-offset: 4px;
    opacity: 0.6;
    transition: opacity 0.2s;
}

:deep(.prose a:hover) {
    opacity: 1;
}
</style>
