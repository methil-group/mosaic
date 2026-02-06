<template>
    <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
    content?: string
}>()

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
})

const renderedContent = computed(() => {
    return md.render(props.content || '')
})
</script>

<style>
.markdown-content p {
    margin-bottom: 0.5em;
}

.markdown-content p:last-child {
    margin-bottom: 0;
}

.markdown-content pre {
    background: #f1f5f9;
    padding: 0.5em;
    border-radius: 4px;
    margin: 0.5em 0;
    overflow-x: auto;
}

.markdown-content code {
    font-family: monospace;
    font-size: 0.9em;
}
</style>
