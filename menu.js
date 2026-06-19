const { Menu, app } = require('electron');

/**
 * Cấu hình hệ thống Menu tùy chỉnh cho ứng dụng Desktop Electron
 * @param {BrowserWindow} mainWindow - Cửa sổ chính của ứng dụng
 */
function setupMenu(mainWindow) {
  const template = [
    {
      label: 'Ứng dụng',
      submenu: [
        {
          label: 'Trang chủ',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-home');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Thoát ứng dụng',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Hệ thống',
      submenu: [
        {
          label: 'Cài đặt',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-settings');
            }
          }
        },
        {
          label: 'Làm mới dữ liệu',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-refresh');
            }
          }
        }
      ]
    },
    {
      label: 'Thông tin',
      submenu: [
        {
          label: 'Thông tin nhóm',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about-group');
            }
          }
        },
        {
          label: 'Thông tin học phần',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about-course');
            }
          }
        },
        {
          label: 'Giới thiệu app',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about-app');
            }
          }
        }
      ]
    }
  ];

  // Bổ sung menu phát triển (Developer Tools)
  template.push({
    label: 'Phát triển',
    submenu: [
      {
        label: 'Tải lại giao diện',
        role: 'reload'
      },
      {
        label: 'Bật/Tắt DevTools',
        role: 'toggleDevTools'
      }
    ]
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { setupMenu };
