import { Request, Response } from 'express';
import { UserManagementService } from '../services/userManagementService';
import { UserService } from '../services/userService';
import Joi from 'joi';

const userManagementService = new UserManagementService();
const userService = new UserService();

const relationshipSchema = Joi.object({
  childId: Joi.number().integer().positive().required(),
  relationshipType: Joi.string().valid('parent-child', 'teacher-student').optional()
});

const searchSchema = Joi.object({
  query: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('child', 'parent', 'teacher').optional()
});

export class UserManagementController {
  // 获取当前用户的孩子/学生列表
  async getMyChildren(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      let children: any[] = [];
      if (user.role === 'parent') {
        children = await userManagementService.getChildrenByParent(user.id);
      } else if (user.role === 'teacher') {
        children = await userManagementService.getStudentsByTeacher(user.id);
      } else {
        return res.status(403).json({ error: '只有家长和老师可以查看关联的孩子' });
      }

      res.json({ children });
    } catch (error) {
      console.error('Get children error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取当前用户的监护人列表（孩子查看自己的家长/老师）
  async getMyParents(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (user.role !== 'child') {
        return res.status(403).json({ error: '只有孩子用户可以查看监护人' });
      }

      const parents = await userManagementService.getParentsByChild(user.id);
      res.json({ parents });
    } catch (error) {
      console.error('Get parents error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 添加孩子关系
  async addChild(req: Request, res: Response) {
    try {
      const { error, value } = relationshipSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;

      if (!['parent', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: '只有家长和老师可以添加孩子关系' });
      }

      // 检查要添加的用户是否存在且为孩子角色
      const child = await userService.getUserById(value.childId);
      if (!child) {
        return res.status(404).json({ error: '用户不存在' });
      }

      if (child.role !== 'child') {
        return res.status(400).json({ error: '只能添加角色为孩子的用户' });
      }

      const relationshipType = value.relationshipType || (user.role === 'parent' ? 'parent-child' : 'teacher-student');

      const success = await userManagementService.createUserRelationship(user.id, value.childId, relationshipType);

      if (!success) {
        return res.status(400).json({ error: '关系已存在或创建失败' });
      }

      res.json({ message: '孩子关系添加成功' });
    } catch (error) {
      console.error('Add child error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 移除孩子关系
  async removeChild(req: Request, res: Response) {
    try {
      const childId = parseInt(req.params.childId);
      const user = (req as any).user;

      if (!['parent', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: '只有家长和老师可以移除孩子关系' });
      }

      const success = await userManagementService.removeUserRelationship(user.id, childId);

      if (!success) {
        return res.status(404).json({ error: '关系不存在或移除失败' });
      }

      res.json({ message: '孩子关系移除成功' });
    } catch (error) {
      console.error('Remove child error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 搜索用户
  async searchUsers(req: Request, res: Response) {
    try {
      const { error, value } = searchSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;

      // 获取当前用户已关联的孩子ID列表，避免重复显示
      let excludeIds: number[] = [];
      if (user.role === 'parent') {
        const children = await userManagementService.getChildrenByParent(user.id);
        excludeIds = children.map(child => child.id);
      } else if (user.role === 'teacher') {
        const students = await userManagementService.getStudentsByTeacher(user.id);
        excludeIds = students.map(student => student.id);
      }

      // 添加当前用户自己到排除列表
      excludeIds.push(user.id);

      const users = await userManagementService.searchUsers(value.query, excludeIds, value.role);
      res.json({ users });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 获取用户详细统计信息（用于家长/老师查看孩子的详细信息）
  async getUserDetails(req: Request, res: Response) {
    try {
      const targetUserId = parseInt(req.params.userId);
      const user = (req as any).user;

      // 检查权限：只能查看自己关联的孩子或自己的信息
      if (targetUserId !== user.id) {
        if (user.role === 'child') {
          return res.status(403).json({ error: '孩子用户只能查看自己的信息' });
        }

        // 检查是否有关联关系
        let hasPermission = false;
        if (user.role === 'parent') {
          const children = await userManagementService.getChildrenByParent(user.id);
          hasPermission = children.some(child => child.id === targetUserId);
        } else if (user.role === 'teacher') {
          const students = await userManagementService.getStudentsByTeacher(user.id);
          hasPermission = students.some(student => student.id === targetUserId);
        }

        if (!hasPermission) {
          return res.status(403).json({ error: '无权查看该用户信息' });
        }
      }

      const [userInfo, stats, activity] = await Promise.all([
        userService.getUserById(targetUserId),
        userManagementService.getUserStats(targetUserId),
        userManagementService.getUserActivity(targetUserId)
      ]);

      if (!userInfo) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({
        user: userInfo,
        stats,
        activity
      });
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  // 批量添加孩子（老师功能，用于班级管理）
  async batchAddChildren(req: Request, res: Response) {
    try {
      const { childIds } = req.body;
      const user = (req as any).user;

      if (user.role !== 'teacher') {
        return res.status(403).json({ error: '只有老师可以批量添加学生' });
      }

      if (!Array.isArray(childIds) || childIds.length === 0) {
        return res.status(400).json({ error: '请提供有效的孩子ID列表' });
      }

      const result = await userManagementService.assignParentToChildren(user.id, childIds);

      res.json({
        message: `批量添加完成，成功：${result.success}，失败：${result.failed}`,
        result
      });
    } catch (error) {
      console.error('Batch add children error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}