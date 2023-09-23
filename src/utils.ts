import getAdapter from "get-adapter-info"
import {clearTimeout} from "timers";
import {app, BrowserWindow, dialog, Menu, MessageBoxOptions, nativeImage, Tray} from "electron";
import path from "path";
import {WindowID} from "./enums";
import {autoUpdater} from "electron-updater"
import * as fs from "fs";
import {createModalWindow} from "./window";
import * as os from "os";
import * as child_process from "child_process";

export const userResourcesDir = path.join(app.getPath('userData'), 'user-resources')

export const copyDir = function (srcDir: string, distDir: string, force = true) {
    console.log(srcDir, distDir)
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, {recursive: true});
    }
    const errResults: string[] = [];
    const list = fs.readdirSync(srcDir);
    let src, dist;
    list.forEach((file) => {
        src = path.resolve(srcDir, file);
        dist = path.resolve(distDir, file);

        const stat = fs.statSync(src);
        if (stat.isFile()) {
            try {
                if (force || !fs.existsSync(dist)) {
                    fs.createReadStream(src).pipe(fs.createWriteStream(dist));
                    // fs.writeFileSync(dist, fs.readFileSync(src));
                }
            } catch (e) {
                errResults.push(src);
            }
        } else {
            try {
                if (force || !fs.existsSync(dist)) {
                    fs.mkdirSync(dist, {recursive: true});
                }
            } catch (e) {
                errResults.push();
            }
        }
    });
    return errResults;
}

export function initUserData(force: boolean) {
    if (!fs.existsSync(userResourcesDir)) {
        fs.mkdirSync(userResourcesDir, {recursive: true})
    }
    copyDir(path.join(__dirname, '../resources/img'), path.join(userResourcesDir, 'img'), force)
}

export function downloadToResources({url = "", fileName = ""}) {
    return new Promise((resolve) => {
        if (typeof url !== "string" || !url.startsWith('http')) return resolve({error: 'Invalid URL'})
        const filePath = path.join(userResourcesDir, fileName ? fileName : path.basename(url))
        if (!fs.existsSync(userResourcesDir)) {
            fs.mkdirSync(userResourcesDir, {recursive: true})
        }
        const request = url.startsWith('https') ? require('https') : require('http')
        const fileStream = fs.createWriteStream(filePath)
        fileStream.on('finish', () => {
            fileStream.close()
            return resolve({path: filePath})
        })
        request.get(url, (res: any) => {
            res.pipe(fileStream)
        }).on('error', (error: any) => {
            return resolve({error: error?.message})
        })
    })
}

export async function checkingUpdae() {
    if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true
    }
    autoUpdater.autoDownload = false;
    autoUpdater.on('error', (error) => {

        if (error.message.startsWith('net')) {
            // net::ERR_PROXY_CONNECTION_FAILED
            console.log('update net error')
            dialogShow({
                title: '软件更新源不可用',
                message: error.message
            })
            return
        }
        dialogShow({
            title: '软件升级错误',
            message: error.message
        })
    });
    // 检测是否需要更新
    autoUpdater.on('checking-for-update', () => {
        console.log('checking-for-update')
    });
    autoUpdater.on('update-available', () => {
        // 检测到可以更新时
        // 这里我们可以做一个提示，让用户自己选择是否进行更新
        dialogShow({
            type: 'info',
            title: '应用有新的更新',
            message: '发现新版本，是否现在更新？',
            buttons: ['是', '否']
        }).then(({response}) => {
            console.log(response)
            if (response === 0) {
                // 下载更新
                autoUpdater.downloadUpdate();
            }
        });
        // 也可以默认直接更新，二选一即可
        // autoUpdater.downloadUpdate();
    });
    // 检测到不需要更新时
    autoUpdater.on('update-not-available', () => {
        // todo 这里可以做静默处理，不给渲染进程发通知，或者通知渲染进程当前已是最新版本，不需要更新
    });
    // 更新下载进度
    autoUpdater.on('download-progress', (progress) => {
        // todo 直接把当前的下载进度发送给渲染进程即可，有渲染层自己选择如何做展示
        // {
        //     total: 60931461,
        //         delta: 1318146,
        //     transferred: 60931461,
        //     percent: 100,
        //     bytesPerSecond: 736341
        // }
    });
    // 当需要更新的内容下载完成后
    autoUpdater.on('update-downloaded', () => {
        // 给用户一个提示，然后重启应用；或者直接重启也可以，只是这样会显得很突兀
        dialogShow({
            title: '安装更新',
            message: '更新下载完毕，应用将重启并进行安装',
            buttons: ['是', '否']
        }).then(({response}) => {
            if (response === 0) {
                // 退出并安装应用
                setImmediate(() => autoUpdater.quitAndInstall());
            }
        });
    });
    // 我们需要主动触发一次更新检查
    await autoUpdater.checkForUpdates();
}

