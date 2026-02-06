<template>
    <div class="message-process my-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <!-- Header / Toggle -->
        <button @click="isOpen = !isOpen"
            class="w-full flex items-center gap-3 px-4 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left group">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <BrainCircuit class="w-3.5 h-3.5 text-blue-600" />
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Process</span>
                    <span v-if="isRunning" class="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
                <p class="text-[10px] text-gray-400 truncate font-medium">
                    {{ summaryText }}
                </p>
            </div>

            <ChevronDown class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': isOpen }" />
        </button>

        <!-- Content -->
        <div v-show="isOpen" class="process-content bg-gray-50/30 border-t border-gray-100">
            <div class="px-4 py-4 space-y-4">
                <div v-for="(item, idx) in items" :key="idx"
                    class="process-item relative pl-4 border-l-2 border-gray-200"
                    :class="{ 'border-blue-300': item.active, 'border-green-300': item.completed }">

                    <!-- Text / Thought -->
                    <div v-if="item.type === 'text'" class="text-xs text-gray-600 leading-relaxed font-medium">
                        <MarkdownRenderer :content="item.content" />
                    </div>

                    <!-- Tool Call -->
                    <div v-else-if="item.type === 'tool'"
                        class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <!-- Tool Header -->
                        <div class="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Terminal class="w-3 h-3 text-gray-500" />
                                <span class="text-[10px] font-bold text-gray-700 font-mono">{{ item.name }}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span v-if="item.status === 'running'"
                                    class="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Running</span>
                                <span v-else-if="item.status === 'done'"
                                    class="text-[8px] font-bold text-green-500 uppercase tracking-widest">Done</span>
                                <Loader2 v-if="item.status === 'running'" class="w-3 h-3 text-blue-500 animate-spin" />
                                <Check v-else-if="item.status === 'done'" class="w-3 h-3 text-green-500" />
                            </div>
                        </div>

                        <!-- Params -->
                        <div class="px-3 py-2 bg-white">
                            <pre
                                class="font-mono text-[9px] text-gray-600 whitespace-pre-wrap break-all">{{ item.params }}</pre>
                        </div>

                        <!-- Result -->
                        <div v-if="item.result" class="px-3 py-2 bg-gray-900 border-t border-gray-200">
                            <div class="flex items-center gap-1 mb-1 opacity-50">
                                <ArrowRight class="w-2.5 h-2.5 text-gray-400" />
                                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Result</span>
                            </div>
                            <pre
                                class="font-mono text-[9px] text-green-400/90 whitespace-pre-wrap break-all max-h-32 overflow-y-auto custom-scrollbar">{{ item.result }}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BrainCircuit, ChevronDown, Terminal, Loader2, Check, ArrowRight } from 'lucide-vue-next'
import MarkdownRenderer from '~/components/ui/MarkdownRenderer.vue'

interface ProcessItem {
    type: 'text' | 'tool'
    content?: string
    name?: string
    params?: string
    result?: string
    status?: 'running' | 'done'
    active?: boolean
    completed?: boolean
}

const props = defineProps<{
    items: ProcessItem[]
    isRunning?: boolean
}>()

const isOpen = ref(false)

const summaryText = computed(() => {
    const toolCount = props.items.filter(i => i.type === 'tool').length

    if (props.isRunning) {
        return `Thinking...`
    }

    if (toolCount > 0) {
        return `Tools called (${toolCount})`
    }

    return `Thinking Process`
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 99px;
}
</style>
