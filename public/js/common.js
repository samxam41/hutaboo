// ==========================================
// KHỞI TẠO CÁC MODAL DÙNG CHUNG (useModal Hook)
// ==========================================
const authModal = window.useModal('auth-modal');
const sidebarMenu = window.useModal('sidebar-menu');
const detailModal = window.useModal('detail-modal');

// State dùng chung
let currentAuthTab = 'login'; // 'login' hoặc 'register'
let categoriesList = []; // Danh sách thể loại tải từ DB
let currentDetailReviewId = null;

// ==========================================
// TOAST NOTIFICATION HELPER
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '<i class="fa-solid fa-circle-check" style="color: var(--success)"></i>' 
    : '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger)"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================
// ĐỒNG BỘ TRẠNG THÁI ĐĂNG NHẬP (useAuth)
// ==========================================
window.authHook.subscribe((user) => {
  const container = document.getElementById('auth-header-container');
  if (!container) return;
  
  if (user) {
    const firstChar = user.username.charAt(0).toUpperCase();
    container.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${firstChar}</div>
        <span class="username-display">${user.username}</span>
      </div>
      <button class="btn btn-secondary" onclick="window.authHook.logout(); showToast('Đã đăng xuất tài khoản.');">
        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
      </button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="authModal.open(); switchAuthTab('login');">
        <i class="fa-solid fa-user-lock"></i> Đăng nhập
      </button>
    `;
  }
});

// ==========================================
// ĐIỀU KHIỂN ĐĂNG NHẬP / ĐĂNG KÝ
// ==========================================
function switchAuthTab(tab) {
  currentAuthTab = tab;
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const submitBtn = document.getElementById('auth-submit-btn');
  const errorAlert = document.getElementById('auth-error-alert');

  if (errorAlert) errorAlert.style.display = 'none';

  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
    if (submitBtn) submitBtn.innerText = 'Đăng nhập';
  } else {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (submitBtn) submitBtn.innerText = 'Đăng ký tài khoản';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const errorAlert = document.getElementById('auth-error-alert');
  const errorMsg = document.getElementById('auth-error-msg');

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    if (errorAlert) errorAlert.style.display = 'none';
    
    if (currentAuthTab === 'login') {
      await window.authHook.login(username, password);
      showToast('Đăng nhập thành công!');
      authModal.close();
    } else {
      await window.authHook.register(username, password);
      showToast('Đăng ký tài khoản thành công! Hãy đăng nhập.');
      switchAuthTab('login');
      passwordInput.value = '';
    }
  } catch (error) {
    if (errorMsg) errorMsg.innerText = error.message;
    if (errorAlert) errorAlert.style.display = 'flex';
  }
}

// Bắt sự kiện đóng modal auth bằng nút hủy
const closeAuthBtn = document.getElementById('close-auth-modal-btn');
if (closeAuthBtn) {
  closeAuthBtn.addEventListener('click', () => authModal.close());
}

// ==========================================
// SIDEBAR MENU CONTROLLER
// ==========================================
const openSidebarBtn = document.getElementById('open-sidebar-btn');
if (openSidebarBtn) {
  openSidebarBtn.addEventListener('click', () => sidebarMenu.open());
}

const closeSidebarBtn = document.getElementById('close-sidebar-btn');
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', () => sidebarMenu.close());
}

const categoryToggleBtn = document.getElementById('sidebar-category-toggle');
if (categoryToggleBtn) {
  categoryToggleBtn.addEventListener('click', () => {
    const container = document.getElementById('sidebar-categories-container');
    const chevron = document.getElementById('sidebar-chevron');
    
    if (container) container.classList.toggle('active');
    if (chevron) {
      if (container && container.classList.contains('active')) {
        chevron.className = 'fa-solid fa-chevron-down';
      } else {
        chevron.className = 'fa-solid fa-chevron-right';
      }
    }
  });
}

// Điền các thể loại vào Sidebar
const renderSidebarGenres = () => {
  const container = document.getElementById('sidebar-categories-container');
  if (!container) return;
  
  container.innerHTML = categoriesList.map(cat => `
    <button class="sidebar-tag-btn" onclick="filterBookByTagAndRedirect('${cat.name}'); sidebarMenu.close();">
      #${cat.name}
    </button>
  `).join('');
};

// Hàm lọc theo thẻ loại ở sidebar (Nếu đang ở trang reviews, tự động nhảy về discover)
function filterBookByTagAndRedirect(tag) {
  if (typeof filterBookByTag === 'function') {
    filterBookByTag(tag);
  } else {
    // Chuyển sang discover.html và truyền tham số tag trên URL
    window.location.href = `discover.html?tag=${encodeURIComponent(tag)}`;
  }
}

// Logo Click reset
const logoBtn = document.getElementById('logo-btn');
if (logoBtn) {
  logoBtn.addEventListener('click', (e) => {
    if (window.location.pathname.includes('discover.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      e.preventDefault();
      if (typeof searchKeyword !== 'undefined') searchKeyword = '';
      const input = document.getElementById('book-search-input');
      if (input) input.value = '';
      if (typeof fetchBooksData === 'function') fetchBooksData();
    }
  });
}

const closeDetailModalX = document.getElementById('close-detail-modal-x');
if (closeDetailModalX) {
  closeDetailModalX.addEventListener('click', () => detailModal.close());
}

// Helper tránh lỗi XSS
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Chuẩn hóa đường dẫn hình ảnh (Hỗ trợ ảnh cũ ./images, ảnh mới uploads/, và ảnh base64)
function normalizeImagePath(path) {
  if (!path) return '/uploads/covers/default_cover.svg';
  if (path.startsWith('data:image/')) return path; // Giữ nguyên base64
  let p = path.trim();
  if (p.startsWith('./')) {
    p = p.substring(1); // Bỏ dấu chấm ở đầu, còn lại '/images/...'
  }
  if (!p.startsWith('/')) {
    p = '/' + p;
  }
  return p;
}
window.normalizeImagePath = normalizeImagePath;

// Click to Zoom modal ảnh toàn màn hình
window.openImageModal = function(imgSrc) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(8, 12, 20, 0.95)';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.cursor = 'zoom-out';
  overlay.style.backdropFilter = 'blur(10px)';
  overlay.style.webkitBackdropFilter = 'blur(10px)';
  
  const img = document.createElement('img');
  img.src = normalizeImagePath(imgSrc);
  img.style.maxWidth = '90%';
  img.style.maxHeight = '90%';
  img.style.objectFit = 'contain';
  img.style.borderRadius = '12px';
  img.style.boxShadow = '0 20px 50px rgba(0,0,0,0.6)';
  img.style.animation = 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  overlay.appendChild(img);
  document.body.appendChild(overlay);
  
  overlay.onclick = () => {
    overlay.style.animation = 'scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse';
    setTimeout(() => {
      overlay.remove();
    }, 200);
  };
};

// ==========================================
// CHI TIẾT REVIEW & BÌNH LUẬN (CHỈ ĐỌC)
// ==========================================
async function openReviewDetail(reviewId) {
  try {
    const review = await window.reviewsHook.fetchReviewById(reviewId);
    currentDetailReviewId = reviewId;

    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += i <= review.rating 
        ? '<i class="fa-solid fa-star"></i>' 
        : '<i class="fa-regular fa-star"></i>';
    }

    const dateStr = new Date(review.createdAt).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    const categoriesHtml = (review.categories && review.categories.length > 0)
      ? `<div style="display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: flex-end; max-width: 50%;">
          ${review.categories.map(c => `<span class="book-topic-badge" style="background: rgba(74, 144, 226, 0.15); color: var(--primary); padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: none; letter-spacing: 0;">${c}</span>`).join('')}
         </div>`
      : `<span class="book-topic-badge" style="background: rgba(74, 144, 226, 0.15); color: var(--primary); padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">Khác</span>`;

    const imagesHtml = (review.images && review.images.length > 0)
      ? `
        <div class="detail-review-images-grid">
          ${review.images.map(img => `
            <div class="detail-review-image" onclick="window.openImageModal('${img}')">
              <img src="${normalizeImagePath(img)}" alt="review image">
            </div>
          `).join('')}
        </div>
      `
      : '';

    document.getElementById('detail-review-container').innerHTML = `
      <div class="detail-review-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
        <div style="max-width: 50%;">
          <h2 class="book-title" style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.3rem;">${review.bookTitle}</h2>
          <p class="book-author" style="color: var(--text-secondary); margin-bottom: 0.5rem;">Tác giả: <strong>${review.bookAuthor}</strong></p>
          <div class="review-stars" style="color: var(--star-color); font-size: 1.1rem;">${starsHtml}</div>
        </div>
        ${categoriesHtml}
      </div>
      <div class="reviewer-meta" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
        <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.9rem;">
          ${(review.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <span class="reviewer-name" style="font-weight: 600;">${review.username || 'Ẩn danh'}</span>
          <span class="review-date" style="color: var(--text-secondary); font-size: 0.8rem;"> • Đăng ngày ${dateStr}</span>
        </div>
      </div>
      <div class="review-content-body" style="font-size: 1.05rem; line-height: 1.6; white-space: pre-wrap; margin-bottom: 1.5rem; color: var(--text-primary);">
        ${escapeHtml(review.content)}
      </div>
      ${imagesHtml}
    `;

    // Tải bình luận
    await loadComments(reviewId);

    // Mở modal
    detailModal.open();
  } catch (error) {
    showToast('Không thể tải chi tiết bài viết: ' + error.message, 'error');
  }
}

// Tải danh sách bình luận (dùng chung cho cả 2 view chi tiết)
async function loadComments(reviewId) {
  const container = document.getElementById('comments-list-container');
  if (!container) return;
  container.innerHTML = '<p style="color: var(--text-secondary)">Đang tải bình luận...</p>';

  try {
    const comments = await window.reviewsHook.fetchComments(reviewId);
    const currentUser = window.authHook.getUser();

    if (comments.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem">Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</p>';
      return;
    }

    container.innerHTML = comments.map(comment => {
      const isCommentOwner = currentUser && currentUser.id === comment.userId;
      const deleteBtn = isCommentOwner ? `
        <button class="action-btn-icon delete" onclick="handleDeleteComment(${comment.id})" title="Xóa bình luận">
          <i class="fa-regular fa-trash-can" style="font-size: 0.85rem"></i>
        </button>
      ` : '';

      const dateStr = new Date(comment.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="comment-item">
          <div class="comment-left">
            <div class="comment-author-meta">
              <span class="comment-author">${comment.username || 'Thành viên'}</span>
              <span class="comment-date">${dateStr}</span>
            </div>
            <p class="comment-text">${escapeHtml(comment.content)}</p>
          </div>
          ${deleteBtn}
        </div>
      `;
    }).join('');
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger)">Lỗi tải bình luận: ${error.message}</p>`;
  }
}

