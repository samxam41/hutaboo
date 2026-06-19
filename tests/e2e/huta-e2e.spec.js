const { test, expect } = require('@playwright/test');

test.describe('HuTaBoo E2E Integration Tests', () => {
  let authData = null;

  test.beforeAll(async ({ request }) => {
    // Tạo tài khoản và đăng nhập ngẫu nhiên qua API để lấy token phục vụ viết review
    const randomUsername = `e2e_user_${Date.now()}`;
    const registerRes = await request.post('/api/auth/register', {
      data: { username: randomUsername, password: 'password123' }
    });

    if (!registerRes.ok()) {
      console.error('[E2E Setup] Register failed:', await registerRes.text());
    }

    const loginRes = await request.post('/api/auth/login', {
      data: { username: randomUsername, password: 'password123' }
    });
    
    if (loginRes.ok()) {
      authData = await loginRes.json();
    } else {
      console.error('[E2E Setup] Login failed:', await loginRes.text());
    }
  });

  test('TC-E2E-01: Tìm kiếm sách theo từ khóa', async ({ page }) => {
    await page.goto('/');
    
    // Nhập từ khóa tìm kiếm "Doraemon" vào ô tìm kiếm
    const searchInput = page.locator('#book-search-input');
    await searchInput.fill('Doraemon');

    // Chờ kết quả lọc trên UI cập nhật và kiểm tra
    const bookTitle = page.locator('.book-card-title').first();
    await expect(bookTitle).toHaveText('Doraemon');
  });

  test('TC-E2E-02: Đăng review sách mới từ giao diện', async ({ page }) => {
    // Đảm bảo đã lấy được thông tin đăng nhập từ trước
    expect(authData).not.toBeNull();

    await page.goto('/reviews.html');

    // Thiết lập trạng thái đăng nhập qua localStorage trong ngữ cảnh trình duyệt
    await page.evaluate(({ user, token }) => {
      localStorage.setItem('book_review_user', JSON.stringify(user));
      localStorage.setItem('book_review_token', token);
    }, { user: authData.user, token: authData.token });

    // Tải lại trang để áp dụng trạng thái đăng nhập
    await page.reload();

    // Click vào nút "Viết review" để mở Modal
    await page.click('#btn-write-review');
    await expect(page.locator('#review-modal')).toBeVisible();

    // Điền thông tin vào form viết review
    await page.fill('#review-book-title', 'Sách Thử Nghiệm E2E');
    await page.fill('#review-book-author', 'Tác Giả E2E');
    
    // Chọn đánh giá 5 sao
    await page.click('label[for="star5"]');
    
    // Nhập nội dung review
    await page.fill('#review-content', 'Đây là nội dung bài review sách được viết tự động bởi kịch bản kiểm thử E2E Playwright.');
    
    // Gửi form
    await page.click('#review-submit-btn');

    // Kiểm tra xem modal đã đóng lại hay chưa
    await expect(page.locator('#review-modal')).not.toBeVisible();

    // Kiểm tra xem bài review mới có hiển thị trong danh sách đánh giá không
    const firstReviewTitle = page.locator('.review-card .book-title').first();
    await expect(firstReviewTitle).toHaveText('Sách Thử Nghiệm E2E');
  });
});
