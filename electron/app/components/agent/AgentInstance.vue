<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { useVideoCache } from '~/composables/useVideoCache'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown, EyeOff, X, Maximize2, Monitor } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import TodoDisplay from './TodoDisplay.vue'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
import FileExplorer from './FileExplorer.vue'
import MarkdownIt from 'markdown-it'

import { Vue3Lottie } from 'vue3-lottie'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const { getVideoUrl, preloadVideos } = useVideoCache()
const instance = computed(() => store.instances[props.instanceId])

// Reactively get the visual source
const videoSource = computed(() => getVideoUrl(instance.value?.video))
const lottieAnimation = computed(() => instance.value?.lottie)


const scrollContainer = ref<HTMLElement | null>(null)
const expandedActions = ref<Record<number, boolean>>({})
const copiedIdx = ref<number | null>(null)
const isSettingsOpen = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const currentMode = ref('mode-full')

const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return `rgba(0,0,0,${alpha})`
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Dynamic Lottie settings based on mode
const lottieSettings = computed(() => {
    // In 'box' mode (medium), align to top (YMin) to show "higher" part of animation
    if (currentMode.value === 'mode-box') {
        return { preserveAspectRatio: 'xMidYMin slice' }
    }
    // Default: Center (YMid) for pill (strip) and full modes
    return { preserveAspectRatio: 'xMidYMid slice' }
})

const getIconComponent = (iconName?: string) => {
    if (!iconName) return Sparkles
    const name = iconName.charAt(0).toUpperCase() + iconName.slice(1)
    return (LucideIcons as any)[name] || Sparkles
}


onMounted(() => {
    scrollToBottom()
    store.fetchProviders()

    // Preload video if it exists
    if (instance.value?.video) {
        preloadVideos([instance.value.video])
    }

    if (panelRef.value) {
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                if (height < 100) currentMode.value = 'mode-pill'
                else if (height < 400 || width < 280) currentMode.value = 'mode-box'
                else if (width < 450) currentMode.value = 'mode-compact'
                else currentMode.value = 'mode-full'
            }
        })
        ro.observe(panelRef.value)
    }
})

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
    <div v-if="instance" ref="panelRef"
        class="panel flex flex-col h-full bg-white overflow-hidden relative group/instance transition-all duration-200 border border-gray-200 shadow-sm"
        :class="currentMode" :style="{
            '--bot-color': instance.color || '#000000',
            '--msg-bg-light': hexToRgba(instance.color || '#000000', 0.08)
        }">

        <button class="btn-remove-panel z-50" @click="store.removeInstance(instanceId)" title="Remove Bot">
            <X class="w-2.5 h-2.5" />
        </button>

        <header class="panel-header shrink-0" :style="{ backgroundColor: instance.color }">
            <!-- Video backgrounds -->
            <video v-if="videoSource" autoplay loop muted playsinline
                class="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-100 pointer-events-none">
                <source :src="videoSource" type="video/webm">
            </video>

            <!-- Lottie backgrounds -->
            <div v-else-if="lottieAnimation"
                class="absolute top-0 left-0 w-full h-full z-0 opacity-100 pointer-events-none overflow-hidden">
                <client-only>
                    <Vue3Lottie :animationLink="lottieAnimation" :height="'100%'" :width="'100%'" :speed="0.5"
                        :rendererSettings="lottieSettings" />
                </client-only>
            </div>

            <div class="panel-header-top relative z-20">
                <div class="flex items-center gap-3">
                    <span class="panel-label-tag flex items-center gap-2">
                        <component :is="getIconComponent(instance.icon)" class="w-3.5 h-3.5" />
                        Agent <span class="agent-name-label font-extrabold">{{ instance.name }}</span>
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="action-circle" :class="{
                        'status-working': instance.isProcessing,
                        'status-waiting': !instance.isProcessing && instance.messages.length === 0,
                        'status-done': !instance.isProcessing && instance.messages.length > 0
                    }" :title="instance.isProcessing ? 'Working...' : 'Ready'"></div>

                    <button @click="navigateTo(`/agents/${instanceId}`)"
                        class="p-1 rounded bg-white/20 hover:bg-white/40 transition-colors text-white" title="Settings">
                        <Settings class="w-3 h-3" />
                    </button>
                    <button @click="store.toggleVisibility(instanceId)"
                        class="p-1 rounded bg-white/20 hover:bg-white/40 transition-colors text-white" title="Hide">
                        <EyeOff class="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div class="panel-header-bottom relative z-10 flex items-center">
                <div class="name-badge">{{ instance.name }}</div>
                <div class="action-circle mini" :class="{
                    'status-working': instance.isProcessing,
                    'status-waiting': !instance.isProcessing && instance.messages.length === 0,
                    'status-done': !instance.isProcessing && instance.messages.length > 0
                }"></div>
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
                class="chat-area flex-1 overflow-y-auto px-4 py-4 space-y-5 scroll-smooth custom-scrollbar-mini bg-white"
                :style="{ '--bot-color': instance.color }">
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
                            <div class="w-4 h-4 rounded bg-gray-900 flex items-center justify-center border border-gray-800"
                                :style="{ backgroundColor: instance.color }">
                                <component :is="getIconComponent(instance.icon)" class="w-2.5 h-2.5 text-white" />
                            </div>
                            <span class="text-[8px] font-bold text-gray-900 uppercase tracking-widest">{{ instance.name
                                }}</span>
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

            <!-- Input Area -->
            <div class="input-container shrink-0">
                <div class="input-box">
                    <AgentInput :instance-id="instanceId" />
                </div>
            </div>
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

.btn-remove-panel {
    position: absolute;
    top: -12px;
    left: -12px;
    z-index: 100;
    background: #ef4444;
    border: 2px solid white;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    opacity: 0;
    transition: all 0.2s;
}

.btn-remove-panel:hover {
    background: #dc2626;
    transform: scale(1.1);
}

.panel:hover .btn-remove-panel {
    opacity: 1;
}
</style>
