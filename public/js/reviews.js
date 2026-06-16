// ==========================================
// KHỞI TẠO CÁC MODAL ĐẶC THÙ (useModal Hook)
// ==========================================
const reviewModal = window.useModal('review-modal');

// State giao diện reviews
let selectedTopic = 'all';
let selectedReviewImages = []; // Danh sách ảnh chọn cho bài review: { type: 'existing'|'new', path, base64, isLocalPath }

// ==========================================
// ĐỒNG BỘ DANH SÁCH REVIEWS (useReviews)
// ==========================================
window.reviewsHook.subscribe((reviews) => {
  renderReviewsList(reviews);
});

// ==========================================
// RENDER DANH SÁCH BÀI REVIEWS
// ==========================================
function renderReviewsList(reviews = window.reviewsHook.getReviews()) {
  const container = document.getElementById('reviews-list-container');
  if (!container) return;
  
  const currentUser = window.authHook.getUser();

  let filteredReviews = reviews;
  if (selectedTopic !== 'all') {
    filteredReviews = reviews.filter(r => {
      if (r.categories && r.categories.includes(selectedTopic)) {
        return true;
      }
      const topicStr = r.bookTopic || r.topic || '';
      return topicStr.toLowerCase().includes(selectedTopic.toLowerCase());
    });
  }

  if (filteredReviews.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary)">
        <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5"></i>
        <p>Chưa có bài review nào thuộc chủ đề này.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredReviews.map(review => {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += i <= review.rating 
        ? '<i class="fa-solid fa-star"></i>' 
        : '<i class="fa-regular fa-star"></i>';
    }

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

    const topicName = review.bookTopic || review.topic || 'Khác';

    const categoriesHtml = (review.categories && review.categories.length > 0)
      ? `<div class="review-categories-badges" style="display: flex; flex-wrap: wrap; gap: 0.2rem; justify-content: flex-end; max-width: 50%;">
          ${review.categories.slice(0, 3).map(c => `<span class="book-topic-badge" style="margin: 0;">${c}</span>`).join('')}
          ${review.categories.length > 3 ? `<span class="book-topic-badge" style="margin: 0;">+${review.categories.length - 3}</span>` : ''}
         </div>`
      : `<span class="book-topic-badge">${topicName}</span>`;

    const imagesHtml = (review.images && review.images.length > 0)
      ? `
        <div class="review-images-grid" onclick="event.stopPropagation()">
          ${review.images.map(img => `
            <div class="review-image-thumbnail" onclick="window.openImageModal('${img}')">
              <img src="${window.normalizeImagePath(img)}" alt="review image">
            </div>
          `).join('')}
        </div>
      `
      : '';

    return `
      <div class="review-card" onclick="openReviewDetail(${review.id})">
        <div>
          <div class="review-header">
            <div class="book-info" style="max-width: 50%;">
              <h3 class="book-title" title="${review.bookTitle}">${review.bookTitle}</h3>
              <p class="book-author">Tác giả: ${review.bookAuthor}</p>
            </div>
            ${categoriesHtml}
          </div>
          
          <div class="review-stars">
            ${starsHtml}
          </div>
          
          <p class="review-body">${escapeHtml(review.content)}</p>
          ${imagesHtml}
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

// ==========================================
// HÀNH ĐỘNG SUBMIT FORM REVIEW & BÌNH LUẬN
// ==========================================
async function handleReviewSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-review-id').value;
  const bookTitleEl = document.getElementById('review-book-title');
  const bookAuthorEl = document.getElementById('review-book-author');
  const ratingInput = document.querySelector('.star-picker input:checked');
  const content = document.getElementById('review-content').value;
  
  const alertEl = document.getElementById('review-error-alert');
  const alertMsgEl = document.getElementById('review-error-msg');

  if (!ratingInput) {
    alertMsgEl.innerText = 'Vui lòng chấm điểm số sao.';
    alertEl.style.display = 'flex';
    return;
  }

  const rating = ratingInput.value;

  // Thu thập các thể loại đã chọn
  const categoryIds = [];
  const badges = document.querySelectorAll('#review-category-select-container .category-select-badge.selected');
  let isOtherSelected = false;
  badges.forEach(b => {
    const id = parseInt(b.getAttribute('data-id'));
    const name = b.getAttribute('data-name');
    if (name === 'Khác') {
      isOtherSelected = true;
    } else {
      categoryIds.push(id);
    }
  });

  let customCategories = [];
  if (isOtherSelected) {
    const otherCat = categoriesList.find(c => c.name === 'Khác');
    if (otherCat) categoryIds.push(otherCat.id);

    const customVal = document.getElementById('review-custom-categories').value.trim();
    if (customVal) {
      customCategories = customVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  console.log('[Frontend Form Submit] Thu thập dữ liệu thể loại từ form:', {
    categoryIds,
    customCategories,
    isOtherSelected
  });

  try {
    alertEl.style.display = 'none';

    // Upload các ảnh mới trước
    let ipcRenderer;
    try {
      const electron = window.require('electron');
      ipcRenderer = electron.ipcRenderer;
    } catch (err) {}

    const localPaths = selectedReviewImages.filter(img => img.type === 'new' && img.isLocalPath).map(img => img.path);
    const webImages = selectedReviewImages.filter(img => img.type === 'new' && !img.isLocalPath).map(img => img.base64);

    let uploadedPaths = [];

    if (ipcRenderer && localPaths.length > 0) {
      const paths = await ipcRenderer.invoke('upload-images-via-path', localPaths);
      uploadedPaths = uploadedPaths.concat(paths);
    }

    if (webImages.length > 0) {
      const paths = await window.reviewsHook.uploadImages(webImages);
      uploadedPaths = uploadedPaths.concat(paths);
    }

    const finalImagePaths = [
      ...selectedReviewImages.filter(img => img.type === 'existing').map(img => img.path),
      ...uploadedPaths
    ];

    if (editId) {
      await window.reviewsHook.updateReview(editId, rating, content, categoryIds, customCategories, finalImagePaths);
      showToast('Cập nhật đánh giá thành công!');
    } else {
      const bookTitle = bookTitleEl ? bookTitleEl.value : '';
      const bookAuthor = bookAuthorEl ? bookAuthorEl.value : '';
      await window.reviewsHook.createReview(bookTitle, bookAuthor, rating, content, categoryIds, customCategories, finalImagePaths);
      showToast('Đăng bài đánh giá mới thành công!');
    }
    reviewModal.close();
    
    // Tải lại danh sách reviews
    await window.reviewsHook.fetchReviews();
  } catch (error) {
    alertMsgEl.innerText = error.message;
    alertEl.style.display = 'flex';
  }
}

async function handleDeleteReview(reviewId) {
  if (confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) {
    try {
      await window.reviewsHook.deleteReview(reviewId);
      showToast('Đã xóa đánh giá thành công.');
    } catch (error) {
      showToast('Lỗi xóa đánh giá: ' + error.message, 'error');
    }
  }
}

async function openEditReview(reviewId) {
  try {
    const review = await window.reviewsHook.fetchReviewById(reviewId);
    
    document.getElementById('review-modal-title').innerText = 'Chỉnh sửa đánh giá';
    
    // Đặt hiển thị nhập liệu
    document.getElementById('book-select-group').style.display = 'block';
    document.getElementById('review-book-title').value = review.bookTitle;
    document.getElementById('review-book-title').readOnly = true;
    document.getElementById('review-book-author').value = review.bookAuthor;
    document.getElementById('review-book-author').readOnly = true;

    document.getElementById('edit-review-id').value = review.id;
    document.getElementById('review-content').value = review.content;
    document.getElementById('review-error-alert').style.display = 'none';

    const starInput = document.querySelector(`.star-picker input[value="${review.rating}"]`);
    if (starInput) starInput.checked = true;

    // Load thể loại
    const defaultCatNames = categoriesList.filter(c => c.is_default == 1).map(c => c.name);
    const customCatNames = review.categories.filter(name => !defaultCatNames.includes(name));
    const defaultSelectedIds = categoriesList.filter(c => c.is_default == 1 && review.categories.includes(c.name)).map(c => c.id);
    
    if (customCatNames.length > 0) {
      const otherCat = categoriesList.find(c => c.name === 'Khác');
      if (otherCat && !defaultSelectedIds.includes(otherCat.id)) {
        defaultSelectedIds.push(otherCat.id);
      }
      document.getElementById('review-custom-categories').value = customCatNames.join(', ');
    } else {
      document.getElementById('review-custom-categories').value = '';
    }
    
    renderCategorySelectors(defaultSelectedIds);

    // Load ảnh hiện có
    selectedReviewImages = (review.images || []).map(path => ({
      type: 'existing',
      path: path
    }));
    renderImagePreviews();

    reviewModal.open();
  } catch (error) {
    showToast('Lỗi tải bài viết chỉnh sửa: ' + error.message, 'error');
  }
}

// Hàm mở modal viết review (hỗ trợ điền sẵn tên tác phẩm và tác giả)
function openWriteReviewModal(title = '', author = '') {
  if (!window.authHook.isAuthenticated()) {
    showToast('Vui lòng đăng nhập trước khi viết đánh giá.', 'error');
    authModal.open();
    return;
  }
  
  document.getElementById('review-modal-title').innerText = 'Viết bài Review Sách';
  document.getElementById('book-select-group').style.display = 'block';
  
  // Reset form trước khi điền
  document.getElementById('edit-review-id').value = '';
  document.getElementById('review-form').reset();
  document.getElementById('review-error-alert').style.display = 'none';

  // Điền thông tin sách nếu được truyền vào
  const titleInput = document.getElementById('review-book-title');
  const authorInput = document.getElementById('review-book-author');
  
  titleInput.value = title;
  titleInput.readOnly = !!title; // Khóa trường nếu đã có tên sẵn
  
  authorInput.value = author;
  authorInput.readOnly = !!author; // Khóa trường nếu đã có tác giả sẵn
  
  renderCategorySelectors([]);
  selectedReviewImages = [];
  renderImagePreviews();
  
  reviewModal.open();
}
window.openWriteReviewModal = openWriteReviewModal;

// Bắt sự kiện viết đánh giá mới từ nút click trực tiếp
document.getElementById('btn-write-review').addEventListener('click', () => {
  openWriteReviewModal();
});

const sidebarActionWrite = document.getElementById('sidebar-action-write');
if (sidebarActionWrite) {
  sidebarActionWrite.addEventListener('click', () => {
    sidebarMenu.close();
    document.getElementById('btn-write-review').click();
  });
}

// ==========================================
// RENDER BADGE VÀ DỰNG PREVIEW ẢNH
// ==========================================
window.toggleCategoryBadge = function(el) {
  el.classList.toggle('selected');
  const name = el.getAttribute('data-name');
  if (name === 'Khác') {
    const customGroup = document.getElementById('custom-category-group');
    if (customGroup) {
      if (el.classList.contains('selected')) {
        customGroup.classList.add('active');
      } else {
        customGroup.classList.remove('active');
        // Xóa giá trị khi bỏ chọn Khác
        const customInput = document.getElementById('review-custom-categories');
        if (customInput) customInput.value = '';
      }
    }
  }
};

function renderCategorySelectors(selectedIds = []) {
  const container = document.getElementById('review-category-select-container');
  if (!container) return;
  
  const defaultCategories = categoriesList.filter(c => c.is_default == 1);
  container.innerHTML = defaultCategories.map(cat => {
    const isSelected = selectedIds.includes(cat.id);
    return `
      <span class="category-select-badge ${isSelected ? 'selected' : ''}" 
            data-id="${cat.id}" data-name="${cat.name}"
            onclick="window.toggleCategoryBadge(this)">
        ${cat.name}
      </span>
    `;
  }).join('');

  const otherBadge = container.querySelector('[data-name="Khác"]');
  const customGroup = document.getElementById('custom-category-group');
  if (otherBadge && otherBadge.classList.contains('selected')) {
    customGroup.classList.add('active');
  } else {
    customGroup.classList.remove('active');
  }
}

// Lọc bài viết theo danh mục thể loại ở toolbar
function renderFilterCategories() {
  const container = document.getElementById('topics-filter-container');
  if (!container) return;
  
  const defaultCats = categoriesList.filter(c => c.is_default == 1);
  container.innerHTML = `
    <span class="topic-tag active" data-topic="all">Tất cả</span>
  ` + defaultCats.map(cat => `
    <span class="topic-tag" data-topic="${cat.name}">${cat.name}</span>
  `).join('');

  document.querySelectorAll('.topic-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      document.querySelectorAll('.topic-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      selectedTopic = tag.getAttribute('data-topic');
      renderReviewsList();
    });
  });
}

// Đọc tệp cục bộ dạng base64 (sử dụng Node.js trong Electron)
function readLocalFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).substring(1);
      const base64 = fileBuffer.toString('base64');
      resolve(`data:image/${ext};base64,${base64}`);
    } catch (err) {
      reject(err);
    }
  });
}

// Đọc tệp dạng base64 (FileReader chuẩn web)
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Xử lý kéo thả và chọn file ảnh
async function handleSelectedFiles(files) {
  const allowedExts = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  for (const file of files) {
    if (!allowedExts.includes(file.type)) {
      showToast('Chỉ hỗ trợ định dạng JPG, JPEG, PNG, WEBP.', 'error');
      continue;
    }
    
    if (file.path) {
      try {
        const base64 = await readLocalFileAsBase64(file.path);
        selectedReviewImages.push({
          type: 'new',
          base64: base64,
          path: file.path,
          isLocalPath: true
        });
      } catch (err) {
        const base64 = await readFileAsBase64(file);
        selectedReviewImages.push({
          type: 'new',
          base64: base64,
          file: file,
          isLocalPath: false
        });
      }
    } else {
      const base64 = await readFileAsBase64(file);
      selectedReviewImages.push({
        type: 'new',
        base64: base64,
        file: file,
        isLocalPath: false
      });
    }
  }
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('image-preview-container');
  if (!container) return;

  if (selectedReviewImages.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = selectedReviewImages.map((img, idx) => {
    const imgSrc = img.type === 'existing' ? window.normalizeImagePath(img.path) : img.base64;
    return `
      <div class="image-preview-item">
        <img src="${imgSrc}" alt="preview">
        <button type="button" class="remove-btn" onclick="window.removePreviewImage(${idx})">&times;</button>
      </div>
    `;
  }).join('');
}

window.removePreviewImage = function(idx) {
  selectedReviewImages.splice(idx, 1);
  renderImagePreviews();
};

function setupDragAndDrop() {
  const dragDropZone = document.getElementById('image-drag-drop-zone');
  const fileInput = document.getElementById('review-image-input');

  if (dragDropZone && fileInput) {
    dragDropZone.onclick = async () => {
      let ipcRenderer;
      try {
        const electron = window.require('electron');
        ipcRenderer = electron.ipcRenderer;
      } catch (e) {}

      if (ipcRenderer) {
        try {
          const filePaths = await ipcRenderer.invoke('select-images-dialog');
          if (filePaths && filePaths.length > 0) {
            for (const filePath of filePaths) {
              const base64 = await readLocalFileAsBase64(filePath);
              selectedReviewImages.push({
                type: 'new',
                base64: base64,
                path: filePath,
                isLocalPath: true
              });
            }
            renderImagePreviews();
          }
        } catch (error) {
          showToast('Lỗi chọn ảnh qua Electron: ' + error.message, 'error');
        }
      } else {
        fileInput.click();
      }
    };

    fileInput.onchange = (e) => {
      handleSelectedFiles(e.target.files);
    };

    dragDropZone.ondragover = (e) => {
      e.preventDefault();
      dragDropZone.classList.add('dragover');
    };

    dragDropZone.ondragleave = () => {
      dragDropZone.classList.remove('dragover');
    };

    dragDropZone.ondrop = (e) => {
      e.preventDefault();
      dragDropZone.classList.remove('dragover');
      handleSelectedFiles(e.dataTransfer.files);
    };
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

const commentForm = document.getElementById('comment-form');
if (commentForm) {
  commentForm.addEventListener('submit', handleCommentSubmit);
}

const reviewCloseBtn = document.getElementById('close-review-modal-x');
if (reviewCloseBtn) {
  reviewCloseBtn.addEventListener('click', () => reviewModal.close());
}

// ==========================================
// KHỞI CHẠY TRANG REVIEWS
// ==========================================
async function initReviews() {
  try {
    categoriesList = await window.reviewsHook.fetchCategories();
  } catch (error) {
    showToast('Lỗi tải danh sách thể loại: ' + error.message, 'error');
  }

  renderSidebarGenres();
  renderFilterCategories();
  setupDragAndDrop();

  try {
    await window.reviewsHook.fetchReviews();
  } catch (error) {
    showToast('Không thể tải danh sách reviews: ' + error.message, 'error');
  }

  // Kiểm tra nếu chuyển từ trang khám phá sang để viết review cho sách cụ thể
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('write') === 'true') {
    const title = urlParams.get('title') || '';
    const author = urlParams.get('author') || '';
    if (title && author) {
      setTimeout(() => {
        openWriteReviewModal(title, author);
      }, 300);
    }
  }
}

window.addEventListener('DOMContentLoaded', initReviews);
