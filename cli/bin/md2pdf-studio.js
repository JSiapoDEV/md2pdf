#!/usr/bin/env node
import { main } from '../src/cli.js';

main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (err) => { process.stderr.write('md2pdf-studio: ' + (err && err.message || err) + '\n'); process.exitCode = 1; },
);
