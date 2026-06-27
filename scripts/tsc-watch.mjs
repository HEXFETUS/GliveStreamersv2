import { spawn } from 'node:child_process';

const child = process.platform === 'win32'
  ? spawn('pnpm exec tsc --watch --preserveWatchOutput', {
      stdio: 'inherit',
      shell: true,
    })
  : spawn('pnpm', ['exec', 'tsc', '--watch', '--preserveWatchOutput'], {
      stdio: 'inherit',
      shell: false,
    });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
