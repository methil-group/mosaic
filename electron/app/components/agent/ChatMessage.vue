<template>
    <div :class="message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
        <div class="flex items-center gap-1.5 mb-1.5 px-1">
            <span class="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">{{ message.role ===
                'user' ? 'User' : agentName }}</span>
        </div>
        <div class="px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed relative"
            :class="message.role === 'user' ? 'bg-[var(--accent-color)] text-[var(--panel-bg)]' : 'bg-[var(--ai-msg-bg)] border border-[var(--border-color)] text-[var(--text-main)]'">

            <!-- Process Pane (Thoughts + Tools) -->
            <MessageProcess v-if="messageParts.processItems.length > 0"
                :items="messageParts.processItems"
                :is-running="isProcessing && isLastMessage" />

            <!-- Todo / Checklist Display -->
            <TodoDisplay v-if="messageParts.checklist"
                :result="messageParts.checklist" />

            <!-- Final Content -->
            <div class="markdown-content" v-html="renderedContent"></div>

            <!-- Processing Indicator (Dot Pulse) -->
            <div v-if="isProcessing && isLastMessage && !messageParts.finalContent"
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
            <div v-if="message.usage"
                class="mt-2 flex justify-end items-center gap-3 border-t border-gray-100/50 pt-2 opacity-60 hover:opacity-100 transition-opacity">
                <div class="flex items-center gap-1">
                    <span class="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">In</span>
                    <span class="text-[9px] font-mono text-[var(--text-dim)]">{{ message.usage.prompt_tokens }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Out</span>
                    <span class="text-[9px] font-mono text-[var(--text-dim)]">{{ message.usage.completion_tokens }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                    <span class="text-[9px] font-mono text-blue-500">{{ message.usage.total_tokens }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Message, AgentEvent } from '~/stores/agent'
import MessageProcess from './MessageProcess.vue'
import TodoDisplay from './TodoDisplay.vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'

const props = defineProps<{
    message: Message,
    agentName: string,
    isProcessing: boolean,
    isLastMessage: boolean
}>()

// Configure Markdown-it once
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
})

md.set({
    highlight: (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
            } catch (__) { }
        }
        return md.utils.escapeHtml(str);
    }
})

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token) return '';
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const langName = info.split(/\s+/g)[0] || '';

    let highlighted;
    if (options.highlight) {
        highlighted = options.highlight(token.content, langName, '') || md.utils.escapeHtml(token.content);
    } else {
        highlighted = md.utils.escapeHtml(token.content);
    }

    return `<div class="code-window">
        <div class="code-header">
            <div class="window-controls">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
            </div>
            <span class="lang-label">${langName || 'text'}</span>
        </div>
        <pre class="hljs"><code>${highlighted}</code></pre>
    </div>`;
};

const messageParts = computed(() => {
    const content = props.message.content || '';
    const events = props.message.events || [];

    // 1. Extract Checklists
    let checklist = '';
    let cleanContent = content;

    const jsonMatch = cleanContent.match(/\{"checklist":\s*"([\s\S]*?)"\}/);
    if (jsonMatch) {
        checklist = jsonMatch[1] || '';
        cleanContent = cleanContent.replace(jsonMatch[0], '');
    }

    const todoEvent = [...events].reverse().find((e: any) => e.type === 'tool_started' && e.name === 'manage_todos');
    if (todoEvent && (todoEvent as any).parameters) {
        try {
            let params = (todoEvent as any).parameters;
            if (typeof params === 'string') {
                params = JSON.parse(params);
            }
            if (params && params.checklist) {
                checklist = params.checklist;
            }
        } catch (e) { }
    }

    // 2. Split Process vs Final
    const processItems: any[] = [];
    let finalContent = cleanContent;

    const hasTools = events.some(e => e.type === 'tool_started' || e.type === 'tool_finished') || cleanContent.includes('<tool_call>');

    if (hasTools) {
        const parts = cleanContent.split(/(<tool_call>[\s\S]*?<\/tool_call>)/g);
        let lastToolIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            if (part && part.includes('<tool_call>')) {
                lastToolIndex = i;
                break;
            }
        }

        if (lastToolIndex !== -1) {
            let toolCount = 0;
            for (let i = 0; i <= lastToolIndex; i++) {
                const part = parts[i];
                if (!part || !part.trim()) continue;

                if (part.includes('<tool_call>')) {
                    const toolEvents = events.filter((e: any) => e.type === 'tool_started');
                    const event: any = toolEvents[toolCount];
                    toolCount++;
                    const item: any = { type: 'tool', name: 'Unknown Tool', params: '', status: 'running', result: null };
                    if (event) {
                        item.name = event.name || 'Tool';
                        item.params = event.parameters || '';
                        const evtIdx = events.indexOf(event);
                        const result = findResult(events, event.name, evtIdx);
                        if (result) {
                            item.status = 'done';
                            item.result = result;
                        }
                    } else {
                        const nameMatch = part.match(/"name":\s*"([^"]*)"/);
                        if (nameMatch) item.name = nameMatch[1];
                        item.params = part.replace(/<\/?tool_call>/g, '');
                    }
                    if (item.name !== 'manage_todos') processItems.push(item);
                } else {
                    const text = part.replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '').trim();
                    if (text) processItems.push({ type: 'text', content: text });
                }
            }
            finalContent = parts.slice(lastToolIndex + 1).join('').trim();
        }
    }

    finalContent = finalContent
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
        .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
        .replace(/<\/tool_call>/g, '')
        .trim();

    return { processItems, checklist, finalContent };
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

const renderedContent = computed(() => {
    if (!messageParts.value.finalContent) return '';
    return md.render(messageParts.value.finalContent
        .replace(/\[Error: Tool error:[\s\S]*?\]/g, '')
        .trim());
})
</script>