export function bytesForHuman(bytes: number) {
    let kbs = bytes / 1024
    const units = ['K/s', 'M/s']
    let i = 0
    for (i; kbs > 1024; i++) {
        kbs /= 1024;
    }
    return kbs.toFixed(1) + '' + units[i]
}

export const memory = (function () {
    const memoryData = new Map()
    return {
        get: (key: string) => {
            return memoryData.get(key)
        },
        set: (key: string, value: any) => {
            memoryData.set(key, value)
        },
        delete: (key: string) => {
            memoryData.delete(key)
        }
    }
})()

export function getNativeImageFromResources(imgName: string) {
    return nativeImage.createFromPath(path.join(__dirname, `../resources/img/${imgName}`))
}

export const logoImage = getNativeImageFromResources('tray-skin.png')
export const infoImage = getNativeImageFromResources('info.png')
export const showWindowImage = getNativeImageFromResources('showWindow.png')
export const closeImage = getNativeImageFromResources('close.png')
export const helpImage = getNativeImageFromResources('help.png')
export const moreImage = getNativeImageFromResources('more.png')

export function dialogShow(msgOpt: MessageBoxOptions) {
    return dialog.showMessageBox(Object.assign(msgOpt, {icon: logoImage}))
}

export function initTray() {
    let tray: Tray | null = null
    const icon = logoImage
    tray = new Tray(icon.resize({width: 14, height: 15}))
    tray.setToolTip(app.name)
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
        BrowserWindow.fromId(memory.get(WindowID.Main))?.show()
        tray?.displayBalloon({title: 'xx', content: 'cc'})
    })
    return tray
}


