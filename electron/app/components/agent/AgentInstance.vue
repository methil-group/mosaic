<template>
    <div v-if="instance" ref="panelRef"
        class="panel flex flex-col h-full bg-white overflow-hidden relative group/instance transition-all duration-200 border border-gray-200 shadow-sm"
        :class="currentMode" :style="{
            '--bot-color': instance.color || '#000000',
            '--bot-color-soft': hexToRgba(instance.color || '#000000', 0.1),
            '--msg-bg-light': hexToRgba(instance.color || '#000000', 0.08)
        }">



        <!-- Chromeless Mode (Animation Only) -->
        <template v-if="chromeless">
            <div class="absolute inset-0 w-full h-full overflow-hidden" :style="{ backgroundColor: instance.color }">
                <video v-if="videoSource" autoplay loop muted playsinline
                    class="absolute inset-0 w-full h-full object-cover">
                    <source :src="videoSource" type="video/webm">
                </video>
                <div v-else-if="lottieAnimation" class="absolute inset-0 w-full h-full">
                    <client-only>
                        <Vue3Lottie :animationLink="lottieAnimation" :height="'100%'" :width="'100%'" :speed="0.5"
                            :rendererSettings="{ preserveAspectRatio: 'xMidYMid slice' }" />
                    </client-only>
                </div>
                <!-- Fallback Icon if no animation -->
                <div v-else class="w-full h-full flex items-center justify-center opacity-10">
                    <component :is="getIconComponent(instance.icon)" class="w-1/3 h-1/3"
                        :style="{ color: instance.color }" />
                </div>
            </div>
        </template>

        <!-- Full View Content -->
        <template v-else>
            <div
                class="agent-controls absolute top-3 right-3 z-50 flex items-center gap-2 opacity-0 group-hover/instance:opacity-100 transition-all duration-200">
                <button @click="isSettingsOpen = true"
                    class="w-7 h-7 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/40 transition-all"
                    title="Agent Settings">
                    <Settings class="w-3.5 h-3.5" />
                </button>
                <button @click="store.removeInstance(instanceId)"
                    class="w-7 h-7 flex items-center justify-center bg-red-500 rounded-full text-white hover:bg-red-600 transition-all shadow-sm"
                    title="Remove Agent">
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>

            <header class="panel-header shrink-0 cursor-grab active:cursor-grabbing"
                :style="{ backgroundColor: instance.color }" draggable="true" @dragstart="handleDragStart"
                @dragend="handleDragEnd">
                <video v-if="videoSource" autoplay loop muted playsinline
                    class="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-100 pointer-events-none">
                    <source :src="videoSource" type="video/webm">
                </video>

                <div v-else-if="lottieAnimation"
                    class="absolute top-0 left-0 w-full h-full z-0 opacity-100 pointer-events-none overflow-hidden">
                    <client-only>
                        <Vue3Lottie :animationLink="lottieAnimation" :height="'100%'" :width="'100%'" :speed="0.5"
                            :rendererSettings="lottieSettings" />
                    </client-only>
                </div>

                <div class="panel-header-top relative z-20 pointer-events-none">
                    <div class="flex items-center gap-3">
                        <span class="panel-label-tag flex items-center gap-2">
                            <component :is="getIconComponent(instance.icon)" class="w-3.5 h-3.5" />
                            Agent <span class="agent-name-label font-extrabold">{{ instance.name }}</span>
                        </span>
                    </div>
                </div>

                <!-- Activity/Status Indicator -->
                <div class="action-circle absolute bottom-3 right-3 z-30 shadow-lg" :class="{
                    'status-working': instance.isProcessing,
                    'status-waiting': !instance.isProcessing && instance.messages.length === 0,
                    'status-done': !instance.isProcessing && instance.messages.length > 0
                }"></div>
            </header>

            <AgentSettingsModal v-model="isSettingsOpen" :instance-id="instanceId" />

            <div v-if="!instance.currentWorkspace" class="flex-1 min-h-0 overflow-hidden">
                <FileExplorer :instance-id="instanceId" />
            </div>
            <template v-else>
                <main ref="scrollContainer" class="chat-area flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-white">
                    <div v-if="instance.messages.length === 0"
                        class="flex flex-col items-center justify-center py-8 opacity-40">
                        <Bot class="w-6 h-6 text-gray-400 mb-3" />
                        <p class="text-[9px] uppercase font-bold tracking-widest text-center">System Idle<br />{{
                            instance.currentWorkspace }}</p>
                    </div>
                    <div v-for="(msg, idx) in instance.messages" :key="idx"
                        :class="msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
                        <div class="flex items-center gap-1.5 mb-1.5 px-1">
                            <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{{ msg.role ===
                                'user' ? 'User' : instance.name }}</span>
                        </div>
                        <div class="px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed relative"
                            :class="msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-50 border border-gray-100 text-gray-900'">


                            <!-- New Process Pane (Thoughts + Tools) -->
                            <MessageProcess v-if="getMessageParts(msg).processItems.length > 0"
                                :items="getMessageParts(msg).processItems"
                                :is-running="instance.isProcessing && idx === instance.messages.length - 1" />

                            <!-- Todo / Checklist Display -->
                            <TodoDisplay v-if="getMessageParts(msg).checklist"
                                :result="getMessageParts(msg).checklist" />

                            <!-- Final Content -->
                            <div v-html="formatCleanContent(getMessageParts(msg).finalContent)"></div>

                            <!-- Processing Indicator (Dot Pulse) -->
                            <div v-if="instance.isProcessing && idx === instance.messages.length - 1 && !getMessageParts(msg).finalContent"
                                class="py-2 px-1">
                                <div class="flex gap-1">
                                    <div
                                        class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]">
                                    </div>
                                    <div
                                        class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]">
                                    </div>
                                    <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>

                            <!-- Metrics Footer -->
                            <div v-if="msg.usage"
                                class="mt-2 flex justify-end items-center gap-3 border-t border-gray-100/50 pt-2 opacity-60 hover:opacity-100 transition-opacity">
                                <div class="flex items-center gap-1">
                                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">In</span>
                                    <span class="text-[9px] font-mono text-gray-500">{{ msg.usage.prompt_tokens
                                        }}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Out</span>
                                    <span class="text-[9px] font-mono text-gray-500">{{ msg.usage.completion_tokens
                                        }}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <span
                                        class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                    <span class="text-[9px] font-mono text-blue-500">{{ msg.usage.total_tokens }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <div class="input-container p-4 border-t border-gray-100">
                    <AgentInput :instance-id="instanceId" />
                </div>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore, type AgentEvent } from '~/stores/agent'
