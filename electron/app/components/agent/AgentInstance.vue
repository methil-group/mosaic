<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown, EyeOff } from 'lucide-vue-next'
import TodoDisplay from './TodoDisplay.vue'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
import FileExplorer from './FileExplorer.vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])

const scrollContainer = ref<HTMLElement | null>(null)
const expandedActions = ref<Record<number, boolean>>({})
const copiedIdx = ref<number | null>(null)
const isSettingsOpen = ref(false)

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
})

onMounted(() => {
    scrollToBottom()
    store.fetchProviders()
})

const toggleActions = (idx: number) => {
    expandedActions.value[idx] = !expandedActions.value[idx]
}

const formatContent = (content: string) => {
    if (!content) return '';

    // 1. Remove tool call blocks (complete or incomplete)
    let cleaned = content
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .replace(/<tool_call>[\s\S]*$/g, '') // Handle partial tool tags
        .replace(/<\/tool_call>/g, '');

    // 2. Remove tool result blocks (internal protocol, shouldn't be here but safety first)
    cleaned = cleaned
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/<tool_result>[\s\S]*$/g, '');

    // 3. Escape individual angle brackets only if they look like HTML tags but aren't allowed ones
    // This is more complex than a simple replace. For now, let's just avoid the global tag nuker.
    // Instead of nuking ALL <tag>, we just want to ensure we don't render malicious scripts
    // markdown-it helps with most of this.

    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return md.render(cleaned);
}

