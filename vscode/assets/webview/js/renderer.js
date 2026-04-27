function renderMarkdown(content) {
    if (!content) return '';
    
    // Fix common LLM malformed tag bugs like <tool<tool_call> or <tool\n<tool_call>
    if (typeof content === 'string') {
        content = content.replace(/<tool\s*(?=<tool_call)/g, '');
        content = content.replace(/<thought\s*(?=<thought)/g, '');
    }
    
    if (Array.isArray(content)) {
        return content.map(part => renderPart(part)).join('');
    }
    
    const blocks = [];
    const blockRegex = /<(?<tag>thought|tool_call|tool_response|tool_result)[\s\S]*?(?:<\/\k<tag>>|(?=<(?:thought|tool_call|tool_response|tool_result))|$)/g;
    
    let lastIdx = 0;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
            blocks.push({ type: 'message', content: content.substring(lastIdx, match.index) });
        }
        const tag = match.groups.tag;
        let type = 'message';
        if (tag === 'thought') type = 'thought';
        else if (tag === 'tool_call') type = 'tool_call';
        else if (tag === 'tool_response' || tag === 'tool_result') type = 'user_tool_result';
        
        blocks.push({ type: type, content: match[0] });
        lastIdx = blockRegex.lastIndex;
    }
    if (lastIdx < content.length) {
        blocks.push({ type: 'message', content: content.substring(lastIdx) });
    }

    return blocks.map(b => renderPart(b)).join('');
}

function renderPart(part) {
    const { type, content } = part;
    if (type === 'message') {
        return typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\n/g, '<br>');
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
        const m = content.match(/<(?:tool_response|tool_result) id="([^"]+)">([\s\S]*?)<\/(?:tool_response|tool_result)>/) || content.match(/<(?:tool_response|tool_result)>([\s\S]*?)<\/(?:tool_response|tool_result)>/);
        if (m) {
            const id = m[1] || '';
            const innerContent = m[2] || m[1];
            return `<div class="tool-result-marker" data-id="${id}" style="display:none">${innerContent}</div>`;
        }
    }
    
    return content;
}

function finalizeToolCalls(container) {
    const results = container.querySelectorAll('.tool-result-marker');
    results.forEach(res => {
        const id = res.getAttribute('data-id');
        const callDiv = container.querySelector('#call-' + id) || (id ? document.getElementById('call-' + id) : null);
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
