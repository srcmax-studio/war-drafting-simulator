import { app, BrowserWindow } from 'electron';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';

let assetServer: Server | null = null;
let assetUrl = '';
let mainWindow: BrowserWindow | null = null;

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const startAssetServer = async (): Promise<string> => {
  if (assetUrl) return assetUrl;
  const publicRoot = join(app.getAppPath(), '.output/public');
  assetServer = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const candidate = normalize(pathname).replace(/^[/\\]+/, '');
      const relativePath = extname(candidate) ? candidate : 'index.html';
      const target = join(publicRoot, relativePath);
      if (!target.startsWith(publicRoot)) throw new Error('Invalid path.');
      const body = await readFile(target);
      response.writeHead(200, { 'content-type': mimeTypes[extname(target)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' });
      response.end(body);
    } catch {
      try {
        const fallback = await readFile(join(publicRoot, 'index.html'));
        response.writeHead(200, { 'content-type': mimeTypes['.html'], 'cache-control': 'no-store' });
        response.end(fallback);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    assetServer!.once('error', reject);
    assetServer!.listen(0, '127.0.0.1', () => resolve());
  });
  const address = assetServer.address();
  if (!address || typeof address === 'string') throw new Error('Unable to start local asset server.');
  assetUrl = `http://127.0.0.1:${address.port}`;
  return assetUrl;
};

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 700,
    show: false,
    backgroundColor: '#111614',
    title: '万世战线 Aeonfront',
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.once('closed', () => { mainWindow = null; });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const url = devUrl ?? await startAssetServer();
  await mainWindow.loadURL(url);
};

void app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => assetServer?.close());
