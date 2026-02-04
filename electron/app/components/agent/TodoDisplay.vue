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

const parsedTodos = computed(() => {
    let rawContent = props.result.trim()
    const todos: TodoItem[] = []

    // Try parsing as JSON first
    if (rawContent.startsWith('{') || rawContent.startsWith('[')) {
        try {
            const data = JSON.parse(rawContent)
            if (Array.isArray(data)) {
                return data.map(item => ({
                    task: item.task || '',
                    status: item.status || 'pending',
                    context: item.context || ''
                }))
            } else if (data.todos && Array.isArray(data.todos)) {
                return data.todos.map((item: any) => ({
                    task: item.task || '',
                    status: item.status || 'pending',
                    context: item.context || ''
                }))
            } else if (data.task) {
                // Single todo object
                return [{
                    task: data.task,
                    status: data.status || 'pending',
                    context: data.context || ''
                }]
            }
        } catch (e) {
            console.warn('Failed to parse todo JSON:', e)
        }
    }

    // Fallback to legacy string parsing
    const lines = rawContent.split('\n')
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
    const completed = parsedTodos.value.filter((t: TodoItem) => t.status === 'completed').length
    const progress = total > 0 ? (completed / total) * 100 : 0
    return { total, completed, progress }
})
</script>

<template>
    <div class="my-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <!-- Header -->
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <ListChecks class="w-4 h-4 text-gray-500" />
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-600">Execution Plan</span>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex -space-x-1">
                    <div v-for="i in stats.total" :key="i" class="w-1.5 h-1.5 rounded-full border border-white"
                        :class="i <= stats.completed ? 'bg-green-500' : 'bg-gray-200'">
                    </div>
                </div>
                <span class="text-[9px] font-mono text-gray-400">{{ stats.completed }}/{{ stats.total }}</span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="h-0.5 w-full bg-gray-100 overflow-hidden">
            <div class="h-full bg-gray-900 transition-all duration-1000 ease-out"
                :style="{ width: `${stats.progress}%` }"></div>
        </div>

        <!-- Todo List -->
        <div class="p-2 space-y-1">
            <div v-for="(todo, idx) in parsedTodos" :key="idx"
                class="group flex items-start gap-3 p-3 rounded-lg transition-all"
                :class="todo.status === 'in_progress' ? 'bg-blue-50' : 'hover:bg-gray-50'">

                <div class="mt-0.5">
                    <CheckCircle2 v-if="todo.status === 'completed'" class="w-4 h-4 text-green-500" />
                    <PlayCircle v-else-if="todo.status === 'in_progress'" class="w-4 h-4 text-blue-500 animate-pulse" />
                    <Circle v-else class="w-4 h-4 text-gray-300" />
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold leading-none mb-1.5 transition-colors"
                        :class="todo.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'">
                        {{ todo.task }}
                    </p>
                    <p v-if="todo.context"
                        class="text-[9px] font-mono text-gray-400 truncate uppercase tracking-tighter">
                        {{ todo.context }}
                    </p>
                </div>

                <div v-if="todo.status === 'in_progress'" class="flex items-center">
                    <span
                        class="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-200">
                        Active
                    </span>
                </div>
            </div>
        </div>

    </div>
</template>
