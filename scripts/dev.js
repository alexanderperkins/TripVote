// Starts the API and the Vite dev server together: `npm run dev`.
import { spawn } from 'node:child_process';

const workspaces = ['server', 'client'];

const children = workspaces.map((workspace) =>
  spawn('npm', ['run', 'dev', '--workspace', workspace], { stdio: 'inherit', shell: true }),
);

const stopAll = () => children.forEach((child) => child.kill());
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
children.forEach((child) => child.on('exit', (code) => code && stopAll()));