const copyToClipboard = async (text: string, idx: number) => {
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

watch(() => instance.value?.messages.length, scrollToBottom)
watch(() => instance.value?.messages[instance.value.messages.length - 1]?.content, scrollToBottom)

</script>

<template>
    <div v-if="instance"
        class="flex flex-col h-full bg-white border border-gray-200 overflow-hidden relative group/instance shadow-sm">
        <!-- Header -->
        <header
            class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 backdrop-blur-xl shrink-0">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center shrink-0">
                    <Sparkles class="w-4 h-4 text-white" />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h1 class="text-[11px] font-black tracking-widest text-gray-900 uppercase truncate">{{
                            instance.name }}</h1>
                        <span class="w-1 h-1 rounded-full bg-gray-200 shrink-0"></span>
                        <p class="text-[10px] font-mono text-gray-400 truncate">{{ instance.currentWorkspace }}</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button @click="navigateTo(`/agents/${instanceId}`)"
                    class="p-1.5 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all text-gray-400 hover:text-gray-900"
                    title="Agent Settings">
                    <Settings class="w-3.5 h-3.5" />
                </button>

                <button @click="store.toggleVisibility(instanceId)"
                    class="p-1.5 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all text-gray-300 hover:text-gray-600"
                    title="Hide from grid">
                    <EyeOff class="w-3 h-3" />
                </button>
            </div>
        </header>

        <!-- Configuration Modal -->
        <AgentSettingsModal v-model="isSettingsOpen" :instance-id="instanceId" />

        <!-- Main Content -->
        <div v-if="!instance.currentWorkspace" class="flex-1 min-h-0 overflow-hidden">
            <FileExplorer :instance-id="instanceId" />
        </div>
        <template v-else>
            <!-- Chat Area -->
            <main ref="scrollContainer"
                class="flex-1 overflow-y-auto px-4 py-4 space-y-5 scroll-smooth custom-scrollbar-mini bg-white">
                <div v-if="instance.messages.length === 0"
                    class="flex flex-col items-center justify-center py-8 opacity-40 text-center">
                    <Bot class="w-6 h-6 text-gray-400 mb-3" />
                    <p class="text-[9px] uppercase font-bold tracking-widest leading-relaxed text-gray-500">System
                        Idle<br />{{
                            instance.currentWorkspace }}</p>
                </div>

                <div v-for="(msg, idx) in instance.messages" :key="idx"
                    class="group animate-in fade-in slide-in-from-bottom-1 duration-300"
                    :class="msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
                    <!-- User Message -->
                    <template v-if="msg.role === 'user'">
                        <div class="flex items-center gap-1.5 mb-1.5 px-1">
                            <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">User</span>
                            <div
                                class="w-4 h-4 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                                <User class="w-2 h-2 text-gray-500" />
                            </div>
                        </div>
                        <div
                            class="max-w-[95%] px-3.5 py-2.5 rounded-2xl bg-gray-900 text-white leading-relaxed font-bold text-[11px] relative group/msg">
                            {{ msg.content }}
                            <button @click="copyToClipboard(msg.content, idx)"
                                class="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded bg-gray-100 border border-gray-200 opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-gray-200 active:scale-95">
                                <Check v-if="copiedIdx === idx" class="w-3 h-3 text-green-500" />
                                <Copy v-else class="w-3 h-3 text-gray-400" />
                            </button>
                        </div>
                    </template>

                    <!-- Assistant Message -->
                    <template v-else>
                        <div class="flex items-center gap-1.5 mb-1.5 px-1 w-full box-border">
                            <div
                                class="w-4 h-4 rounded bg-gray-900 flex items-center justify-center border border-gray-800">
                                <Bot class="w-2 h-2 text-white" />
                            </div>
                            <span class="text-[8px] font-bold text-gray-900 uppercase tracking-widest">MOSAIC</span>
                            <Loader2 v-if="msg.isStreaming" class="w-2 h-2 text-gray-900 animate-spin opacity-50" />

                            <span v-if="msg.model"
                                class="ml-auto text-[7px] font-mono text-gray-400 uppercase tracking-wider">
                                {{store.availableModels.find((m: any) => m.id === msg.model)?.name ||
                                    msg.model.split('/').pop()}}
                            </span>
                        </div>

                        <div class="w-full space-y-3">
                            <TodoDisplay v-if="getLatestTodo(msg)" :result="getLatestTodo(msg)" />

                            <div v-if="msg.events && msg.events.length > 0" class="space-y-1.5">
                                <button @click="toggleActions(idx)"
                                    class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all text-[8px] font-bold uppercase tracking-widest text-gray-500">
                                    <Terminal class="w-2.5 h-2.5" />
                                    Actions ({{msg.events.filter((e: any) => e.type !== 'token').length}})
                                    <ChevronDown class="w-2.5 h-2.5 transition-transform"
                                        :class="{ 'rotate-180': expandedActions[idx] }" />
                                </button>

                                <div v-if="expandedActions[idx]"
                                    class="space-y-2 animate-in slide-in-from-top-1 duration-200">
                                    <div v-for="(event, eIdx) in msg.events" :key="eIdx" v-show="event.type !== 'token'"
                                        class="flex flex-col px-3 py-2 rounded bg-gray-50 border border-gray-100">
                                        <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            {{ event.type === 'tool_started' ? 'Call' : event.type === 'tool_finished' ?
                                                'Success' : 'Done' }}
                                        </p>
                                        <p class="text-[10px] font-mono text-gray-600 truncate">
                                            {{ event.type === 'tool_started' ? `> ${event.name}` : event.type ===
                                                'tool_finished' ? `> ${event.name}` : '> Protocol finished' }}
                                        </p>
                                        <div v-if="event.type === 'tool_started' && event.parameters"
                                            class="mt-2 p-2 rounded bg-gray-100 border border-gray-200 text-[9px] font-mono text-gray-500 overflow-x-auto max-h-32 whitespace-pre-wrap">
                                            {{ event.parameters }}
                                        </div>
                                        <div v-if="event.type === 'tool_finished' && event.result" class="mt-2">
                                            <TodoDisplay
                                                v-if="event.name === 'manage_todos' && event.result !== getLatestTodo(msg)"
                                                :result="event.result" />
                                            <div v-else-if="event.name !== 'manage_todos'"
                                                class="p-2 rounded bg-gray-100 border border-gray-200 text-[9px] font-mono text-gray-500 overflow-x-auto max-h-32 whitespace-pre-wrap">
                                                {{ event.result }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div v-if="formatContent(msg.content)"
                                class="relative group/msg px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 leading-relaxed font-medium text-[12px] prose prose-sm max-w-none shadow-sm"
                                v-html="formatContent(msg.content)">
                            </div>

                            <div v-if="formatContent(msg.content)" class="flex justify-end pr-1">
                                <button @click="copyToClipboard(msg.content, idx)"
                                    class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 border border-gray-200 opacity-60 hover:opacity-100 transition-all active:scale-95 group/copy">
                                    <Check v-if="copiedIdx === idx" class="w-2.5 h-2.5 text-green-500" />
                                    <template v-else>
                                        <Copy class="w-2.5 h-2.5 text-gray-400 group-hover/copy:text-gray-900" />
                                        <span
                                            class="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover/copy:text-gray-900">Copy
                                            Answer</span>
                                    </template>
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </main>

            <!-- Extracted Input Component -->
            <AgentInput :instance-id="instanceId" />
        </template>

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

:deep(.prose) {
    color: rgba(17, 24, 39, 0.9);
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4) {
    color: #111827;
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
    color: #111827;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.15rem 0.35rem;
    border-radius: 0.3rem;
    font-size: 0.9em;
    font-family: inherit;
}

:deep(.prose pre) {
    background: #1f2937 !important;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    padding: 1.25rem !important;
    margin: 1.5rem 0;
}

:deep(.prose pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.85em;
    color: rgba(255, 255, 255, 0.9);
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
    color: #111827;
    font-weight: 700;
}

:deep(.prose a) {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 4px;
    opacity: 0.8;
    transition: opacity 0.2s;
}

:deep(.prose a:hover) {
    opacity: 1;
}
</style>
