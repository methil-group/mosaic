<template>
    <div v-if="instance" ref="panelRef"
        class="panel flex flex-col h-full bg-[var(--panel-bg)] overflow-hidden relative group/instance transition-all duration-200 border border-[var(--border-color)] shadow-sm"
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
                    class="w-7 h-7 flex items-center justify-center bg-[var(--panel-bg)]/20 backdrop-blur-md rounded-full border border-[var(--border-color)]/20 text-white hover:bg-[var(--panel-bg)]/40 transition-all"
                    title="Agent Settings">
                    <Settings class="w-3.5 h-3.5" />
                </button>
                <button @click="store.removeInstance(instanceId)"
                    class="w-7 h-7 flex items-center justify-center bg-red-500 rounded-full text-white hover:bg-red-600 transition-all shadow-sm"
                    title="Remove Agent">
                    <X class="w-3.5 h-3.5" />
                </button>
            </div>

            <header class="h-20 relative px-4 py-3 overflow-hidden flex flex-col justify-between shrink-0 cursor-grab active:cursor-grabbing"
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

                <div class="flex justify-between items-start relative z-20 pointer-events-none">
                    <div class="flex items-center gap-3">
                        <span class="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-bold text-white uppercase tracking-wider border border-white/20">
                            <component :is="getIconComponent(instance.icon)" class="w-3.5 h-3.5" />
                            Agent <span class="agent-name-label font-extrabold">{{ instance.name }}</span>
                        </span>
                    </div>
                </div>

                <!-- Activity/Status Indicator -->
                <div class="w-2.5 h-2.5 rounded-full bg-slate-400 transition-all duration-300 border-2 border-white/50 absolute bottom-3 right-3 z-30 shadow-lg" :class="{
                    'bg-blue-500 shadow-[0_0_8px_#3b82f6]': instance.isProcessing,
                    '': !instance.isProcessing && instance.messages.length === 0,
                    'bg-emerald-500': !instance.isProcessing && instance.messages.length > 0
                }"></div>
            </header>

            <AgentSettingsModal v-model="isSettingsOpen" :instance-id="instanceId" />

            <main ref="scrollContainer" @scroll="onChatScroll" class="chat-area flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-[var(--panel-bg)] scroll-smooth">
                    <div v-if="instance.messages.length === 0"
                        class="flex flex-col items-center justify-center py-8 opacity-40">
                        <Bot class="w-6 h-6 text-gray-400 mb-3" />
                        <p class="text-[9px] uppercase font-bold tracking-widest text-center">System Idle<br />{{
                            instance.currentWorkspace }}</p>
                    </div>
                    <div v-for="(msg, idx) in instance.messages" :key="idx">
                        <ChatMessage 
                            :message="msg" 
                            :agent-name="instance.name"
                            :is-processing="instance.isProcessing"
                            :is-last-message="idx === instance.messages.length - 1"
                        />
                    </div>
                </main>
                <div class="input-container p-4 border-t border-[var(--border-color)]">
                    <AgentInput :instance-id="instanceId" />
                </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed, defineAsyncComponent } from 'vue'
import { useAgentStore, type AgentEvent } from '~/stores/agent'
import { useVideoCache } from '~/composables/useVideoCache'
import { Bot, User, Terminal, Loader2, Sparkles, Trash2, Copy, Check, Settings, ChevronDown, ChevronUp, EyeOff, X, Monitor, Code } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import AgentInput from './AgentInput.vue'
import AgentSettingsModal from './AgentSettingsModal.vue'
import ChatMessage from './ChatMessage.vue'

const Vue3Lottie = defineAsyncComponent(() =>
  import('vue3-lottie').then(m => m.Vue3Lottie)
)

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


onMounted(() => {
    forceScrollToBottom()
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

// ─── Smart Auto-Scroll ──────────────────────────────────────────────────────
// Only scrolls when user is near the bottom (not reading history).
// Uses smooth scrolling and throttles to avoid jank during streaming.

let isUserNearBottom = true
let scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null

const checkIfNearBottom = () => {
    const el = scrollContainer.value
    if (!el) return
    // Consider "near bottom" if within 150px of the end
    isUserNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
}

const onChatScroll = () => {
    checkIfNearBottom()
}

const scrollToBottom = () => {
    if (scrollThrottleTimer) return // Already scheduled

    scrollThrottleTimer = setTimeout(async () => {
        scrollThrottleTimer = null
        await nextTick()
        const el = scrollContainer.value
        if (!el || !isUserNearBottom) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, 100) // Throttle: max once per 100ms
}

// Force-scroll (no proximity check) for new messages or mount
const forceScrollToBottom = async () => {
    await nextTick()
    const el = scrollContainer.value
    if (!el) return
    isUserNearBottom = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}

watch(() => instance.value?.messages.length, forceScrollToBottom) // New message → always scroll
watch(() => instance.value?.messages[instance.value?.messages.length - 1]?.content, scrollToBottom) // Streaming → only if near bottom
</script>

<style scoped>
.chat-area::-webkit-scrollbar { width: 3px; }
.chat-area::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
</style>