import { useVideoCache } from '~/composables/useVideoCache'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown, ChevronUp, EyeOff, X, Monitor, Code } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
import FileExplorer from './FileExplorer.vue'
import MessageProcess from './MessageProcess.vue'
import TodoDisplay from './TodoDisplay.vue'
import MarkdownIt from 'markdown-it'

import { Vue3Lottie } from 'vue3-lottie'

const props = defineProps<{
    instanceId: string,
    chromeless?: boolean
}>()

const emit = defineEmits(['drag-start', 'drag-end'])

const store = useAgentStore()
const { getVideoUrl, preloadVideos } = useVideoCache()
const instance = computed(() => store.instances[props.instanceId])

// Reactively get the visual source
const videoSource = computed(() => getVideoUrl(instance.value?.video))
const lottieAnimation = computed(() => instance.value?.lottie)

const scrollContainer = ref<HTMLElement | null>(null)
const expandedActions = ref<Record<string, boolean>>({})
const copiedIdx = ref<number | null>(null)
const isSettingsOpen = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const currentMode = ref('mode-full')
const showRaw = ref<Record<number, boolean>>({})

const handleDragStart = (e: DragEvent) => {
    if (e.dataTransfer) {
        e.dataTransfer.setData('agentId', props.instanceId)
        e.dataTransfer.effectAllowed = 'move'
    }
    emit('drag-start', props.instanceId)
}

const handleDragEnd = () => {
    emit('drag-end')
}

const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return `rgba(0,0,0,${alpha})`
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const lottieSettings = computed(() => {
    if (currentMode.value === 'mode-box') {
        return { preserveAspectRatio: 'xMidYMin slice' }
    }
    return { preserveAspectRatio: 'xMidYMid slice' }
})

const getIconComponent = (iconName?: string) => {
    if (!iconName) return Sparkles
    const name = iconName.charAt(0).toUpperCase() + iconName.slice(1)
    return (LucideIcons as any)[name] || Sparkles
}

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
})

