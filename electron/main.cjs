const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let phpProcess = null;
const PORT = 8000;
const HOST = '127.0.0.1';
const START_URL = `http://${HOST}:${PORT}/amroza`;

// Check if port 8000 is already active
function checkServer(timeoutMs = 1000) {
    return new Promise((resolve) => {
        const req = http.get(`http://${HOST}:${PORT}`, (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Find PHP executable
function getPhpBinary() {
    const xamppPhp = 'C:\\xampp\\php\\php.exe';
    if (fs.existsSync(xamppPhp)) {
        return xamppPhp;
    }
    return 'php'; // Fallback to system PATH
}

// Start PHP artisan serve if not already running
async function ensureServerRunning() {
    const isRunning = await checkServer();
    if (isRunning) {
        console.log('[JKC Desktop] PHP server is already running on port ' + PORT);
        return true;
    }

    console.log('[JKC Desktop] Starting local PHP server...');
    const phpBinary = getPhpBinary();
    const appRoot = path.join(__dirname, '..');

    phpProcess = spawn(phpBinary, ['artisan', 'serve', `--host=${HOST}`, `--port=${PORT}`], {
        cwd: appRoot,
        stdio: 'ignore',
        windowsHide: true,
        shell: false,
    });

    phpProcess.on('error', (err) => {
        console.error('[JKC Desktop] Failed to start PHP server:', err);
    });

    // Poll until server responds (up to 10 seconds)
    for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const up = await checkServer();
        if (up) {
            console.log('[JKC Desktop] PHP server is ready!');
            return true;
        }
    }

    return false;
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'public', 'favicon.ico');

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 850,
        minWidth: 1024,
        minHeight: 700,
        title: 'JKC - Vegetable Commission Agent System',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        show: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    // Remove default menu bar
    Menu.setApplicationMenu(null);

    mainWindow.maximize();
    mainWindow.focus();

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[JKC Desktop] Page loaded successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('[JKC Desktop] Load failed, retrying...', errorCode, errorDescription);
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(START_URL);
            }
        }, 1500);
    });

    mainWindow.loadURL(START_URL);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(async () => {
    await ensureServerRunning();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Clean shutdown: terminate spawned PHP process
function cleanup() {
    if (phpProcess) {
        try {
            console.log('[JKC Desktop] Stopping local PHP process...');
            phpProcess.kill();
            phpProcess = null;
        } catch (e) {
            // ignore
        }
    }
}

app.on('window-all-closed', () => {
    cleanup();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    cleanup();
});
