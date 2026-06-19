const { app: electronApp, BrowserWindow, ipcMain, dialog } = require('electron');
const express = require('express');
const path = require('path');
const db = require('./db/database');
const routes = require('./routes/review.routes');
const { setupMenu } = require('./menu');

const app = express();
const PORT = process.env.PORT || 3000;

// Các middleware xử lý dữ liệu đầu vào (mở rộng giới hạn payload để nhận ảnh base64 lớn)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// ELECTRON IPC CHANNELS FOR IMAGE UPLOAD
// ==========================================
ipcMain.handle('select-images-dialog', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn ảnh cho bài review',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Hình ảnh', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('upload-images-via-path', async (event, filePaths) => {
  const fs = require('fs');
  const path = require('path');
  
  let dir;
  if (process.versions.electron) {
    const { app: electronApp } = require('electron');
    const appInstance = electronApp || require('@electron/remote').app;
    dir = path.join(appInstance.getPath('userData'), 'uploads/reviews');
  } else {
    dir = path.join(__dirname, 'public/uploads/reviews');
  }
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const savedPaths = [];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExts.includes(ext)) {
      throw new Error(`Định dạng ảnh không được hỗ trợ: ${ext}. Chỉ hỗ trợ JPG, JPEG, PNG, WEBP.`);
    }

    const filename = 'review-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    const destPath = path.join(dir, filename);
    
    fs.copyFileSync(filePath, destPath);
    savedPaths.push('uploads/reviews/' + filename);
  }

  return savedPaths;
});

// Cấu hình static folder phục vụ ảnh upload động từ userData của Electron (nếu chạy Electron)
if (process.versions.electron) {
  try {
    const { app: electronApp } = require('electron');
    const appInstance = electronApp || require('@electron/remote').app;
    if (appInstance) {
      const userDataUploads = path.join(appInstance.getPath('userData'), 'uploads');
      app.use('/uploads', express.static(userDataUploads));
      console.log(`[Server] Phục vụ static /uploads từ: ${userDataUploads}`);
    }
  } catch (e) {
    console.warn('[Server] Không thể cấu hình static /uploads từ userData:', e.message);
  }
}

// Phục vụ các file tĩnh (HTML, CSS, JS) trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Gắn các API Routes vào tiền tố /api
app.use('/api', routes);

// Phục vụ cụ thể các trang HTML tĩnh
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discover.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discover.html'));
});

app.get('/discover.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discover.html'));
});

app.get('/reviews.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reviews.html'));
});

app.get('/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reviews.html'));
});

// Mọi request không khớp với API sẽ được phục vụ giao diện mặc định (discover.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discover.html'));
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

  // Thiết lập menu ứng dụng Electron tùy chỉnh
  setupMenu(mainWindow);

  // Không tự động mở cửa sổ Console Log (DevTools) khi khởi động (người dùng bật khi cần)
  // mainWindow.webContents.openDevTools();

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
