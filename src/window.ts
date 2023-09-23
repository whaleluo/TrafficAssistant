import {BrowserWindow} from "electron";
import {WindowID} from "./enums";
import {bytesForHuman, catchWindowSystemContextMenu, contextMenu, infoImage, memory, NetSpeed} from "./utils";

export const createModalWindow = ({url = "", width = 400, height = 320}): any => {
    const parent = BrowserWindow.fromId(memory.get(WindowID.Main))
    if (!parent) return
    const browserWindow = new BrowserWindow({
        modal: true,
        parent,
        width,
        icon: infoImage.resize({width: 15, height: 15}),
        height,
        minimizable: false,
        maximizable: false,
        resizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }

    })
    browserWindow.once('ready-to-show', () => {
        browserWindow.show()
    })
    browserWindow.loadFile(url)
    return browserWindow
}

export function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 190,
        height: 30,
        frame: false,
        transparent: true,
        hasShadow: false,
        maximizable: false,
        minimizable: true,
        resizable: false,
        fullscreenable: false,
        simpleFullscreen: false,
        focusable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    memory.set(WindowID.Main, mainWindow.id)
    catchWindowSystemContextMenu(mainWindow.id, contextMenu)
    mainWindow.loadFile('resources/page/main/index.html').then(() => {
            new NetSpeed().register((uploadSpeed, downloadSpeed) => {
                mainWindow.webContents.send('speed', {
                    uploadSpeed: bytesForHuman(uploadSpeed),
                    downloadSpeed: bytesForHuman(downloadSpeed)
                })
            }).start()
        }
    );
    return mainWindow
}
