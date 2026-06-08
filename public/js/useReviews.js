/**
 * Custom Hook: useReviews()
 * Quản lý trạng thái danh sách bài review, bình luận, và các tương tác API liên quan.
 * Cho phép giao diện đăng ký theo dõi sự thay đổi của danh sách bài review để tự động cập nhật.
 */
function createReviewsHook() {
  // State quản lý danh sách bài review
  let reviews = [];
  const listeners = new Set();

  const notify = () => {
    listeners.forEach(listener => listener(reviews));
  };

  // Helper lấy Header Authorization kèm JWT Token nếu có đăng nhập
  const getAuthHeaders = () => {
    const token = window.authHook ? window.authHook.getToken() : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  return {
    // Lấy danh sách review hiện tại trong state
    getReviews: () => reviews,

    // Đăng ký nhận thông báo thay đổi trạng thái reviews
    subscribe: (listener) => {
      listeners.add(listener);
      listener(reviews);
      return () => listeners.delete(listener);
    },

    // Tải toàn bộ bài review từ API
    fetchReviews: async () => {
      const response = await fetch('/api/reviews');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách bài viết.');
      reviews = data;
      notify();
      return reviews;
    },

    // Tải bài review theo mã sách (phục vụ lọc)
    fetchReviewsByBook: async (bookId) => {
      const response = await fetch(`/api/reviews/book/${bookId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải bài viết của sách này.');
      return data;
    },

    // Tải thông tin chi tiết một bài review
    fetchReviewById: async (id) => {
      const response = await fetch(`/api/reviews/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không tìm thấy bài viết.');
      return data;
    },

    // Đăng bài review mới
    createReview: async (bookTitle, bookAuthor, rating, content, categoryIds = [], customCategories = [], imagePaths = []) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          bookTitle, 
          bookAuthor, 
          rating: parseInt(rating), 
          content,
          categoryIds,
          customCategories,
          imagePaths
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tạo bài viết.');
      
      reviews.unshift(data.review);
      notify();
      return data.review;
    },

    // Chỉnh sửa bài review của mình
    updateReview: async (id, rating, content, categoryIds = [], customCategories = [], imagePaths = []) => {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          rating: parseInt(rating), 
          content,
          categoryIds,
          customCategories,
          imagePaths
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể cập nhật bài viết.');

      const index = reviews.findIndex(r => r.id === parseInt(id));
      if (index !== -1) {
        reviews[index] = data.review;
      }
      notify();
      return data.review;
    },

    // Tải danh sách thể loại từ DB
    fetchCategories: async () => {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách thể loại.');
      return data;
    },

    // Upload danh sách ảnh base64 qua API
    uploadImages: async (imagesBase64) => {
      const response = await fetch('/api/reviews/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ images: imagesBase64 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể upload ảnh.');
      return data.imagePaths;
    },

    // Xóa bài review của mình
    deleteReview: async (id) => {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể xóa bài viết.');

      // Loại bỏ bài viết ra khỏi local state
      reviews = reviews.filter(r => r.id !== parseInt(id));
      notify();
      return true;
    },

    // Lấy bình luận của một bài review
    fetchComments: async (reviewId) => {
      const response = await fetch(`/api/reviews/${reviewId}/comments`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải bình luận.');
      return data;
    },

    // Đăng bình luận mới
    addComment: async (reviewId, content) => {
      const response = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể gửi bình luận.');
      return data.comment;
    },

    // Xóa bình luận của chính mình
    deleteComment: async (commentId) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể xóa bình luận.');
      return true;
    },

    // Tải danh sách tất cả các cuốn sách có sẵn (dành cho dropdown khi thêm review)
    fetchBooks: async () => {
      const response = await fetch('/api/books');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách sách.');
      return data;
    },

    // Tải danh sách sách theo chủ đề (Tích hợp ghép nối API)
    fetchBooksByTopic: async (topic) => {
      const response = await fetch(`/api/books/topic/${encodeURIComponent(topic)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách sách theo chủ đề.');
      return data;
    }
  };
}

window.reviewsHook = createReviewsHook();