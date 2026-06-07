// ==========================================
// KHỞI TẠO CÁC MODAL (MỐI QUAN HỆ VỚI useModal)
// ==========================================
const authModal = window.useModal('auth-modal');
const reviewModal = window.useModal('review-modal');
const detailModal = window.useModal('detail-modal');

// State giao diện hiện tại
let currentAuthTab = 'login'; // 'login' hoặc 'register'
let selectedTopic = 'all';
let currentDetailReviewId = null;
let allBooksCache = [];

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

  // Tự động biến mất sau 3 giây
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================
// ĐỒNG BỘ TRẠNG THÁI ĐĂNG NHẬP (useAuth Subscription)
// ==========================================
window.authHook.subscribe((user) => {
  const container = document.getElementById('auth-header-container');
  if (!container) return;
  
  if (user) {
    // Đã đăng nhập: hiển thị Avatar và nút Đăng xuất
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
    // Chưa đăng nhập: hiển thị nút Đăng nhập
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="authModal.open(); switchAuthTab('login');">
        <i class="fa-solid fa-user-lock"></i> Đăng nhập
      </button>
    `;
  }

  // Tải lại danh sách bài viết để ẩn/hiện nút Sửa/Xóa tùy theo User mới cập nhật
  renderReviewsList();
});

// ==========================================
// ĐỒNG BỘ TRẠNG THÁI REVIEW (useReviews Subscription)
// ==========================================
window.reviewsHook.subscribe((reviews) => {
  renderReviewsList(reviews);
});

// ==========================================
// VẼ GIAO DIỆN DANH SÁCH BÀI REVIEW
// ==========================================
function renderReviewsList(reviews = window.reviewsHook.getReviews()) {
  const container = document.getElementById('reviews-list-container');
  if (!container) return;
  
  const currentUser = window.authHook.getUser();

  // Lọc review theo chủ đề ở client (nếu có chọn chủ đề)
  let filteredReviews = reviews;
  if (selectedTopic !== 'all') {
    filteredReviews = reviews.filter(r => r.bookTopic === selectedTopic || r.topic === selectedTopic);
  }

  if (filteredReviews.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary)">
        <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5"></i>
        <p>Chưa có bài review nào thuộc chủ đề này. Hãy là người đầu tiên viết bài!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredReviews.map(review => {
    // Sinh số sao bằng FontAwesome
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= review.rating) {
        starsHtml += '<i class="fa-solid fa-star"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star"></i>';
      }
    }

    // Kiểm tra quyền sở hữu bài viết
    const isOwner = currentUser && currentUser.id === review.userId;
    const actionsHtml = isOwner ? `
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="action-btn-icon" onclick="openEditReview(${review.id})" title="Chỉnh sửa bài viết">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button class="action-btn-icon delete" onclick="handleDeleteReview(${review.id})" title="Xóa bài viết">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    ` : '';

    const dateStr = new Date(review.createdAt).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    // Xác định chủ đề
    const topicName = review.bookTopic || review.topic || 'Khác';

    return `
      <div class="review-card" onclick="openReviewDetail(${review.id})">
        <div>
          <div class="review-header">
            <div class="book-info">
              <h3 class="book-title" title="${review.bookTitle}">${review.bookTitle}</h3>
              <p class="book-author">Tác giả: ${review.bookAuthor}</p>
            </div>
            <span class="book-topic-badge">${topicName}</span>
          </div>
          
          <div class="review-stars">
            ${starsHtml}
          </div>
          
          <p class="review-body">${escapeHtml(review.content)}</p>
        </div>

        <div class="review-footer">
          <div class="reviewer-meta">
            <div class="user-avatar" style="width:24px; height:24px; font-size:0.75rem">
              ${(review.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="reviewer-name">${review.username || 'Ẩn danh'}</span>
              <span class="review-date">• ${dateStr}</span>
            </div>
          </div>
          ${actionsHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Helper tránh lỗi XSS tấn công bằng HTML Injection
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ
// ==========================================
function switchAuthTab(tab) {
  currentAuthTab = tab;
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const submitBtn = document.getElementById('auth-submit-btn');
  const alertEl = document.getElementById('auth-error-alert');
  
  if (alertEl) alertEl.style.display = 'none';

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
  const usernameEl = document.getElementById('auth-username');
  const passwordEl = document.getElementById('auth-password');
  const alertEl = document.getElementById('auth-error-alert');
  const alertMsgEl = document.getElementById('auth-error-msg');

  try {
    if (alertEl) alertEl.style.display = 'none';

    if (currentAuthTab === 'login') {
      await window.authHook.login(usernameEl.value, passwordEl.value);
      showToast(`Chào mừng trở lại, ${usernameEl.value}!`);
      authModal.close();
    } 
    else {
      await window.authHook.register(usernameEl.value, passwordEl.value);
      showToast('Đăng ký thành công! Hãy đăng nhập ngay.');
      switchAuthTab('login');
      if (passwordEl) passwordEl.value = '';
    }
  } catch (error) {
    if (alertMsgEl) alertMsgEl.innerText = error.message;
    if (alertEl) alertEl.style.display = 'flex';
  }
}

// Nút đóng modal Auth
document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => {
  authModal.close();
});

// ==========================================
// XỬ LÝ ĐĂNG & SỬA BÀI REVIEW
// ==========================================
document.getElementById('btn-write-review')?.addEventListener('click', () => {
  if (!window.authHook.isAuthenticated()) {
    showToast('Vui lòng đăng nhập trước khi viết bài.', 'error');
    authModal.open();
    return;
  }
  
  // Thiết lập modal ở chế độ "Thêm mới"
  const modalTitle = document.getElementById('review-modal-title');
  const editIdEl = document.getElementById('edit-review-id');
  const errorAlert = document.getElementById('review-error-alert');
  
  if (modalTitle) modalTitle.innerText = 'Viết bài Review Sách';
  if (editIdEl) editIdEl.value = '';
  if (errorAlert) errorAlert.style.display = 'none';
  
  // Sử dụng Optional Chaining (?.) đề phòng lỗi null form
  document.getElementById('review-form')?.reset();
  
  reviewModal.open();
});

async function openEditReview(reviewId) {
  try {
    const review = await window.reviewsHook.fetchReviewById(reviewId);
    
    const modalTitle = document.getElementById('review-modal-title');
    const editIdEl = document.getElementById('edit-review-id');
    const contentEl = document.getElementById('review-content');
    const errorAlert = document.getElementById('review-error-alert');
    
    if (modalTitle) modalTitle.innerText = 'Chỉnh sửa bài viết';
    if (editIdEl) editIdEl.value = review.id;
    if (contentEl) contentEl.value = review.content;
    if (errorAlert) errorAlert.style.display = 'none';

    // Đồng bộ linh hoạt giữa các ID (book-title hoặc review-book-title) có trong HTML
    const titleInput = document.getElementById('book-title') || document.getElementById('review-book-title');
    const authorInput = document.getElementById('book-author') || document.getElementById('review-book-author');
    
    if (titleInput) titleInput.value = review.bookTitle || '';
    if (authorInput) authorInput.value = review.bookAuthor || '';

    // Đánh dấu số sao được chọn
    const starInput = document.querySelector(`.star-picker input[value="${review.rating}"]`);
    if (starInput) starInput.checked = true;

    reviewModal.open();
  } catch (error) {
    showToast('Lỗi tải bài viết để chỉnh sửa: ' + error.message, 'error');
  }
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-review-id').value;
  const ratingInput = document.querySelector('.star-picker input:checked');
  const content = document.getElementById('review-content').value;
  const alertEl = document.getElementById('review-error-alert');
  const alertMsgEl = document.getElementById('review-error-msg');

  // Lấy dữ liệu tiêu đề và tác giả từ form (hỗ trợ cả hai dạng ID)
  const bookTitleEl = document.getElementById('book-title') || document.getElementById('review-book-title');
  const bookAuthorEl = document.getElementById('book-author') || document.getElementById('review-book-author');  

  if (!ratingInput) {
    if (alertMsgEl) alertMsgEl.innerText = 'Vui lòng đánh giá số sao từ 1 đến 5.';
    if (alertEl) alertEl.style.display = 'flex';
    return;
  }

  const rating = ratingInput.value;

  try {
    if (alertEl) alertEl.style.display = 'none';
    if (editId) {
      // Đang sửa review
      await window.reviewsHook.updateReview(editId, rating, content);
      showToast('Cập nhật bài review thành công!');
    } 
    else {
      // Đang tạo review 
      const bookTitle = bookTitleEl ? bookTitleEl.value : '';
      const bookAuthor = bookAuthorEl ? bookAuthorEl.value : '';
      
      // Xác định chủ đề dựa vào thẻ active đang được chọn ở bộ lọc ngoài màn hình chính
      const bookTopic = selectedTopic === 'all' ? 'Khác' : selectedTopic;

      // Truyền thêm tham số bookTopic vào vị trí số 5 của hàm
      await window.reviewsHook.createReview(bookTitle, bookAuthor, rating, content, bookTopic);
      showToast('Đăng bài review mới thành công!');
    }
    reviewModal.close();
  } catch (error) {
    if (alertMsgEl) alertMsgEl.innerText = error.message;
    if (alertEl) alertEl.style.display = 'flex';
  }
}

// Xóa bài review
async function handleDeleteReview(reviewId) {
  if (confirm('Bạn có chắc chắn muốn xóa bài review này không?')) {
    try {
      await window.reviewsHook.deleteReview(reviewId);
      showToast('Đã xóa bài review thành công.');
    } catch (error) {
      showToast('Lỗi xóa bài viết: ' + error.message, 'error');
    }
  }
}

// Đăng ký sự kiện đóng và submit cho Review Form
document.getElementById('close-review-modal-x')?.addEventListener('click', () => reviewModal.close());
document.getElementById('review-form')?.addEventListener('submit', handleReviewSubmit);

// ==========================================
// XỬ LÝ MODAL CHI TIẾT & BÌNH LUẬN
// ==========================================
async function openReviewDetail(reviewId) {
  try {
    currentDetailReviewId = reviewId;
    const review = await window.reviewsHook.fetchReviewById(reviewId);
    
    // Tạo số sao
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += i <= review.rating 
        ? '<i class="fa-solid fa-star"></i>' 
        : '<i class="fa-regular fa-star"></i>';
    }

    const dateStr = new Date(review.createdAt).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const topicName = review.bookTopic || review.topic || 'Khác';

    // Đổ nội dung bài viết vào container chi tiết
    const detailContainer = document.getElementById('detail-review-container');
    if (detailContainer) {
      detailContainer.innerHTML = `
        <div class="detail-book-info">
          <div>
            <h2 style="font-size: 1.6rem; margin-bottom: 0.3rem">${review.bookTitle}</h2>
            <p style="color: var(--text-secondary)"><i class="fa-solid fa-user-pen"></i> Tác giả sách: <strong>${review.bookAuthor}</strong></p>
          </div>
          <span class="book-topic-badge" style="padding: 0.4rem 0.8rem; font-size: 0.8rem">${topicName}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem">
          <div class="review-stars" style="font-size: 1.2rem">
            ${starsHtml}
          </div>
          <div class="reviewer-meta">
            <div class="user-avatar" style="width:28px; height:28px">${(review.username || 'U').charAt(0).toUpperCase()}</div>
            <span style="font-weight: 500">${review.username || 'Ẩn danh'}</span>
          </div>
        </div>

        <div class="detail-content">${escapeHtml(review.content)}</div>
        
        <div class="detail-meta">
          <span>Ngày đăng: ${dateStr}</span>
        </div>
      `;
    }

    // Tải danh sách bình luận
    await loadComments(reviewId);

    // Reset comment input
    const commentInput = document.getElementById('comment-content');
    if (commentInput) commentInput.value = '';

    detailModal.open();
  } catch (error) {
    showToast('Lỗi tải bài viết chi tiết: ' + error.message, 'error');
  }
}

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

// Xử lý gửi bình luận
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  if (!window.authHook.isAuthenticated()) {
    showToast('Vui lòng đăng nhập trước khi bình luận.', 'error');
    authModal.open();
    return;
  }

  const input = document.getElementById('comment-content');
  if (!input) return;
  
  const content = input.value.trim();
  if (!content || !currentDetailReviewId) return;

  try {
    await window.reviewsHook.addComment(currentDetailReviewId, content);
    showToast('Đã gửi bình luận.');
    input.value = '';
    // Tải lại danh sách bình luận
    await loadComments(currentDetailReviewId);
  } catch (error) {
    showToast('Lỗi gửi bình luận: ' + error.message, 'error');
  }
}

// Xóa bình luận
async function handleDeleteComment(commentId) {
  if (confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
    try {
      await window.reviewsHook.deleteComment(commentId);
      showToast('Đã xóa bình luận.');
      // Tải lại bình luận
      await loadComments(currentDetailReviewId);
    } catch (error) {
      showToast('Lỗi xóa bình luận: ' + error.message, 'error');
    }
  }
}

// Đăng ký sự kiện đóng và submit cho Đơn Bình luận
document.getElementById('close-detail-modal-x')?.addEventListener('click', () => detailModal.close());
document.getElementById('comment-form')?.addEventListener('submit', handleCommentSubmit);

// ==========================================
// LỌC CHỦ ĐỀ (TOPICS FILTER EVENT BINDING)
// ==========================================
document.getElementById('topics-filter-container')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('topic-tag')) {
    // Xóa active cũ
    document.querySelectorAll('.topic-tag').forEach(tag => tag.classList.remove('active'));
    
    // Thêm active mới
    e.target.classList.add('active');
    
    // Cập nhật bộ lọc
    selectedTopic = e.target.getAttribute('data-topic');
    renderReviewsList();
  }
});

// Logo Click reset bộ lọc chủ đề về 'all'
document.getElementById('logo-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelectorAll('.topic-tag').forEach(tag => tag.classList.remove('active'));
  
  const allTag = document.querySelector('.topic-tag[data-topic="all"]');
  if (allTag) allTag.classList.add('active');
  
  selectedTopic = 'all';
  renderReviewsList();
});

// ==========================================
// TẢI DỮ LIỆU BAN ĐẦU KHI MỞ TRANG
// ==========================================
async function initApp() {
  try {
    console.log('[App] Khởi động ứng dụng, đang tải reviews...');
    await window.reviewsHook.fetchReviews();
    console.log('[App] Đã tải xong reviews.');
  } catch (error) {
    showToast('Không thể kết nối đến máy chủ: ' + error.message, 'error');
  }
}

// Đăng ký gọi init khi DOM đã sẵn sàng
window.addEventListener('DOMContentLoaded', initApp);