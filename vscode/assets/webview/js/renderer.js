function renderMarkdown(content) {
    if (!content) return '';
    
    // Fix common LLM malformed tag bugs like <tool<tool_call>, <tool\n<tool_call>, or <\n<tool_call>
    if (typeof content === 'string') {
        content = content.replace(/<(?:tool)?\s*(?=<tool_call)/g, '');
        content = content.replace(/<(?:thought)?\s*(?=<thought)/g, '');
    }
    
    if (Array.isArray(content)) {
        return content.map(part => renderPart(part)).join('');
    }
    
    const blocks = [];
    const blockRegex = /<+(?<tag>thought|tool_call|tool_response|tool_result)[\s\S]*?(?:<\/\k<tag>>|(?=<+(?:thought|tool_call|tool_response|tool_result))|$)/g;
    
    let lastIdx = 0;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
            const msgContent = content.substring(lastIdx, match.index);
            if (msgContent.replace(/[<>\s\n]/g, '').length > 0) {
                blocks.push({ type: 'message', content: msgContent });
            }
        }
        const tag = match.groups.tag;
        let type = 'message';
        if (tag === 'thought') type = 'thought';
        else if (tag === 'tool_call') type = 'tool_call';
        else if (tag === 'tool_response' || tag === 'tool_result') type = 'user_tool_result';
        
        let cleanedContent = match[0].replace(/^<+/, '<');
        blocks.push({ type: type, content: cleanedContent });
        lastIdx = blockRegex.lastIndex;
    }
    if (lastIdx < content.length) {
        const remaining = content.substring(lastIdx);
        if (remaining.replace(/[<>\s\n]/g, '').length > 0) {
            blocks.push({ type: 'message', content: remaining });
        }
    }

    // Grouping consecutive tool calls and results
    const groupedBlocks = [];
    let currentGroup = null;
    const tasks = [];

    for (const b of blocks) {
        if (b.type === 'tool_call') {
            const m = b.content.match(/<tool_call name="(create_todo|update_todo|delete_todo)"[^>]*>([\s\S]*?)<\/tool_call>/);
            if (m) {
                try {
                    const args = JSON.parse(m[2].trim());
                    const name = m[1];
                    let title = args.title;
                    if (!title && args.status) title = `Marked task ${args.id || ''} as ${args.status}`;
                    if (!title && name === 'delete_todo') title = `Deleted task ${args.id || ''}`;
                    
                    if (title) {
                        tasks.push({ title: title, type: name });
                    }
                } catch(e) {}
            }
        }

        const isTool = b.type === 'tool_call' || b.type === 'user_tool_result';
        // More aggressive whitespace check including common invisible characters
        const isWhitespace = b.type === 'message' && b.content.replace(/[\s\n\r\t\u200B-\u200D\uFEFF]/g, '').length === 0;

        if (isTool) {
            if (!currentGroup) {
                currentGroup = { type: 'tool_group', children: [] };
                groupedBlocks.push(currentGroup);
            }
            currentGroup.children.push(b);
        } else if (isWhitespace && currentGroup) {
            // Keep the group open if we hit whitespace
            continue;
        } else {
            currentGroup = null;
            groupedBlocks.push(b);
        }
    }

    // Post-process: ensure we didn't end up with empty groups or stray characters
    const finalBlocks = [];
    
    // Add task summary at the very top if tasks were found
    if (tasks.length > 0) {
        finalBlocks.push({ type: 'task_summary', tasks: tasks });
    }

    for (const b of groupedBlocks) {
        if (b.type === 'message') {
            const trimmed = b.content.trim();
            if (trimmed === '<' || trimmed === '>') continue;
            if (!trimmed) continue;
        }
        finalBlocks.push(b);
    }

    return finalBlocks.map(b => renderPart(b)).join('');
}

