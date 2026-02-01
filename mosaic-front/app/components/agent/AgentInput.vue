<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Send, Square } from 'lucide-vue-next'

const props = defineProps<{
    instanceId: string
}>()

const store = useAgentStore()
const instance = computed(() => store.instances[props.instanceId])
const prompt = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const adjustHeight = async () => {
    if (!textareaRef.value) return
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
}

watch(prompt, () => {
    nextTick(adjustHeight)
})

const handleSend = async () => {
    if (!instance.value || !prompt.value.trim()) return
    const currentPrompt = prompt.value
    prompt.value = ''
    await store.sendMessage(props.instanceId, currentPrompt)
}
</script>

<template>
    <footer v-if="instance"
        class="p-6 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/5 shrink-0">
        <div class="relative group max-w-4xl mx-auto w-full">
            <!-- Queue Indicator -->
            <div v-if="instance.messageQueue.length > 0"
                class="absolute -top-10 left-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div
                    class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {{ instance.messageQueue.length }} Queued
                    </span>
                </div>
            </div>

            <!-- Glowing effect container -->
            <div
                class="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-hover:opacity-50">
            </div>

            <textarea ref="textareaRef" v-model="prompt" @keydown.enter.prevent="handleSend" @input="adjustHeight"
                placeholder="Ask anything..."
                class="relative w-full bg-[#0a0a0a] border border-white/10 placeholder-white/20 text-white rounded-xl py-[18px] pl-5 pr-14 resize-none h-[56px] min-h-[56px] max-h-48 font-medium text-sm transition-all focus:outline-none focus:border-white/20 shadow-inner overflow-hidden"
                :class="{ 'overflow-y-auto': textareaRef && textareaRef.scrollHeight > 192 }"></textarea>

            <!-- Action Button (Send/Stop/Queue) -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <template v-if="instance.isProcessing">
                    <!-- Add to Queue button -->
                    <button v-if="prompt.trim()" @click="handleSend"
                        class="w-9 h-9 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all shadow-lg active:scale-95 border border-white/10 group/queue"
                        v-tooltip="'Add to Queue'">
                        <Send class="w-4 h-4 opacity-50 group-hover/queue:opacity-100" />
                    </button>

                    <!-- Stop button -->
                    <button @click="store.stopProcessing(instanceId)"
                        class="w-9 h-9 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all shadow-lg active:scale-95 border border-red-400/50"
                        v-tooltip="'Stop Generation'">
                        <Square class="w-4 h-4 fill-current" />
                    </button>
                </template>

                <button v-else @click="handleSend" :disabled="!prompt.trim()"
                    class="w-9 h-9 rounded-lg bg-white text-black hover:bg-white/90 disabled:bg-white/5 disabled:text-white/10 flex items-center justify-center transition-all shadow-lg active:scale-95 border border-white/20">
                    <Send class="w-4 h-4" />
                </button>
            </div>

            <div v-if="!prompt.trim() && !instance.isProcessing"
                class="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Ready</span>
            </div>
        </div>
    </footer>
</template>
