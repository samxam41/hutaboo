/**
 * Custom Hook: useBooks()
 * Quản lý các tương tác API liên quan đến sách.
 * Phục vụ cho chức năng của Người 1 (Khám phá sách).
 */
function createBooksHook() {
  return {
    // Tải danh sách tất cả các cuốn sách
    fetchBooks: async (searchKeyword = '') => {
      const url = searchKeyword.trim() !== '' 
        ? `/api/books?search=${encodeURIComponent(searchKeyword)}` 
        : '/api/books';
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách sách.');
      return data;
    },

    // Tải danh sách sách theo chủ đề
    fetchBooksByTopic: async (topic) => {
      const response = await fetch(`/api/books/topic/${encodeURIComponent(topic)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách sách theo chủ đề.');
      return data;
    }
  };
}

// Gắn đối tượng hook vào window để các file khác có thể sử dụng (Shared State / API wrapper)
window.booksHook = createBooksHook();
