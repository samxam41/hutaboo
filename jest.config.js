module.exports = {
  // Môi trường chạy test là Node.js
  testEnvironment: 'node',

  // Quy ước tìm kiếm các file test kết thúc bằng _test.js
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '**/*_test.js'
  ],

  // Tự động dọn dẹp mock trước mỗi ca test
  clearMocks: true,

  // Thiết lập thời gian tối đa cho mỗi ca test (ví dụ 15 giây)
  testTimeout: 15000
};
