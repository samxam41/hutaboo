// ==========================================
// KHỞI TẠO CÁC MODAL ĐẶC THÙ (useModal Hook)
// ==========================================
const bookDetailModal = window.useModal('book-detail-modal');

// State giao diện khám phá sách
let isGridView = true;
let searchKeyword = '';
let booksList = [];
let featuredBooks = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let currentDetailBook = null;

// ==========================================
// RENDER BỘ SƯU TẬP SÁCH (Book Explorer)
// ==========================================
function renderBooksList(books = booksList) {
  const container = document.getElementById('books-list-container');
  if (!container) return;

  if (books.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary)">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5"></i>
        <p>Không tìm thấy cuốn sách nào khớp với từ khóa tìm kiếm.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = books.map(book => {
    const tagsHtml = (book.tags || 'Khác').split(',').map(tag => {
      const cleanTag = tag.trim();
      return `<span class="book-card-tag" onclick="event.stopPropagation(); filterBookByTag('${cleanTag}')">#${cleanTag}</span>`;
    }).join(' ');

    const defaultImage = './images/default_cover.svg';
    const coverImage = book.image || defaultImage;

    return `
      <div class="book-card" onclick="openBookDetail(${book.id})">
        <div class="book-cover-wrapper">
          <img src="${coverImage}" class="book-cover-img" alt="${book.title}" onerror="this.src='${defaultImage}'">
        </div>
        <div class="book-info">
          <h3 class="book-card-title" title="${book.title}">${book.title}</h3>
          <p class="book-card-author">🖋️ ${book.author}</p>
          <div class="book-card-tags">
            ${tagsHtml}
          </div>
          <div class="book-card-rating">
            ⭐ ${parseFloat(book.averageRating || 0).toFixed(1)} (${book.reviewCount || 0} bài review)
          </div>
          <div class="book-card-desc" title="${book.description || ''}">
            💬 "${book.description || 'Chưa có mô tả.'}"
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDER SLIDER BANNER SÁCH NỔI BẬT
// ==========================================
function renderSlider() {
  const container = document.getElementById('featured-slider-wrapper');
  if (!container) return;

  // Nếu đang tìm kiếm hoặc không có dữ liệu banner, ẩn slider
  if (searchKeyword.trim() !== '' || featuredBooks.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const book = featuredBooks[currentSlideIndex];
  const defaultImage = './images/default_cover.svg';
  const coverImage = book.image || defaultImage;
  const tagList = (book.tags || 'Khác').split(',');
  const mainTag = tagList[0] || 'Khác';

  container.innerHTML = `
    <button class="slider-btn prev" onclick="prevSlide()"><i class="fa-solid fa-chevron-left"></i></button>
    <div class="slider-slide">
      <div class="slider-left">
        <img src="${coverImage}" class="slide-cover-img" alt="${book.title}" onerror="this.src='${defaultImage}'">
      </div>
      <div class="slider-right">
        <span class="slider-tag">${mainTag}</span>
        <h2 class="slider-title">${book.title}</h2>
        <p class="slider-author">Tác giả: <strong>${book.author}</strong></p>
        <p class="slider-desc">${book.description || 'Chưa có mô tả cho cuốn sách này.'}</p>
        <button class="btn btn-primary" onclick="openBookDetail(${book.id})" style="align-self: flex-start;">
          Xem bài đánh giá <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
    <button class="slider-btn next" onclick="nextSlide()"><i class="fa-solid fa-chevron-right"></i></button>
  `;
}

function nextSlide() {
  if (featuredBooks.length === 0) return;
  currentSlideIndex = (currentSlideIndex + 1) % featuredBooks.length;
  renderSlider();
}

function prevSlide() {
  if (featuredBooks.length === 0) return;
  currentSlideIndex = (currentSlideIndex - 1 + featuredBooks.length) % featuredBooks.length;
  renderSlider();
}

function startSliderAutoplay() {
  stopSliderAutoplay();
  sliderTimer = setInterval(nextSlide, 5000); // Tự động chuyển sau 5s
}

function stopSliderAutoplay() {
  if (sliderTimer) clearInterval(sliderTimer);
}

// ==========================================
// TẢI DỮ LIỆU BAN ĐẦU
// ==========================================
async function fetchBooksData() {
  try {
    const url = searchKeyword.trim() !== '' 
      ? `/api/books?search=${encodeURIComponent(searchKeyword)}` 
      : '/api/books';
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      booksList = data;
      featuredBooks = data.slice(0, 5);
      renderBooksList();
      renderSlider();
    }
  } catch (error) {
    showToast('Lỗi tải dữ liệu sách: ' + error.message, 'error');
  }
}

async function filterBookByTag(tag) {
  try {
    searchKeyword = tag;
    const input = document.getElementById('book-search-input');
    if (input) input.value = tag;
    
    const response = await fetch(`/api/books/topic/${encodeURIComponent(tag)}`);
    const data = await response.json();
    if (response.ok) {
      booksList = data;
      renderBooksList();
      renderSlider(); // Ẩn slider khi đang lọc
    }
  } catch (error) {
    showToast('Lỗi lọc theo thể loại: ' + error.message, 'error');
  }
}

// ==========================================
// CHI TIẾT SÁCH (Book Detail Modal)
// ==========================================
async function openBookDetail(bookId) {
  try {
    const resBook = await fetch(`/api/books/${bookId}`);
    const book = await resBook.json();
    if (!resBook.ok) throw new Error(book.message || 'Không thể tải sách.');
    
    currentDetailBook = book;
    const defaultImage = './images/default_cover.svg';

    document.getElementById('book-detail-info-wrapper').innerHTML = `
      <div class="book-detail-cover">
        <img src="${book.image || defaultImage}" alt="${book.title}" onerror="this.src='${defaultImage}'">
      </div>
      <div class="book-detail-info">
        <h2 class="book-detail-title">${book.title}</h2>
        <p class="book-detail-author"><i class="fa-solid fa-user-pen"></i> Tác giả: <strong>${book.author}</strong></p>
        <p style="color: var(--star-color); font-weight: bold; font-size: 1.1rem; margin-bottom: 0.8rem">
          ⭐ ${parseFloat(book.averageRating || 0).toFixed(1)} (${book.reviewCount || 0} bài đánh giá)
        </p>
        <p class="book-detail-desc">${book.description || 'Chưa có mô tả cho cuốn sách này.'}</p>
        <div class="book-card-tags">
          ${(book.tags || 'Khác').split(',').map(t => `<span class="book-card-tag">#${t.trim()}</span>`).join(' ')}
        </div>
      </div>
    `;

    // Tải toàn bộ các review cho riêng cuốn sách này
    await loadBookReviews(bookId);

    bookDetailModal.open();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Tải đánh giá của riêng sách (Đồng bộ hiển thị ảnh và click zoom)
async function loadBookReviews(bookId) {
  const container = document.getElementById('book-detail-reviews-list-container');
  if (!container) return;
  container.innerHTML = '<p style="color: var(--text-secondary)">Đang tải các đánh giá...</p>';

  try {
    const reviews = await window.reviewsHook.fetchReviewsByBook(bookId);
    if (reviews.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary)">
          <p>Chưa có bài review nào cho cuốn sách này. Hãy chia sẻ cảm nhận đầu tiên của bạn!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reviews.map(review => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += i <= review.rating 
          ? '<i class="fa-solid fa-star"></i>' 
          : '<i class="fa-regular fa-star"></i>';
      }

      const dateStr = new Date(review.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      // Đồng bộ hóa ảnh review trong modal sách chi tiết
      const imagesHtml = (review.images && review.images.length > 0)
        ? `
          <div class="review-images-grid" onclick="event.stopPropagation()">
            ${review.images.map(img => `
              <div class="review-image-thumbnail" onclick="window.openImageModal('/${img}')">
                <img src="/${img}" alt="review image">
              </div>
            `).join('')}
          </div>
        `
        : '';

      const topicName = review.bookTopic || review.topic || 'Khác';

      const categoriesHtml = (review.categories && review.categories.length > 0)
        ? `<div class="review-categories-badges" style="display: flex; flex-wrap: wrap; gap: 0.2rem; justify-content: flex-end; max-width: 50%;">
            ${review.categories.slice(0, 3).map(c => `<span class="book-topic-badge" style="margin: 0;">${c}</span>`).join('')}
            ${review.categories.length > 3 ? `<span class="book-topic-badge" style="margin: 0;">+${review.categories.length - 3}</span>` : ''}
           </div>`
        : `<span class="book-topic-badge">${topicName}</span>`;

      return `
        <div class="review-card" onclick="window.openBookDetailReview(${review.id})" style="margin-bottom: 0.5rem; cursor: pointer; text-align: left;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
              <div style="max-width: 50%;">
                <span style="font-weight:600; font-size:0.95rem; display:block;">Người viết: ${review.username || 'Thành viên'}</span>
                <span style="font-size:0.75rem; color: var(--text-secondary)">${dateStr}</span>
              </div>
              ${categoriesHtml}
            </div>
            <div class="review-stars" style="margin-bottom: 0.5rem;">${starsHtml}</div>
            <p class="review-body" style="font-size: 0.9rem; -webkit-line-clamp: 2;">${escapeHtml(review.content)}</p>
            ${imagesHtml}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger)">Lỗi tải đánh giá: ${error.message}</p>`;
  }
}

