const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let splashWindow = null;
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

// Find PHP executable (bundled portable PHP first, then local, then XAMPP)
function getPhpBinaryInfo() {
    // 1. Packaged production location (process.resourcesPath)
    if (app.isPackaged) {
        const packagedPhp = path.join(process.resourcesPath, 'php-win', 'php.exe');
        const packagedIni = path.join(process.resourcesPath, 'php-win', 'php.ini');
        if (fs.existsSync(packagedPhp)) {
            return { binary: packagedPhp, ini: packagedIni };
        }
    }

    // 2. Local development portable PHP
    const localPhp = path.join(__dirname, '..', 'php-win', 'php.exe');
    const localIni = path.join(__dirname, '..', 'php-win', 'php.ini');
    if (fs.existsSync(localPhp)) {
        return { binary: localPhp, ini: localIni };
    }

    // 3. XAMPP fallback
    const xamppPhp = 'C:\\xampp\\php\\php.exe';
    if (fs.existsSync(xamppPhp)) {
        return { binary: xamppPhp, ini: null };
    }

    // 4. System PATH
    return { binary: 'php', ini: null };
}

function getAppRoot() {
    if (app.isPackaged) {
        // In electron-builder, extraResources or unpacked app directory
        const unpackedApp = path.join(process.resourcesPath, 'app');
        if (fs.existsSync(unpackedApp)) {
            return unpackedApp;
        }
        return process.resourcesPath;
    }
    return path.join(__dirname, '..');
}

// Start PHP artisan serve silently
async function ensureServerRunning() {
    const isRunning = await checkServer();
    if (isRunning) {
        console.log('[Vegetable POS Desktop] PHP server is already running on port ' + PORT);
        return true;
    }

    console.log('[Vegetable POS Desktop] Starting local PHP server...');
    const phpInfo = getPhpBinaryInfo();
    const appRoot = getAppRoot();

    console.log('[Vegetable POS Desktop] Using PHP binary:', phpInfo.binary);
    console.log('[Vegetable POS Desktop] App root directory:', appRoot);

    const args = [];
    if (phpInfo.ini && fs.existsSync(phpInfo.ini)) {
        args.push('-c', phpInfo.ini);
    }
    args.push('artisan', 'serve', `--host=${HOST}`, `--port=${PORT}`);

    phpProcess = spawn(phpInfo.binary, args, {
        cwd: appRoot,
        stdio: 'ignore',
        windowsHide: true,
        shell: false,
    });

    phpProcess.on('error', (err) => {
        console.error('[Vegetable POS Desktop] Failed to start PHP server:', err);
    });

    // Poll until server responds (up to 12 seconds)
    for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const up = await checkServer();
        if (up) {
            console.log('[Vegetable POS Desktop] PHP server is ready!');
            return true;
        }
    }

    return false;
}

// 1. Create Splash Screen Window
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 480,
        height: 320,
        frame: false,
        transparent: true,
        resizable: false,
        center: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

// 2. Create Main Application Window
function createMainWindow() {
    const iconPath = path.join(__dirname, '..', 'public', 'icon-256.ico');

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 850,
        minWidth: 1024,
        minHeight: 700,
        title: 'Vegetable POS',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        show: false, // Hidden until splash finishes
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    // Remove default browser menu bar
    Menu.setApplicationMenu(null);

    const startTime = Date.now();

    const transitionToMain = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 2400 - elapsed); // Minimum 2.4s splash display

        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                mainWindow.maximize();
                mainWindow.focus();
            }
        }, remaining);
    };

    mainWindow.webContents.once('did-finish-load', () => {
        console.log('[Vegetable POS Desktop] Main page loaded, transitioning...');
        transitionToMain();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('[Vegetable POS Desktop] Main load retry...', errorCode, errorDescription);
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(START_URL);
            }
        }, 1200);
    });

    mainWindow.loadURL(START_URL);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(async () => {
    // Show splash screen immediately
    createSplashWindow();

    // Ensure server is running in background
    await ensureServerRunning();

    // Create main window (hidden in background)
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Clean shutdown: terminate spawned PHP process
function cleanup() {
    if (phpProcess) {
        try {
            console.log('[Vegetable POS Desktop] Stopping local PHP process...');
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
