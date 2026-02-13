import { spawn } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const platforms = [
    { name: 'Windows (x86_64-pc-windows-msvc)', target: 'x86_64-pc-windows-msvc' },
    { name: 'macOS (Universal)', target: 'universal-apple-darwin' },
    { name: 'macOS (x86_64)', target: 'x86_64-apple-darwin' },
    { name: 'macOS (aarch64)', target: 'aarch64-apple-darwin' },
    { name: 'Linux (x86_64-unknown-linux-gnu)', target: 'x86_64-unknown-linux-gnu' },
    { name: 'All Platforms', target: 'all' }
];

console.log('\n--- Tauri Build Selection ---');
console.log('Note: Cross-compiling for Windows from Linux requires mingw-w64 (for GNU target).');
platforms.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
});
console.log('');

rl.question('Select a platform (1-6): ', (answer) => {
    const index = parseInt(answer) - 1;
    const selection = platforms[index];

    if (!selection) {
        console.error('Invalid selection. Exiting.');
        process.exit(1);
    }

    console.log(`\nBuilding for: ${selection.name}\n`);

    const tauriArgs = selection.target === 'all'
        ? ['tauri', 'build']
        : ['tauri', 'build', '--target', selection.target];

    const build = spawn('npx', tauriArgs, {
        stdio: 'inherit',
        shell: true
    });

    build.on('close', (code) => {
        console.log(`\nBuild process exited with code ${code}`);
        process.exit(code);
    });

    rl.close();
});
