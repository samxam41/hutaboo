/**
 * Custom Hook: useAuth()
 * Quản lý trạng thái xác thực và thông tin phiên đăng nhập của người dùng.
 * Sử dụng cơ chế Listener (Observer Pattern) để phát thông báo tới giao diện mỗi khi trạng thái thay đổi.
 */
function createAuthHook() {
  // State quản lý cục bộ thông tin user
  let currentUser = null;
  const listeners = new Set();

  // Khôi phục thông tin đăng nhập từ localStorage khi load trang
  try {
    const savedUser = localStorage.getItem('book_review_user');
    const token = localStorage.getItem('book_review_token');
    if (savedUser && token) {
      currentUser = JSON.parse(savedUser);
    }
  } catch (e) {
    localStorage.removeItem('book_review_user');
    localStorage.removeItem('book_review_token');
  }

  // Phát tín hiệu thông báo cho các thành phần giao diện đã đăng ký theo dõi
  const notify = () => {
    listeners.forEach(listener => listener(currentUser));
  };

  return {
    // Lấy thông tin user hiện tại
    getUser: () => currentUser,
    
    // Lấy token JWT
    getToken: () => localStorage.getItem('book_review_token'),
    
    // Kiểm tra xem đã đăng nhập chưa
    isAuthenticated: () => currentUser !== null,

    // Đăng ký theo dõi sự thay đổi của trạng thái đăng nhập
    subscribe: (listener) => {
      listeners.add(listener);
      // Gọi ngay lập tức để cập nhật giao diện ban đầu
      listener(currentUser);
      return () => listeners.delete(listener); // Trả về hàm hủy theo dõi (unsubscribe)
    },

    // Xử lý gửi request Đăng nhập tới API
    login: async (username, password) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi đăng nhập');
      }

      currentUser = data.user;
      localStorage.setItem('book_review_user', JSON.stringify(data.user));
      localStorage.setItem('book_review_token', data.token);
      
      notify(); // Cập nhật trạng thái cho toàn giao diện
      return data.user;
    },

    // Xử lý gửi request Đăng ký tài khoản
    register: async (username, password) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi đăng ký');
      }
      return data;
    },

    // Xử lý Đăng xuất
    logout: () => {
      currentUser = null;
      localStorage.removeItem('book_review_user');
      localStorage.removeItem('book_review_token');
      notify(); // Thông báo giao diện ẩn các nút nhạy cảm
    }
  };
}

// Gắn đối tượng hook vào window để các file khác có thể sử dụng chung (Shared State)
window.authHook = createAuthHook();
