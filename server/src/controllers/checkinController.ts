import { Request, Response } from 'express';
import { CheckInService } from '../services/checkinService';
import Joi from 'joi';

const checkinService = new CheckInService();

const createCheckInSchema = Joi.object({
  bookId: Joi.number().integer().positive().required(),
  readingTime: Joi.number().integer().min(0).default(0),
  notes: Joi.string().max(500).optional(),
  images: Joi.string().optional()
});

const updateCheckInSchema = Joi.object({
  readingTime: Joi.number().integer().min(0).optional(),
  notes: Joi.string().max(500).optional(),
  images: Joi.string().optional(),
  parentComment: Joi.string().max(200).optional(),
  teacherComment: Joi.string().max(200).optional()
});

export class CheckInController {
  async createCheckIn(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { error, value } = createCheckInSchema.validate(req.body);

      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const checkInData = {
        ...value,
        userId: user.id
      };

      const checkIn = await checkinService.createCheckIn(checkInData);

      res.status(201).json({
        message: '打卡成功',
        checkIn
      });
    } catch (error) {
      console.error('Create checkin error:', error);
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getUserCheckIns(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const options = {
        startDate: startDate as string,
        endDate: endDate as string,
        limit: Number(limit),
        offset
      };

      const result = await checkinService.getUserCheckIns(user.id, options);

      res.json({
        checkins: result.checkins,
        pagination: {
          current: Number(page),
          total: Math.ceil(result.total / Number(limit)),
          count: result.total,
          limit: Number(limit)
        }
      });
    } catch (error) {
      console.error('Get user checkins error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getTodayCheckIn(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const checkins = await checkinService.getTodayCheckIn(user.id);

      res.json({ checkins });
    } catch (error) {
      console.error('Get today checkin error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getCheckInStreak(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const streak = await checkinService.getCheckInStreak(user.id);

      res.json({ streak });
    } catch (error) {
      console.error('Get checkin streak error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async updateCheckIn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error, value } = updateCheckInSchema.validate(req.body);

      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const checkIn = await checkinService.updateCheckIn(Number(id), value);

      if (!checkIn) {
        return res.status(404).json({ error: '打卡记录不存在' });
      }

      res.json({
        message: '打卡记录更新成功',
        checkIn
      });
    } catch (error) {
      console.error('Update checkin error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async deleteCheckIn(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const success = await checkinService.deleteCheckIn(Number(id), user.id);

      if (!success) {
        return res.status(404).json({ error: '打卡记录不存在或无权限删除' });
      }

      res.json({ message: '打卡记录删除成功' });
    } catch (error) {
      console.error('Delete checkin error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getReadingCalendar(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { year, month } = req.params;

      const calendar = await checkinService.getReadingCalendar(
        user.id,
        Number(year),
        Number(month)
      );

      res.json({ calendar });
    } catch (error) {
      console.error('Get reading calendar error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async addComment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { comment } = req.body;

      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ error: '评论内容不能为空' });
      }

      const updateData: any = {};

      if (user.role === 'parent') {
        updateData.parentComment = comment;
      } else if (user.role === 'teacher') {
        updateData.teacherComment = comment;
      } else {
        return res.status(403).json({ error: '只有家长或老师可以添加评论' });
      }

      const checkIn = await checkinService.updateCheckIn(Number(id), updateData);

      if (!checkIn) {
        return res.status(404).json({ error: '打卡记录不存在' });
      }

      res.json({
        message: '评论添加成功',
        checkIn
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}