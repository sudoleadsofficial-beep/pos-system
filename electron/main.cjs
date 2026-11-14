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

// Find PHP executable (Windows portable PHP, macOS Homebrew/System PHP, local, etc.)
function getPhpBinaryInfo() {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    // 1. Packaged production location (process.resourcesPath)
    if (app.isPackaged) {
        if (isWindows) {
            const packagedPhp = path.join(process.resourcesPath, 'php-win', 'php.exe');
            const packagedIni = path.join(process.resourcesPath, 'php-win', 'php.ini');
            if (fs.existsSync(packagedPhp)) {
                return { binary: packagedPhp, ini: packagedIni };
            }
        } else if (isMac) {
            // Check bundled macOS PHP first (supports both bin/php and php)
            const macCandidates = [
                path.join(process.resourcesPath, 'php-mac', 'bin', 'php'),
                path.join(process.resourcesPath, 'php-mac', 'php'),
            ];
            for (const cand of macCandidates) {
                if (fs.existsSync(cand)) {
                    try {
                        fs.chmodSync(cand, 0o755);
                    } catch (e) {
                        // ignore
                    }
                    const ini = path.join(path.dirname(cand), '..', 'etc', 'php.ini');
                    return { binary: cand, ini: fs.existsSync(ini) ? ini : null };
                }
            }

            // Check standard macOS Homebrew / system paths
            const sysCandidates = [
                '/opt/homebrew/bin/php',          // Apple Silicon (M1/M2/M3/M4)
                '/usr/local/bin/php',             // Intel Mac Homebrew
                '/usr/bin/php',                   // macOS built-in PHP
                '/opt/local/bin/php',             // MacPorts
                '/Applications/MAMP/bin/php/php8.2.0/bin/php',
                '/Applications/XAMPP/xamppfiles/bin/php'
            ];
            for (const cand of sysCandidates) {
                if (fs.existsSync(cand)) {
                    return { binary: cand, ini: null };
                }
            }
        }
    }

    // 2. Local development portable PHP (Windows)
    if (isWindows) {
        const localPhp = path.join(__dirname, '..', 'php-win', 'php.exe');
        const localIni = path.join(__dirname, '..', 'php-win', 'php.ini');
        if (fs.existsSync(localPhp)) {
            return { binary: localPhp, ini: localIni };
        }

        // 3. XAMPP fallback (Windows)
        const xamppPhp = 'C:\\xampp\\php\\php.exe';
        if (fs.existsSync(xamppPhp)) {
            return { binary: xamppPhp, ini: null };
        }
    } else if (isMac) {
        const macCandidates = [
            path.join(__dirname, '..', 'php-mac', 'bin', 'php'),
            path.join(__dirname, '..', 'php-mac', 'php'),
            '/opt/homebrew/bin/php',
            '/usr/local/bin/php',
            '/usr/bin/php',
            '/Applications/XAMPP/xamppfiles/bin/php'
        ];
        for (const cand of macCandidates) {
            if (fs.existsSync(cand)) {
                return { binary: cand, ini: null };
            }
        }
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
    const isMac = process.platform === 'darwin';

    console.log('[Vegetable POS Desktop] Using PHP binary:', phpInfo.binary);
    console.log('[Vegetable POS Desktop] App root directory:', appRoot);

    // Ensure database path & write permissions
    let dbPath = path.join(appRoot, 'database', 'database.sqlite');
    if (isMac && app.isPackaged) {
        const userDataDir = app.getPath('userData');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        const userDbPath = path.join(userDataDir, 'database.sqlite');
        if (!fs.existsSync(userDbPath) && fs.existsSync(dbPath)) {
            try {
                fs.copyFileSync(dbPath, userDbPath);
                console.log('[Vegetable POS Desktop] Seeded SQLite database to userData:', userDbPath);
            } catch (e) {
                console.error('[Vegetable POS Desktop] Failed to copy database to userData:', e);
            }
        }
        if (fs.existsSync(userDbPath)) {
            dbPath = userDbPath;
        }
    }

    // Ensure storage folders exist
    const storageDirs = [
        path.join(appRoot, 'storage', 'framework', 'views'),
        path.join(appRoot, 'storage', 'framework', 'cache'),
        path.join(appRoot, 'storage', 'framework', 'sessions'),
        path.join(appRoot, 'storage', 'logs'),
    ];
    for (const dir of storageDirs) {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
            } catch (e) {}
        }
    }

    const args = [];
    if (phpInfo.ini && fs.existsSync(phpInfo.ini)) {
        args.push('-c', phpInfo.ini);
    }
    const serverPhp = path.join(appRoot, 'server.php');
    if (fs.existsSync(serverPhp)) {
        args.push('-S', `${HOST}:${PORT}`, 'server.php');
    } else {
        args.push('artisan', 'serve', `--host=${HOST}`, `--port=${PORT}`);
    }

    const macExtraPath = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
    phpProcess = spawn(phpInfo.binary, args, {
        cwd: appRoot,
        stdio: 'ignore',
        windowsHide: true,
        shell: false,
        env: {
            ...process.env,
            DB_DATABASE: dbPath,
            PATH: isMac
                ? `${macExtraPath}:${process.env.PATH || ''}`
                : process.env.PATH,
        }
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
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const iconFile = isWindows ? 'icon-256.ico' : 'icon-512.png';
    const iconPath = path.join(__dirname, '..', 'public', iconFile);

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 850,
        minWidth: 1024,
        minHeight: 700,
        title: 'Vegetable POS',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: !isMac,
        backgroundColor: '#ffffff',
        show: false, // Hidden until splash finishes
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    // On macOS provide native Edit menu for Cmd+C, Cmd+V, Cmd+A, Cmd+Q
    if (isMac) {
        const template = [
            {
                label: 'Vegetable POS',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' },
                ],
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectAll' },
                ],
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                ],
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'zoom' },
                    { role: 'close' },
                ],
            },
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } else {
        Menu.setApplicationMenu(null);
    }

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

    mainWindow.webContents.on('did-finish-load', () => {
        const currentUrl = mainWindow.webContents.getURL();
        if (currentUrl.startsWith('http://127.0.0.1') || currentUrl.startsWith('http://localhost')) {
            console.log('[Vegetable POS Desktop] Main page loaded, transitioning...');
            transitionToMain();
        } else {
            console.log('[Vegetable POS Desktop] Main page non-HTTP load:', currentUrl);
        }
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

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await ensureServerRunning();
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
