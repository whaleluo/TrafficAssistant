import {app, BrowserWindow, ipcMain, shell} from "electron";
import {initUserData, NetSpeed, runCmd, userResourcesDir} from "./utils";
import path from "path";
import * as url from "url";

export function initIpcMain() {
    ipcMain.handle('ignore-mouse-events', (event, flag: boolean) => {
        BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(flag, {forward: true})
    })
    ipcMain.handle('get-net-state', () => {
        return new NetSpeed().getNetState()
    })
    ipcMain.handle('close', (event, args) => {
        BrowserWindow.fromWebContents(event.sender)?.close()
    })
    ipcMain.handle('open-skin-dir', async () => {
        await shell.openPath(path.join(userResourcesDir, 'img'))
    })
    ipcMain.handle('reset-skin-dir', async () => {
        initUserData(true)
        app.exit()
        app.relaunch()
    })
    ipcMain.handle('open-url-in-browser', (event, args) => {
        shell.openExternal(args)
    })
    ipcMain.handle('run-cmd', (event, args: string) => {
        runCmd(args)
    })
    ipcMain.on('get-resources-dir-sync', (event, type: string) => {
        const nativePath = type ? path.join(userResourcesDir, type) : userResourcesDir
        event.returnValue = url.pathToFileURL(nativePath).href
    })
}