function renderPart(part) {
    const { type, content, children, tasks } = part;
    
    if (type === 'task_summary') {
        return `
            <div class="message-tasks">
                <div class="message-tasks-header">
                    <span class="codicon codicon-checklist"></span>
                    <span>Tasks</span>
                </div>
                <div class="message-tasks-list">
                    ${tasks.map(t => {
                        let icon = 'codicon-add';
                        if (t.type === 'update_todo') icon = 'codicon-edit';
                        if (t.type === 'delete_todo') icon = 'codicon-trash';
                        return `
                            <div class="message-task-item">
                                <span class="codicon ${icon}"></span>
                                <span>${t.title}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    if (type === 'message') {
        const trimmed = content.trim();
        if (!trimmed || trimmed === '<' || trimmed === '>') return '';
        return typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\n/g, '<br>');
    }

    if (type === 'tool_group') {
        const hasLoading = children.some(c => c.type === 'tool_call' && !c.content.includes('</tool_call>'));
        const innerHtml = children.map(c => renderPart(c)).join('');
        return `
            <div class="tool-group ${hasLoading ? 'open' : ''}">
                <div class="tool-group-header">
                    <span class="codicon codicon-tools"></span>
                    <span>Tool Calls</span>
                    <span class="tool-group-status ${hasLoading ? 'loading' : 'done'}"></span>
                    <span class="codicon codicon-chevron-down"></span>
                </div>
                <div class="tool-group-content">
                    ${innerHtml}
                </div>
            </div>
        `;
    }
    
    if (type === 'thought') {
        const isClosed = content.includes('</thought>');
        let thoughtText = content;
        if (content.startsWith('<thought>')) {
            thoughtText = isClosed ? (content.match(/<thought>([\s\S]*?)<\/thought>/)?.[1] || '') : content.substring(9);
        }
        if (!isClosed && thoughtText.includes('</thought')) {
            thoughtText = thoughtText.split('</thought')[0];
        }
        return `<div class="thought-block ${!isClosed ? 'open' : ''}"><div class="thought-header"><span class="thought-icon codicon codicon-lightbulb"></span> ${isClosed ? 'Thought' : 'Thinking...'}</div><div class="thought-content">${typeof marked !== 'undefined' ? marked.parse(thoughtText.trim()) : thoughtText.trim()}</div></div>`;
    }
    
    if (type === 'tool_call') {
        const isClosed = content.includes('</tool_call>');
        if (isClosed) {
            const m = content.match(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)<\/tool_call>/);
            if (m) {
                const [_, name, id, args] = m;
                let summary = '';
                try {
                    const parsed = JSON.parse(args.trim());
                    if (name === 'run_command') summary = ': ' + (parsed.command || '');
                    else if (parsed.path) summary = ': ' + parsed.path;
                    else if (parsed.title) summary = ': ' + parsed.title;
                } catch(e) {}
                return `<div class="tool-call" id="call-${id}"><div class="tool-header loading">${name.replace(/_/g, ' ')}${summary}</div><div class="tool-content">${args.trim()}</div></div>`;
            }
        } else {
            const m = content.match(/<tool_call name="([^"]+)" id="([^"]+)">([\s\S]*?)$/);
            if (m) {
                const [_, name] = m;
                return `<div class="tool-call loading"><div class="tool-header loading">Running ${name.replace(/_/g, ' ')}...</div></div>`;
            }
        }
    }
    
    if (type === 'user_tool_result') {
        const mWithId = content.match(/<(?:tool_response|tool_result) id="([^"]+)">([\s\S]*?)<\/(?:tool_response|tool_result)>/);
        if (mWithId) {
            return `<div class="tool-result-marker" data-id="${mWithId[1]}" style="display:none">${mWithId[2]}</div>`;
        }
        const mWithoutId = content.match(/<(?:tool_response|tool_result)>([\s\S]*?)<\/(?:tool_response|tool_result)>/);
        if (mWithoutId) {
            return `<div class="tool-result-marker" data-id="" style="display:none">${mWithoutId[1]}</div>`;
        }
    }
    
    return '';
}

function finalizeToolCalls(container) {
    const results = container.querySelectorAll('.tool-result-marker');
    results.forEach(res => {
        const id = res.getAttribute('data-id');
        if (!id) {
            res.remove();
            return;
        }
        const callDiv = document.getElementById('call-' + id);
        if (callDiv) {
            const header = callDiv.querySelector('.tool-header');
            const content = callDiv.querySelector('.tool-content');
            if (header) {
                header.classList.remove('loading');
                header.classList.add('done');
            }
            if (content) {
                let rawResult = res.innerText.trim();
                let formattedResult = rawResult;
                try {
                    const parsed = JSON.parse(rawResult);
                    let innerContent = parsed.content || parsed;
                    if (typeof innerContent === 'string') {
                        try { innerContent = JSON.parse(innerContent); } catch(e) {}
                    }
                    
                    if (Array.isArray(innerContent) && innerContent.length > 0 && (innerContent[0].name || innerContent[0].path)) {
                        formattedResult = '<div class="file-grid">' + 
                            innerContent.map(f => `<div class="file-badge ${f.type || 'file'}"><span class="codicon ${f.type === 'directory' ? 'codicon-folder' : 'codicon-file'}"></span> ${f.name || f.path || 'unknown'}</div>`).join('') + '</div>';
                    } else {
                        formattedResult = '<pre><code>' + JSON.stringify(innerContent, null, 2) + '</code></pre>';
                    }
                } catch(e) {
                    if (rawResult.length > 500) formattedResult = '<pre><code>' + rawResult.substring(0, 500) + '...</code></pre>';
                    else formattedResult = '<pre><code>' + rawResult + '</code></pre>';
                }
                content.innerHTML = '<div class="tool-output-label">Output:</div>' + formattedResult;
            }
        }
        res.remove();
    });
}
