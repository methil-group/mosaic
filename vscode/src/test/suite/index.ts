import * as path from 'path';
import Mocha from 'mocha';
// import { glob } from 'glob';

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    try {
        // Add files to the test suite
        mocha.addFile(path.resolve(testsRoot, 'suite/extension.test.js'));
        mocha.addFile(path.resolve(testsRoot, 'suite/lmstudio.test.js'));
        mocha.addFile(path.resolve(testsRoot, 'suite/history.test.js'));

        // Run the mocha test
        return new Promise((c, e) => {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}
