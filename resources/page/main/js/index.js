const {ipcRenderer} = require('electron')
const download = document.querySelector('.download')
const upload = document.querySelector('.upload')
const bgImg = document.querySelector('.container')
const imgDir = ipcRenderer.sendSync('get-resources-dir-sync', 'img')
bgImg.style.backgroundImage = `url(${imgDir}/body-skin.png)`
ipcRenderer.on('speed', (e, {uploadSpeed, downloadSpeed}) => {
    download.textContent = downloadSpeed
    upload.textContent = uploadSpeed
})
ipcRenderer.on('memory', (e, useage) => {
    if (useage == '00%') {
        document.querySelector('.more').style.display = 'none'
    } else {
        document.querySelector('.more').style.display = 'block'
    }
    document.querySelector('.memory').textContent = useage
})