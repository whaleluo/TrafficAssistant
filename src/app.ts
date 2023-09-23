import {app} from 'electron';

export function initAppListeners() {
    app.on('browser-window-created', (event, window) => {
        if (!app.isPackaged) {
            window.webContents.openDevTools({mode: "detach"})
        }
    })
}