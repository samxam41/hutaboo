/**
 * Custom Hook: useModal(modalElementId)
 * Quản lý trạng thái đóng/mở của các Modal Popup giao diện.
 * Giúp cô lập logic hiển thị và dễ dàng sử dụng lại cho nhiều hộp thoại khác nhau (Đăng nhập, Đăng bài, Chi tiết).
 */
function useModal(modalElementId) {
  let isOpen = false;
  const listeners = new Set();

  const getElement = () => document.getElementById(modalElementId);

  // Cập nhật thuộc tính hiển thị trên DOM thực tế
  const updateDOM = () => {
    const el = getElement();
    if (!el) return;
    
    if (isOpen) {
      el.classList.add('active');
      el.style.display = 'flex'; // Dùng flex để căn giữa hộp thoại
      document.body.style.overflow = 'hidden'; // Ngăn cuộn trang chính khi đang mở modal
    } else {
      el.classList.remove('active');
      el.style.display = 'none';
      document.body.style.overflow = ''; // Khôi phục cuộn trang
    }
  };

  const notify = () => {
    listeners.forEach(listener => listener(isOpen));
  };

  return {
    // Getter lấy trạng thái đóng/mở hiện tại
    isOpen: () => isOpen,
    
    // Đăng ký nhận sự kiện khi modal đóng hoặc mở
    subscribe: (listener) => {
      listeners.add(listener);
      listener(isOpen);
      return () => listeners.delete(listener);
    },

    // Hàm Mở modal
    open: () => {
      isOpen = true;
      updateDOM();
      notify();
    },

    // Hàm Đóng modal
    close: () => {
      isOpen = false;
      updateDOM();
      notify();
    },

    // Hàm Đóng/Mở xen kẽ
    toggle: () => {
      isOpen = !isOpen;
      updateDOM();
      notify();
    }
  };
}

// Khai báo hàm dùng chung trên đối tượng window toàn cục
window.useModal = useModal;
