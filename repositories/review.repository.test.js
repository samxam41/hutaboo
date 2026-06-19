const mockPool = {
  query: jest.fn()
};

jest.mock('../db/database', () => {
  return {
    getPool: () => mockPool
  };
});

jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    copyFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([])
  };
});

const fs = require('fs');
const { BookRepository, ReviewRepository } = require('./review.repository');

describe('Repositories Unit Tests (Data Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BookRepository.searchBooks (TC-SEARCH-01 to TC-SEARCH-08)', () => {
    test('TC-SEARCH-01: Tìm kiếm theo tên tác phẩm', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko', tags: 'Manga' }]
      ]);
      const result = await BookRepository.searchBooks('Doraemon');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Doraemon');
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['%Doraemon%', '%Doraemon%', '%Doraemon%']);
    });

    test('TC-SEARCH-02: Tìm kiếm theo tên tác giả', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko F. Fujio', tags: 'Manga' }]
      ]);
      const result = await BookRepository.searchBooks('Fujiko');
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Fujiko F. Fujio');
    });

    test('TC-SEARCH-03: Tìm kiếm theo thể loại', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko', tags: 'Manga, Thiếu nhi' }]
      ]);
      const result = await BookRepository.searchBooks('Manga');
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('Manga');
    });

    test('TC-SEARCH-04: Tìm kiếm kết hợp nhiều điều kiện', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko F. Fujio', tags: 'Manga' }]
      ]);
      const result = await BookRepository.searchBooks('Doraemon');
      expect(result).toHaveLength(1);
    });

    test('TC-SEARCH-05: Tìm kiếm không có kết quả', async () => {
      mockPool.query.mockResolvedValue([[]]);
      const result = await BookRepository.searchBooks('NonexistentBookXYZ');
      expect(result).toHaveLength(0);
    });

    test('TC-SEARCH-06: Tìm kiếm từ khóa gần đúng', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko', tags: 'Manga' }]
      ]);
      const result = await BookRepository.searchBooks('Dora');
      expect(result).toHaveLength(1);
    });

    test('TC-SEARCH-07: Tìm kiếm không phân biệt chữ hoa/chữ thường', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, title: 'Doraemon', author: 'Fujiko', tags: 'Manga' }]
      ]);
      const result = await BookRepository.searchBooks('dOrAeMoN');
      expect(result).toHaveLength(1);
    });

    test('TC-SEARCH-08: Tìm kiếm khi bỏ trống từ khóa', async () => {
      mockPool.query.mockResolvedValue([
        [
          { id: 1, title: 'Doraemon', author: 'Fujiko', tags: 'Manga' },
          { id: 2, title: 'One Piece', author: 'Oda', tags: 'Manga' }
        ]
      ]);
      const result = await BookRepository.searchBooks('');
      expect(result).toHaveLength(2);
    });
  });

  describe('ReviewRepository (TC-REVIEW-08 and TC-REVIEW-10)', () => {
    test('TC-REVIEW-08: Lưu review vào database', async () => {
      mockPool.query
        .mockResolvedValueOnce([{ insertId: 50 }]) // insert review
        .mockResolvedValueOnce([{}]) // insert review_categories
        .mockResolvedValueOnce([[]]) // select custom category (not found)
        .mockResolvedValueOnce([{ insertId: 200 }]) // insert new custom category
        .mockResolvedValueOnce([{}]) // insert custom category mapping
        .mockResolvedValueOnce([{}]); // insert review_images

      const reviewId = await ReviewRepository.create(
        2, 3, 5, 'Superb content', [101], ['New Category'], ['uploads/reviews/img.png']
      );
      expect(reviewId).toBe(50);
    });

    test('TC-REVIEW-10: Xóa review hoặc xử lý lỗi khi thao tác review', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ image_path: 'uploads/reviews/img.png' }]]) // select review images
        .mockResolvedValueOnce([{}]); // delete review

      fs.existsSync.mockReturnValue(true);

      const result = await ReviewRepository.delete(50);
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
