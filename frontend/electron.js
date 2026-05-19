const { app, BrowserWindow } = require('electron')

let win

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600
  })

  // 🔥 FORZAR CONTENIDO SIMPLE
  win.loadURL('data:text/html,<h1>FUNCIONA</h1>')

  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)