export const contextMenu = Menu.buildFromTemplate([
    {
        label: '连接详情(I)',
        click: (menuItem, browserWindow, event) => {
            createModalWindow({url: 'resources/page/details/index.html'})

        },
        icon: infoImage.resize({width: 15, height: 15})
    },
    {
        type: 'separator',
    },
    {
        label: '总是置顶(T)',
        click: (menuItem, browserWindow, event) => {
            BrowserWindow.fromId(memory.get(WindowID.Main))?.setAlwaysOnTop(menuItem.checked)
        },
        type: 'checkbox',
        checked: true
    },
    {
        label: '鼠标穿透(M)',
        type: 'checkbox',
        checked: false,
        click: (menuItem, browserWindow, event) => {
            // checkbox value has changed
            BrowserWindow.fromId(memory.get(WindowID.Main))?.setIgnoreMouseEvents(menuItem.checked)
        },
    },
    {
        label: '锁定窗口位置(L)',
        type: 'checkbox',
        checked: false,
        click: (menuItem, browserWindow, event) => {
            BrowserWindow.fromId(memory.get(WindowID.Main))?.setMovable(!menuItem.checked)
        }
    },
    {
        type: 'separator',
    },
    {
        label: '显示主窗口(M)',
        type: 'checkbox',
        checked: true,
        click: (menuItem, browserWindow, event) => {
            if(menuItem.checked){
                BrowserWindow.fromId(memory.get(WindowID.Main))?.show()
            }else {
                BrowserWindow.fromId(memory.get(WindowID.Main))?.minimize()
            }

        },
    },
    {
        label: '显示内存',
        type: 'checkbox',
        checked: false,
        click: (menuItem, browserWindow, event) => {
            const win = BrowserWindow.fromId(memory.get(WindowID.Main))
            if (win?.isDestroyed() === false) {
                if (menuItem.checked) {
                    Memory.register((usage) => {
                        win.webContents.send('memory', usage)
                    })
                    win.setBounds({...win.getBounds(), height: 40})
                } else {
                    Memory.stop()
                    win.webContents.send('memory', '00%')
                    win.setBounds({...win.getBounds(), height: 30})
                }
            }
        }
    },
    {
        label: '窗口不透明度(T)',
        icon: showWindowImage.resize({width: 15, height: 15}),
        submenu: [
            {
                id: '1',
                label: '100%',
                type: 'radio',
                click: (menuItem, browserWindow, event) => {
                    BrowserWindow.fromId(memory.get(WindowID.Main))?.setOpacity(parseFloat(menuItem.id))
                }
            },
            {
                id: '0.8',
                label: '80%',
                type: 'radio',
                click: (menuItem, browserWindow, event) => {
                    BrowserWindow.fromId(memory.get(WindowID.Main))?.setOpacity(parseFloat(menuItem.id))
                }
            },
            {
                id: '0.6',
                label: '60%',
                type: 'radio',
                click: (menuItem, browserWindow, event) => {
                    BrowserWindow.fromId(memory.get(WindowID.Main))?.setOpacity(parseFloat(menuItem.id))
                }
            },
            {
                id: '0.4',
                label: '40%',
                type: 'radio',
                click: (menuItem, browserWindow, event) => {
                    BrowserWindow.fromId(memory.get(WindowID.Main))?.setOpacity(.4)
                }
            }
        ]
    },
    {
        type: 'separator',
    },
    {
        label: '更换皮肤',
        click: (menuItem, browserWindow, event) => {
            createModalWindow({url: 'resources/page/skin/index.html'})
        }
    },
    {
        label: '其他功能...(E)',
        icon: moreImage.resize({width: 15, height: 15}),
        submenu: [
            {
                label: '定时关机',
                click: (menuItem) => {
                    const index = dialog.showMessageBoxSync({
                        title: '定时关机',
                        type: 'warning',
                        message: '请选择多长时间后关机',
                        buttons: ['10min后关机', '30min后关机', '1h后关机', '3h后关机', '5h后关机', '取消关机设置'],
                        cancelId: -1
                    })
                    if (index === -1) return
                    const options = [
                        {h: 1 / 6, label: '10min后关机'}, {h: .5, label: '30min后关机'}, {h: 1, label: '1h后关机'}, {
                            h: 3,
                            label: '3h后关机'
                        },
                        {h: 5, label: '5h后关机'}, {h: -1, label: "已取消"}
                    ]
                    const val = options[index].h
                    if (val === -1) return runCmd('shutdown -a')
                    const later = +(val * 60 * 60).toFixed(0)
                    const date = new Date()
                    date.setSeconds(later)
                    const newLabel = `定时关机(${date.toLocaleDateString()}-${date.toLocaleTimeString()})`
                    console.log(newLabel)
                    const shutdownArgs = `shutdown -s -t ${later}`
                    console.log(shutdownArgs, newLabel)
                    return runCmd(shutdownArgs)
                }
            },
            {
                label: '打开控制面板',
                click: () => {
                    runCmd('control')
                }
            },
            {
                label: '系统信息',
                click: () => {
                    runCmd('msinfo32')
                }
            },
            {
                label: '截图',
                click: () => {
                    runCmd('snippingtool')
                }
            }
        ]
    },
    {
        label: '帮助(H)',
        submenu: [
            // {
            //     label: '常见问题',
            //     icon: helpImage.resize({width: 15, height: 15}),
            //
            // },
            {
                label: '检查更新',
                click: () => {
                    checkingUpdae()
                }
            },
            {
                label: '关于',
                click: () => {
                    createModalWindow({url: 'resources/page/about/index.html', width: 330, height: 237})
                }
            }
        ]
    },
    {
        label: '退出(X)',
        role: 'quit',
        icon: closeImage.resize({width: 15, height: 15})
    }

]);

