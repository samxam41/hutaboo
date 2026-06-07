const { app: electronApp, BrowserWindow } = require('electron');
const express = require('express');
const path = require('path');
const db = require('./db/database');
const routes = require('./routes/review.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Các middleware xử lý dữ liệu đầu vào
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh (HTML, CSS, JS) trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Gắn các API Routes vào tiền tố /api
app.use('/api', routes);

// Mọi request không khớp với API sẽ được phục vụ giao diện Single Page App (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let mainWindow;

/**
 * Khởi tạo cửa sổ Desktop Electron BrowserWindow
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'BookReviews - Ứng Dụng Review Sách Desktop'
  });

  // Tải giao diện ứng dụng từ Server Express nội bộ
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Tự động mở cửa sổ Console Log (DevTools)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Khởi chạy server sau khi kết nối cơ sở dữ liệu MySQL thành công
const startServer = async () => {
  try {
    console.log('[Server] Đang thiết lập kết nối cơ sở dữ liệu...');
    await db.initialize();
    
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  SERVER BACKEND EXPRESS ĐÃ KHỞI CHẠY TẠI CỔNG ${PORT}`);
      console.log(`====================================================`);
    });

    // Tạo cửa sổ desktop Electron
    createWindow();
  } catch (error) {
    console.error('[Server] Khởi động thất bại do lỗi Database:', error.message);
    console.error('LƯU Ý: Vui lòng đảm bảo dịch vụ MySQL đang chạy (XAMPP/WampServer) và mật khẩu trùng khớp.');
    electronApp.quit();
  }
};

// Quản lý sự kiện vòng đời của Electron App
electronApp.whenReady().then(() => {
  startServer();
});

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    electronApp.quit();
  }
});

electronApp.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