onMounted(() => {
    scrollToBottom()
    store.fetchProviders()

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

const formatContent = (content: string) => {
    if (!content) return '';
    let cleaned = content
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .replace(/<tool_call>[\s\S]*$/g, '')
        .replace(/<\/tool_call>/g, '')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/<tool_result>[\s\S]*$/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return md.render(cleaned);
}

const formatCleanContent = (content: string) => {
    if (!content) return '';
    return md.render(content.trim());
}

const getMessageParts = (msg: any) => {
    const content = msg.content || '';
    const events = msg.events || [];

    // 1. Extract Checklists
    let checklist = '';
    let cleanContent = content;

    // Pattern 1: JSON checklist in content
    const jsonMatch = cleanContent.match(/\{"checklist":\s*"([\s\S]*?)"\}/);
    if (jsonMatch) {
        checklist = jsonMatch[1]; // The inner string
        cleanContent = cleanContent.replace(jsonMatch[0], '');
    }

    // Pattern 2: manage_todos tool call
    const todoEvent = events.find((e: any) => e.type === 'tool_started' && e.name === 'manage_todos');
    if (todoEvent && (todoEvent as any).parameters) {
        try {
            // Check if parameters is a string JSON or object
            let params = (todoEvent as any).parameters;
            if (typeof params === 'string') {
                params = JSON.parse(params);
            }
            if (params.checklist) {
                checklist = params.checklist;
            }
        } catch (e) {
            console.warn('Failed to parse manage_todos params', e);
        }
    }

    // 2. Split Process vs Final
    const processItems: any[] = [];
    let finalContent = cleanContent;

    if (hasTools(events)) {
        // Find all tool calls in the content
        // We use a regex that matches the opening and closing tag, capturing the content around them
        const parts = cleanContent.split(/(<tool_call>[\s\S]*?<\/tool_call>)/g);

        // Find the index of the LAST tool call part.
        let lastToolIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].includes('<tool_call>')) {
                lastToolIndex = i;
                break;
            }
        }

        if (lastToolIndex !== -1) {
            let toolCount = 0;

            for (let i = 0; i <= lastToolIndex; i++) {
                const part = parts[i];
                if (!part.trim()) continue;

                if (part.includes('<tool_call>')) {
                    // Try to match with event
                    const toolEvents = events.filter((e: any) => e.type === 'tool_started');
                    const event: any = toolEvents[toolCount];
                    toolCount++;

                    const item: any = {
                        type: 'tool',
                        name: 'Unknown Tool',
                        params: '',
                        status: 'running',
                        result: null
                    };

                    if (event) {
                        item.name = event.name || 'Tool';
                        item.params = event.parameters || '';

                        // Find result
                        const evtIdx = events.indexOf(event);
                        const result = findResult(events, event.name, evtIdx);
                        if (result) {
                            item.status = 'done';
                            item.result = result;
                        }
                    } else {
                        // Fallback using regex on XML if event not found yet
                        const nameMatch = part.match(/"name":\s*"([^"]*)"/);
                        if (nameMatch) item.name = nameMatch[1];
                        item.params = part.replace(/<\/?tool_call>/g, '');
                    }

                    if (item.name !== 'manage_todos') {
                        processItems.push(item);
                    }
                } else {
                    // It's text (thought)
                    // Remove tool_result tags from thoughts if any
                    const text = part.replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '').trim();
                    if (text) {
                        processItems.push({ type: 'text', content: text });
                    }
                }
            }

            // The remainder is everything after.
            finalContent = parts.slice(lastToolIndex + 1).join('').trim();
        }
    }

    // Clean final content of artifacts
    finalContent = finalContent
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/<\/tool_call>/g, '') // Cleanup stray tags
        .trim();

    return { processItems, checklist, finalContent };
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

const toggleActions = (key: string) => { expandedActions.value[key] = !expandedActions.value[key] }
const toggleRaw = (idx: number) => { showRaw.value[idx] = !showRaw.value[idx] }

const hasTools = (events: AgentEvent[]) => {
    return events.some(e => e.type === 'tool_started' || e.type === 'tool_finished');
}

const findResult = (events: AgentEvent[], toolName: string, startIndex: number) => {
    for (let i = startIndex + 1; i < events.length; i++) {
        const event = events[i];
        if (event && event.type === 'tool_finished' && (event as any).name === toolName) {
            return (event as any).result;
        }
    }
    return null;
}

const getEventName = (event: AgentEvent) => (event as any).name || ''
const getEventParams = (event: AgentEvent) => (event as any).parameters || ''

const scrollToBottom = async () => {
    await nextTick()
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
}

watch(() => instance.value?.messages.length, scrollToBottom)
watch(() => instance.value?.messages[instance.value?.messages.length - 1]?.content, scrollToBottom)
</script>

<style scoped>
.panel {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-header {
    height: 80px;
    position: relative;
    padding: 12px 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.panel-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.panel-label-tag {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 8px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #94a3b8;
    transition: all 0.3s;
    border: 2px solid rgba(255, 255, 255, 0.5);
}

.status-working {
    background: #3b82f6;
    box-shadow: 0 0 8px #3b82f6;
}

.status-done {
    background: #10b981;
}

.chat-area {
    scroll-behavior: smooth;
}

.chat-area::-webkit-scrollbar {
    width: 3px;
}

.chat-area::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

/* Chip Styles (Simplified for Grid Preview) */
.agent-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 8px;
}

.chip-content {
    display: inline-flex;
    align-items: center;
    padding: 12px 28px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 99px;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.chip-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
}

.chip-name {
    font-size: 24px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e293b;
    white-space: nowrap;
}

/* Agent Controls visibility - handled by Tailwind in template, but ensuring consistency */
.agent-controls {
    transform: translateY(-4px);
}

.group\/instance:hover .agent-controls {
    transform: translateY(0);
}
</style>
