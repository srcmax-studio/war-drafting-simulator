import { app as e, BrowserWindow as n } from "electron";
e.whenReady().then(() => {
  const o = new n();
  o.loadURL(process.env.VITE_DEV_SERVER_URL), o.once("ready-to-show", () => {
    o.maximize(), o.show();
  });
});