export const WM_INITMENU = 0x0116;

export function catchWindowSystemContextMenu(browserWindowId: number, contextMenu: Menu) {
    const window = BrowserWindow.fromId(browserWindowId)
    if (!window) return
    window.hookWindowMessage(WM_INITMENU, () => {
        // This is necessary to make sure the native system context menu does not show up.
        window.setEnabled(false);
        window.setEnabled(true);
        contextMenu.popup();
        return 0
    });
}

export function initMenu() {
    Menu.setApplicationMenu(null)
}

export function runCmd(cmd: string) {
    child_process.exec(cmd)
}

export class Cpu {
    public static getMode = os.cpus()[0].model
    public static getPercentage = () => {
        const cpu = this.getTotal()
        console.log(cpu)
        console.log(((cpu.user + cpu.sys) / cpu.total * 100).toFixed(0) + '%')
    }
    public static getTotal = () => {
        // an object containing the number of CPU ticks spent in: user, nice, sys, idle, and irq
        // Nodejs os.cpus() 返回的对象数组中有一个 times 字段，包含了 user、nice、sys、idle、irq 几个指标数据，
        // 分别代表 CPU 在用户模式、良好模式、系统模式、空闲模式、中断模式下花费的毫秒数。
        const cpus = os.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0, total = 0;

        for (const cpu in cpus) {
            const times = cpus[cpu].times;
            user += times.user;
            nice += times.nice;
            sys += times.sys;
            idle += times.idle;
            irq += times.irq;
        }
        total += user + nice + sys + idle + irq;

        return {
            user,
            sys,
            idle,
            total,
        }
    }
}

export class Memory {
    private static tatalmem = os.totalmem()
    private static timeout = 0
    private static callback: ((usage: string) => void) | null = null

    public static register(callback: ((usage: string) => void) | null, immediate = true) {
        this.callback = callback
        this.run(immediate)
        return this
    }

    public static stop() {
        clearTimeout(this.timeout)
    }

    private static getPercentage = () => {
        return ((this.tatalmem - os.freemem()) / this.tatalmem * 100).toFixed(0) + '%'
    }

    private static run = (immediate = true) => {
        if (immediate) {
            this.callback && this.callback(Memory.getPercentage())
            this.timeout = +setTimeout(() => {
                this.run()
            }, 1000)
        }
    }
}

export class NetSpeed {
    private static instance: NetSpeed | null = null
    private lastDwInOctets = -1
    private lastDwOutOctets = -1
    private callback: ((uploadSpeed: number, downloadSpeed: number) => void) | null = null
    private timeout = 0
    private status = ''
    private netState: any = {}

    constructor() {
        if (NetSpeed.instance) {
            return NetSpeed.instance
        }
        NetSpeed.instance = this
    }

    public register(callback: (uploadSpeed: number, downloadSpeed: number) => void) {
        this.callback = callback
        return this
    }

    public start() {
        this.timeout = +setTimeout(() => {
            this.run()
            this.start()
        }, 1000)
    }

    public getNetState() {
        return this.netState
    }

    public stop() {
        this.lastDwOutOctets = -1
        this.lastDwInOctets = -1
        clearTimeout(this.timeout)
    }

    private run() {
        const {dwInOctets, dwOutOctets, bDescr, wszName, dwType, dwOperStatus, dwAdminStatus, dwSpeed} = getAdapter()
        this.netState = {
            "接口名称": wszName,
            "接口描述": bDescr,
            "接口类型 (IANA)": dwType,
            "已接收字节数": dwInOctets,
            "已发送字节数": dwOutOctets,
            "接口的操作状态": dwOperStatus,
            "启用状态": dwAdminStatus,
            "速度（以位/秒为单位）": dwSpeed
        }
        if (this.lastDwInOctets !== -1 && this.lastDwOutOctets !== -1) {
            this.callback && this.callback(dwOutOctets - this.lastDwOutOctets, dwInOctets - this.lastDwInOctets)
        }
        this.lastDwInOctets = dwInOctets
        this.lastDwOutOctets = dwOutOctets
    }
}