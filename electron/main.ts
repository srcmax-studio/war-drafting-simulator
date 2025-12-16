import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
    const window = new BrowserWindow();

    window.loadURL(process.env.VITE_DEV_SERVER_URL);

    window.once('ready-to-show', () => {
        window.maximize();

        window.show();
    })
})
