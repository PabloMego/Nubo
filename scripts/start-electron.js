const http = require('http');
const { spawn } = require('child_process');
const electron = require('electron');
const fs = require('fs');
const path = require('path');

const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}`;

function checkViteReady() {
  return new Promise((resolve) => {
    const req = http.get(VITE_URL, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
  });
}

async function start() {
  console.log('Waiting for Vite server at', VITE_URL, '...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await checkViteReady();
    if (ready) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    console.warn('Vite server not responding, starting Electron anyway...');
  } else {
    console.log('Vite server is ready! Starting Electron...');
  }

  let child = null;
  let isRestarting = false;

  function runElectron() {
    child = spawn(electron, ['.'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: VITE_URL }
    });

    child.on('close', (code) => {
      if (!isRestarting) {
        process.exit(code || 0);
      }
    });
  }

  runElectron();

  // Watch dist-electron for backend changes
  const distDir = path.join(__dirname, '..', 'dist-electron');
  let restartTimeout = null;
  if (fs.existsSync(distDir)) {
    fs.watch(distDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.js')) {
        clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          console.log('[Dev] Electron main process updated, restarting app...');
          isRestarting = true;
          if (child && child.pid) {
            try {
              if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
              } else {
                child.kill();
              }
            } catch (e) {}
          }
          setTimeout(() => {
            isRestarting = false;
            runElectron();
          }, 400);
        }, 500);
      }
    });
  }
}

start();
