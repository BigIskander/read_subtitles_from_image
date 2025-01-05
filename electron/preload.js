const { contextBridge, ipcRenderer, shell } = require('electron');
const childProcess = require('child_process');

const allowedURLs = [
    'https://github.com/BigIskander/read_subtitles_from_image'
];

// open allowed links in external browser i.e. open in OS's default browser
contextBridge.exposeInMainWorld('externalLink', {
    open: (link) => {
        if(allowedURLs.includes(link)) shell.openExternal(link)
    }
});

// show context menu
contextBridge.exposeInMainWorld('electronAPI', {
    showContextMenu: (event) => { ipcRenderer.send('show-context-menu', event); }
});

var language = "chi_all";
var tessdataDir = null;
var tesseractPath = null;

// tesseract OCR
contextBridge.exposeInMainWorld('tesseractOCR', {
    recognize: (imageDataUrl) => {
        const imageBuffer = Buffer.from(imageDataUrl.split('base64,')[1], 'base64');
        var tesseract = tesseractPath ? path.join(tesseractPath, "tesseract") : "tesseract";
        var commandArgs = ["-l", language, "--dpi", "96", "--oem", "3", "-", "stdout"];
        if(tessdataDir) {
            commandArgs.splice(0, 0, "--tessdata-dir");
            commandArgs.splice(1, 0, tessdataDir);
        }
        var tesseractProcess = childProcess.spawn(tesseract, commandArgs);
        const prom = new Promise(async (resolve) => {
            tesseractProcess.on('error', (err) => { resolve({ err: err.toString(), data: "" }); });
            tesseractProcess.stdout.on('data', function (data) {
                resolve({ err: "", data: data.toString() });
            });
            tesseractProcess.stderr.on('data', (err) => {
                resolve({ err: err.toString(), data: "" });
            });
            tesseractProcess.stdin.write(imageBuffer);
            tesseractProcess.stdin.end();
        });
        return prom;
    }
});