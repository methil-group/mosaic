const path = require('path');

function validateCommand(command, rootPath) {
    const absPathRegex = /(?:^|\s)(\/[^\s;&|]+)/g;
    let match;
    while ((match = absPathRegex.exec(command)) !== null) {
        const p = path.normalize(match[1].trim());
        if (path.isAbsolute(p) && !p.startsWith(rootPath)) {
            return `Unauthorized access to absolute path outside repository: ${p}`;
        }
    }
    return null;
}

const root = path.normalize('/home/eth/Documents/Github/mosaic/vscode');
const tests = [
    { cmd: `ls ${root}/src`, expected: null },
    { cmd: `ls /etc/passwd`, expected: "Unauthorized access" },
    { cmd: `ls ${root}/../secret.txt`, expected: "Unauthorized access" },
    { cmd: `cat ${root}/src/core/agent.ts`, expected: null }
];

tests.forEach(t => {
    const result = validateCommand(t.cmd, root);
    const passed = t.expected === null ? result === null : result && result.includes(t.expected);
    console.log(`Command: ${t.cmd}`);
    console.log(`Result: ${result}`);
    console.log(`Passed: ${passed ? 'YES' : 'NO'}`);
    console.log('---');
});
