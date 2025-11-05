import { Request, Response } from 'express';
import { BookService } from '../services/bookService';
import Joi from 'joi';

const bookService = new BookService();

const createBookSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  author: Joi.string().min(1).max(100).required(),
  isbn: Joi.string().optional(),
  cover: Joi.string().uri().optional(),
  description: Joi.string().max(1000).optional(),
  ageGroup: Joi.string().required(),
  difficulty: Joi.number().integer().min(1).max(5).default(1),
  pages: Joi.number().integer().min(1).default(1)
});

const updateBookSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  author: Joi.string().min(1).max(100).optional(),
  isbn: Joi.string().optional(),
  cover: Joi.string().uri().optional(),
  description: Joi.string().max(1000).optional(),
  ageGroup: Joi.string().optional(),
  difficulty: Joi.number().integer().min(1).max(5).optional(),
  pages: Joi.number().integer().min(1).optional()
});

export class BookController {
  async createBook(req: Request, res: Response) {
    try {
      const { error, value } = createBookSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const book = await bookService.createBook(value);

      res.status(201).json({
        message: '绘本创建成功',
        book
      });
    } catch (error) {
      console.error('Create book error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getAllBooks(req: Request, res: Response) {
    try {
      const {
        ageGroup,
        difficulty,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const filters = {
        ageGroup: ageGroup as string,
        difficulty: difficulty ? Number(difficulty) : undefined,
        search: search as string,
        limit: Number(limit),
        offset
      };

      const result = await bookService.getAllBooks(filters);

      res.json({
        books: result.books,
        pagination: {
          current: Number(page),
          total: Math.ceil(result.total / Number(limit)),
          count: result.total,
          limit: Number(limit)
        }
      });
    } catch (error) {
      console.error('Get books error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getBookById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const book = await bookService.getBookById(Number(id));

      if (!book) {
        return res.status(404).json({ error: '绘本不存在' });
      }

      res.json({ book });
    } catch (error) {
      console.error('Get book error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async updateBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error, value } = updateBookSchema.validate(req.body);

      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const book = await bookService.updateBook(Number(id), value);

      if (!book) {
        return res.status(404).json({ error: '绘本不存在' });
      }

      res.json({
        message: '绘本更新成功',
        book
      });
    } catch (error) {
      console.error('Update book error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async deleteBook(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const success = await bookService.deleteBook(Number(id));

      if (!success) {
        return res.status(404).json({ error: '绘本不存在' });
      }

      res.json({ message: '绘本删除成功' });
    } catch (error) {
      console.error('Delete book error:', error);
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getPopularBooks(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;
      const books = await bookService.getPopularBooks(Number(limit));

      res.json({ books });
    } catch (error) {
      console.error('Get popular books error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getRecommendedBooks(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { limit = 5 } = req.query;

      const books = await bookService.getRecommendedBooks(user.id, Number(limit));

      res.json({ books });
    } catch (error) {
      console.error('Get recommended books error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async searchBooks(req: Request, res: Response) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: '请提供搜索关键词' });
      }

      const books = await bookService.searchBooks(q, Number(limit));

      res.json({ books });
    } catch (error) {
      console.error('Search books error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getBooksByAgeGroup(req: Request, res: Response) {
    try {
      const { ageGroup } = req.params;
      const books = await bookService.getBooksByAgeGroup(ageGroup);

      res.json({ books });
    } catch (error) {
      console.error('Get books by age group error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getBookStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const book = await bookService.getBookById(Number(id));
      if (!book) {
        return res.status(404).json({ error: '绘本不存在' });
      }
      const stats = await bookService.getBookStats(Number(id));
      res.json({ stats });
    } catch (error) {
      console.error('Get book stats error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}
