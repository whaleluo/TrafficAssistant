'use strict';
import {app, BrowserWindow} from "electron";
import {initMenu, initTray, initUserData} from './utils'
import {createMainWindow} from "./window";
import {initIpcMain} from "./ipc";
import {initAppListeners} from "./app";

const main = {};
process.traceProcessWarnings = true
const additionalData = {myKey: 'myValue'}
const gotTheLock = app.requestSingleInstanceLock(additionalData)
if (!gotTheLock) {
    app.quit()
} else {
    initUserData(false)
    initMenu()
    initAppListeners()
    initIpcMain()

    app.whenReady().then(() => {
        initTray()
        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
        });
        createMainWindow();
    });

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit();
    });
}


module.exports = main;
