// Ensures the CLI entry point has a proper shebang and is executable
import { readFileSync, writeFileSync, chmodSync } from 'fs';

const cliPath = './dist/src/cli.js';
const content = readFileSync(cliPath, 'utf8');
if (!content.startsWith('#!/usr/bin/env node')) {
  writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
}
chmodSync(cliPath, 0o755);
console.log('✓ shebang + chmod 755 applied to dist/src/cli.js');
