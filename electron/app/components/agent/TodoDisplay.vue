<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Circle, PlayCircle, ListChecks, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
    result: string
}>()

interface TodoItem {
    task: string
    status: 'completed' | 'in_progress' | 'pending'
    context: string
}

const splitResult = computed(() => {
    const [todoPart, ...conclusionParts] = props.result.split('---CONCLUSION---')
    return {
        todos: todoPart || '',
        conclusion: conclusionParts.join('---CONCLUSION---').trim() || ''
    }
})

const parsedTodos = computed(() => {
    const lines = splitResult.value.todos.split('\n')
    const todos: TodoItem[] = []

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('(')) continue

        let status: TodoItem['status'] = 'pending'
        let content = ''

        if (trimmed.startsWith('[x]')) {
            status = 'completed'
            content = trimmed.slice(3).trim()
        } else if (trimmed.startsWith('[>]')) {
            status = 'in_progress'
            content = trimmed.slice(3).trim()
        } else if (trimmed.startsWith('[ ]')) {
            status = 'pending'
            content = trimmed.slice(3).trim()
        } else {
            continue
        }

        const parts = content.split('<-').map(s => s.trim())
        const task = parts[0] || ''
        const context = parts[1] || ''
        todos.push({ task, status, context: context || '' })
    }

    return todos
})

const stats = computed(() => {
    const total = parsedTodos.value.length
    const completed = parsedTodos.value.filter(t => t.status === 'completed').length
    const progress = total > 0 ? (completed / total) * 100 : 0
    return { total, completed, progress }
})
</script>

<template>
    <div class="my-4 bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
        <!-- Header -->
        <div class="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <ListChecks class="w-4 h-4 text-white/40" />
                <span class="text-[10px] font-black uppercase tracking-widest text-white/60">Execution Plan</span>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex -space-x-1">
                    <div v-for="i in stats.total" :key="i" class="w-1.5 h-1.5 rounded-full border border-black"
                        :class="i <= stats.completed ? 'bg-green-500' : 'bg-white/10'">
                    </div>
                </div>
                <span class="text-[9px] font-mono text-white/20">{{ stats.completed }}/{{ stats.total }}</span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="h-0.5 w-full bg-white/5 overflow-hidden">
            <div class="h-full bg-white/40 transition-all duration-1000 ease-out"
                :style="{ width: `${stats.progress}%` }"></div>
        </div>

        <!-- Todo List -->
        <div class="p-2 space-y-1">
            <div v-for="(todo, idx) in parsedTodos" :key="idx"
                class="group flex items-start gap-3 p-3 rounded-lg transition-all"
                :class="todo.status === 'in_progress' ? 'bg-white/5' : 'hover:bg-white/[0.02]'">

                <div class="mt-0.5">
                    <CheckCircle2 v-if="todo.status === 'completed'" class="w-4 h-4 text-green-500/80" />
                    <PlayCircle v-else-if="todo.status === 'in_progress'" class="w-4 h-4 text-blue-400 animate-pulse" />
                    <Circle v-else class="w-4 h-4 text-white/10" />
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold leading-none mb-1.5 transition-colors"
                        :class="todo.status === 'completed' ? 'text-white/20 line-through' : 'text-white/90'">
                        {{ todo.task }}
                    </p>
                    <p v-if="todo.context"
                        class="text-[9px] font-mono text-white/30 truncate uppercase tracking-tighter">
                        {{ todo.context }}
                    </p>
                </div>

                <div v-if="todo.status === 'in_progress'" class="flex items-center">
                    <span
                        class="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                        Active
                    </span>
                </div>
            </div>
        </div>

        <!-- Conclusion / Summary -->
        <div v-if="splitResult.conclusion"
            class="mt-1 p-4 bg-gradient-to-br from-white/[0.05] to-transparent border-t border-white/5 mx-2 mb-2 rounded-xl">
            <div class="flex items-center gap-2 mb-2 text-blue-400">
                <Sparkles class="w-3.5 h-3.5" />
                <span class="text-[9px] font-black uppercase tracking-widest">Final Report</span>
            </div>
            <p class="text-[11px] font-medium text-white/80 leading-relaxed italic">
                {{ splitResult.conclusion }}
            </p>
        </div>
    </div>
</template>
