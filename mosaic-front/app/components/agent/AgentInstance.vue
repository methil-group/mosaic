<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown } from 'lucide-vue-next'
import TodoDisplay from './TodoDisplay.vue'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
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
    let processed = content.replace(/<([^>]+)>/g, '&lt;$1&gt;');
    const cleaned = processed
        .replace(/&lt;tool_call&gt;[\s\S]*?&lt;\/tool_call&gt;/g, '\n')
        .replace(/&lt;tool_result&gt;[\s\S]*?&lt;\/tool_result&gt;/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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

        <!-- Configuration Modal -->
        <AgentSettingsModal v-model="isSettingsOpen" :instance-id="instanceId" />

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
                            {{store.availableModels.find((m: any) => m.id === msg.model)?.name ||
                                msg.model.split('/').pop()
                            }}
                        </span>
                    </div>

                    <div class="w-full space-y-3">
                        <TodoDisplay v-if="getLatestTodo(msg)" :result="getLatestTodo(msg)" />

                        <div v-if="msg.events && msg.events.length > 0" class="space-y-1.5">
                            <button @click="toggleActions(idx)"
                                class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[8px] font-bold uppercase tracking-widest text-white/30">
                                <Terminal class="w-2.5 h-2.5" />
                                Actions ({{msg.events.filter((e: any) => e.type !== 'token').length}})
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

                        <div v-if="formatContent(msg.content)"
                            class="relative group/msg px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white leading-relaxed font-medium text-[13px] prose prose-invert prose-sm max-w-none shadow-2xl"
                            v-html="formatContent(msg.content)">
                        </div>

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

        <!-- Extracted Input Component -->
        <AgentInput :instance-id="instanceId" />

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
