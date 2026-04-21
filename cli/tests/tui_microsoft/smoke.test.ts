import { test, expect } from '@microsoft/tui-test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');
const workspace = path.join(__dirname, 'test_workspace');

if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
}

test('Mosaic UI Smoke Test', async ({ terminal }) => {
    try {
        console.log('🚀 Launching Mosaic CLI...');
        // Clear terminal first to avoid prompt pollution
        await terminal.write('\nclear\n');
        await terminal.write(`export PYTHONPATH="${projectRoot}"\n`);
        await terminal.write(`python3 -m mosaic_cli.main "${workspace}"\n`);

        console.log('⏳ Waiting for Welcome message (30s)...');
        await expect(terminal.getByText('Welcome to Mosaic')).toBeVisible({ timeout: 30000 });
        console.log('✓ Found Welcome message.');

        console.log('⌨️ Sending Ctrl+S...');
        await terminal.write('\x13');
        await expect(terminal.getByText('SETTINGS')).toBeVisible({ timeout: 10000 });
        console.log('✓ Settings visible.');

        console.log('⌨️ Sending Ctrl+H...');
        await terminal.write('\x08');
        await expect(terminal.getByText('HISTORY')).toBeVisible({ timeout: 10000 });
        console.log('✓ History visible.');

        console.log('🏆 Test passed successfully!');
    } catch (err) {
        console.error('❌ Test failed. Dumping terminal screen:');
        const buffer = terminal.getViewableBuffer();
        const screen = buffer.map(row => row.join('')).join('\n');
        console.log(screen);
        throw err;
    }
});
