<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { useVideoCache } from '~/composables/useVideoCache'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown, EyeOff, X, Monitor, Code } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
import FileExplorer from './FileExplorer.vue'
import MarkdownIt from 'markdown-it'

import { Vue3Lottie } from 'vue3-lottie'

const props = defineProps<{
    instanceId: string,
    preview?: boolean
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
const showRaw = ref<Record<number, boolean>>({})

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

const toggleActions = (idx: number) => { expandedActions.value[idx] = !expandedActions.value[idx] }
const toggleRaw = (idx: number) => { showRaw.value[idx] = !showRaw.value[idx] }

const scrollToBottom = async () => {
    await nextTick()
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
}

watch(() => instance.value?.messages.length, scrollToBottom)
watch(() => instance.value?.messages[instance.value?.messages.length - 1]?.content, scrollToBottom)
</script>

<template>
    <div v-if="instance" ref="panelRef"
        :class="[preview ? 'agent-chip' : 'panel flex flex-col h-full bg-white overflow-hidden relative group/instance transition-all duration-200 border border-gray-200 shadow-sm', currentMode]"
        :style="{
            '--bot-color': instance.color || '#000000',
            '--bot-color-soft': hexToRgba(instance.color || '#000000', 0.1),
            '--msg-bg-light': hexToRgba(instance.color || '#000000', 0.08)
        }">

        <!-- Full View Content -->
        <template v-if="!preview">
            <button class="btn-remove-panel z-50" @click="store.removeInstance(instanceId)" title="Remove Bot">
                <X class="w-2.5 h-2.5" />
            </button>

            <header class="panel-header shrink-0" :style="{ backgroundColor: instance.color }">
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
                        }"></div>
                        <button @click="isSettingsOpen = true"
                            class="p-1 rounded bg-white/20 hover:bg-white/40 transition-colors text-white">
                            <Settings class="w-3 h-3" />
                        </button>
                    </div>
                </div>
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
                        <div class="px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed"
                            :class="msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-50 border border-gray-100 text-gray-900'">
                            <div v-html="formatContent(msg.content)"></div>
                        </div>
                    </div>
                </main>
                <div class="input-container p-4 border-t border-gray-100">
                    <AgentInput :instance-id="instanceId" />
                </div>
            </template>
        </template>

        <!-- Preview View Content (Chip) -->
        <template v-else>
            <div class="chip-content"
                :style="{ backgroundColor: hexToRgba(instance.color || '#eee', 0.1), borderColor: hexToRgba(instance.color || '#eee', 0.2) }">
                <div class="chip-icon-wrapper">
                    <component :is="getIconComponent(instance.icon)" class="w-10 h-10"
                        :style="{ color: instance.color }" />
                </div>
                <span class="chip-name">{{ instance.name }}</span>
            </div>
        </template>
    </div>
</template>

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
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
    transition: all 0.3s;
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

.btn-remove-panel {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 100;
    background: #ef4444;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s;
}

.panel:hover .btn-remove-panel {
    opacity: 1;
}
</style>