// ==========================================
// DYNAMIC MODALS FOR ELECTRON APPLICATION MENU
// ==========================================
function showAboutModal(type) {
  let modalEl = document.getElementById('about-info-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'about-info-modal';
    modalEl.className = 'modal-overlay';
    document.body.appendChild(modalEl);
  }

  let title = '';
  let content = '';

  if (type === 'group') {
    title = 'Thông tin Nhóm thực hiện';
    content = `
      <div style="line-height: 1.6;">
        <p><strong>Mã nhóm:</strong> Nhóm 01</p>
        <p style="margin-bottom: 0.5rem; font-weight: 600;">Danh sách thành viên:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; margin-bottom: 0.5rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
              <th style="padding: 0.5rem 0;">Họ và tên</th>
              <th>MSSV</th>
              <th>Vai trò</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.5rem 0;">Nguyễn Thu Hường</td>
              <td>20231594</td>
              <td>Viết review</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.5rem 0;">Ngô Phương Thanh</td>
              <td>20231628</td>
              <td>Tìm kiếm sách</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else if (type === 'course') {
    title = 'Thông tin Học phần';
    content = `
      <div style="line-height: 1.6;">
        <p><strong>Môn học:</strong> AC3030 – Phát triển ứng dụng</p>
        <p><strong>Học kỳ:</strong> 2025.2, Năm học 2025 - 2026</p>
        <p><strong>Giảng viên phụ trách:</strong> TS. Nguyễn Việt Tùng</p>
        <p style="margin-top: 0.5rem;"><strong>Nội dung đồ án BTL:</strong> Xây dựng ứng dụng Desktop đăng bài review sách, tìm kiếm sách đọc theo thể loại, tác giả, tên,...</p>
      </div>
    `;
  } else if (type === 'app') {
    title = 'Giới thiệu Ứng dụng';
    content = `
      <div style="line-height: 1.6;">
        <p><strong>Tên ứng dụng:</strong> HuTaBoo - Mạng xã hội chia sẻ và đánh giá sách</p>
        <p><strong>Mục đích:</strong> Giúp độc giả lưu trữ tác phẩm, chia sẻ cảm nghĩ qua các bài review, đánh giá chất lượng (sao) và bình luận trao đổi học thuật.</p>
        <p><strong>Phiên bản:</strong> v2.1.0-release</p>
        <p style="margin-top: 0.5rem; font-weight: 600;">Công nghệ sử dụng:</p>
        <ul style="padding-left: 1.2rem; margin-top: 0.3rem;">
          <li>Desktop Container: Electron v41.7.1</li>
          <li>API Backend: Express v4.19.2 (NodeJS)</li>
          <li>Cơ sở dữ liệu: MySQL v8.0</li>
          <li>Công cụ test: Jest & Supertest</li>
        </ul>
      </div>
    `;
  }

  modalEl.innerHTML = `
    <div class="modal-content" style="max-width: 500px; text-align: left;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 1rem;">
        <h3 class="modal-title" style="margin: 0; color: var(--text-primary);">${title}</h3>
        <button class="close-modal-btn" id="close-about-info-modal-x" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">&times;</button>
      </div>
      <div class="modal-body">
        ${content}

      </div>
    </div>
  `;

  // Sử dụng hook useModal sẵn có
  const customModal = window.useModal('about-info-modal');
  customModal.open();

  document.getElementById('close-about-info-modal-x').onclick = () => customModal.close();
  document.getElementById('close-about-info-modal-btn').onclick = () => customModal.close();
}

// Lắng nghe sự kiện IPC từ Electron Main Process
if (typeof require !== 'undefined') {
  try {
    const { ipcRenderer } = require('electron');

    ipcRenderer.on('menu-home', () => {
      // Điều hướng về Trang chủ (discover.html)
      if (window.location.pathname.includes('discover.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        if (typeof searchKeyword !== 'undefined') searchKeyword = '';
        const input = document.getElementById('book-search-input');
        if (input) input.value = '';
        if (typeof fetchBooksData === 'function') fetchBooksData();
      } else {
        window.location.href = 'discover.html';
      }
    });

    ipcRenderer.on('menu-refresh', () => {
      window.location.reload();
    });

    ipcRenderer.on('menu-settings', () => {
      if (typeof showToast === 'function') {
        showToast('Tính năng cài đặt hệ thống sẽ được nâng cấp trong phiên bản tiếp theo.', 'info');
      }
    });

    ipcRenderer.on('menu-about-group', () => {
      showAboutModal('group');
    });

    ipcRenderer.on('menu-about-course', () => {
      showAboutModal('course');
    });

    ipcRenderer.on('menu-about-app', () => {
      showAboutModal('app');
    });
  } catch (err) {
    console.warn('[IPC Renderer] Không thể tải thư viện Electron:', err.message);
  }
}

// ==========================================
// QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  if (!window.authHook.isAuthenticated()) {
    showToast('Vui lòng đăng nhập trước khi bình luận.', 'error');
    authModal.open();
    return;
  }

  const input = document.getElementById('comment-content');
  const content = input ? input.value.trim() : '';
  if (!content || !currentDetailReviewId) return;

  try {
    await window.reviewsHook.addComment(currentDetailReviewId, content);
    showToast('Đã gửi bình luận.');
    if (input) input.value = '';
    await loadComments(currentDetailReviewId);
  } catch (error) {
    showToast('Lỗi gửi bình luận: ' + error.message, 'error');
  }
}

async function handleDeleteComment(commentId) {
  if (confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
    try {
      await window.reviewsHook.deleteComment(commentId);
      showToast('Đã xóa bình luận.');
      await loadComments(currentDetailReviewId);
    } catch (error) {
      showToast('Lỗi xóa bình luận: ' + error.message, 'error');
    }
  }
}

// Gắn các hàm xử lý bình luận vào phạm vi global để sự kiện inline onclick tìm thấy
window.handleDeleteComment = handleDeleteComment;
window.handleCommentSubmit = handleCommentSubmit;

// Đăng ký sự kiện submit cho form bình luận khi DOM sẵn sàng
function bindCommentForm() {
  const commentForm = document.getElementById('comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindCommentForm);
} else {
  bindCommentForm();
}