// Bắt sự kiện click thẻ review trong Modal sách chi tiết để đóng và mở modal review chi tiết
window.openBookDetailReview = function(reviewId) {
  bookDetailModal.close();
  openReviewDetail(reviewId);
};

// ==========================================
// ĐỒNG BỘ CÁC SỰ KIỆN KHÁC (UI BINDING)
// ==========================================
const bookSearchInput = document.getElementById('book-search-input');
if (bookSearchInput) {
  bookSearchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    fetchBooksData();
  });
}

const viewToggleBtn = document.getElementById('view-toggle-btn');
if (viewToggleBtn) {
  viewToggleBtn.addEventListener('click', (e) => {
    isGridView = !isGridView;
    const container = document.getElementById('books-list-container');
    const btnText = viewToggleBtn.querySelector('span');
    const btnIcon = viewToggleBtn.querySelector('i');
    
    if (isGridView) {
      if (container) container.className = 'books-container grid';
      if (btnText) btnText.innerText = 'Chế độ Lưới (Grid)';
      if (btnIcon) btnIcon.className = 'fa-solid fa-table-cells-large';
    } else {
      if (container) container.className = 'books-container list';
      if (btnText) btnText.innerText = 'Chế độ Danh sách (List)';
      if (btnIcon) btnIcon.className = 'fa-solid fa-bars';
    }
  });
}

const closeBookDetailX = document.getElementById('close-book-detail-x');
if (closeBookDetailX) {
  closeBookDetailX.addEventListener('click', () => bookDetailModal.close());
}

// ==========================================
// KHỞI CHẠY TRANG DISCOVER
// ==========================================
async function initDiscover() {
  // 1. Chờ lấy thể loại để đồng bộ sidebar
  try {
    categoriesList = await window.reviewsHook.fetchCategories();
  } catch (err) {}
  
  renderSidebarGenres();
  
  // Kiểm tra tham số tag từ URL (từ trang khác nhảy sang để lọc)
  const urlParams = new URLSearchParams(window.location.search);
  const tagParam = urlParams.get('tag');
  if (tagParam) {
    await filterBookByTag(tagParam);
  } else {
    await fetchBooksData();
  }

  // Chạy slider autoplay
  startSliderAutoplay();
}

window.addEventListener('DOMContentLoaded', initDiscover);
