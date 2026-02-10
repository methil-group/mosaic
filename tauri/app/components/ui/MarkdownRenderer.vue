<template>
    <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
    content?: string
}>()

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('swift', swift);

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
})

md.set({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
            } catch (__) { }
        }
        return md.utils.escapeHtml(str);
    }
})

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
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

/* Code Window (Mac Style) */
.code-window {
    margin: 1.5em 0;
    border-radius: 12px;
    background: #282c34;
    /* Atom One Dark background */
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #21252b;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}

.window-controls {
    display: flex;
    gap: 8px;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.dot.red {
    background: #ff5f56;
}

.dot.yellow {
    background: #ffbd2e;
}

.dot.green {
    background: #27c93f;
}

.lang-label {
    font-size: 10px;
    text-transform: uppercase;
    color: #abb2bf;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    letter-spacing: 0.1em;
}

.code-window pre {
    margin: 0;
    padding: 1.25rem;
    overflow-x: auto;
    background: transparent !important;
    /* Let container handle bg */
}

.code-window code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    line-height: 1.6;
    color: #abb2bf;
    text-shadow: none;
}

/* Inline Code */
.markdown-content :not(pre)>code {
    background: rgba(0, 0, 0, 0.06);
    padding: 0.2em 0.4em;
    border-radius: 6px;
    color: #d14;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    font-weight: 500;
}

/* Tables */
.markdown-content table {
    width: 100%;
    margin: 1em 0;
    border-collapse: collapse;
    font-size: 0.9em;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    display: block;
    /* For responsive scrolling if needed, though simple tables behave better as table */
}

/* Fix for rounded corners on table */
.markdown-content table {
    border-spacing: 0;
    display: table;
}

.markdown-content th {
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
    padding: 0.75rem 1rem;
    border-bottom: 2px solid #e2e8f0;
    color: #475569;
}

.markdown-content td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
}

.markdown-content tr:last-child td {
    border-bottom: none;
}

.markdown-content tr:nth-child(even) {
    background-color: #fcfcfc;
}
</style>
