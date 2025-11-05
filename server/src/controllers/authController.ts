import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import Joi from 'joi';

const userService = new UserService();

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('child', 'parent', 'teacher').required(),
  displayName: Joi.string().min(1).max(50).required(),
  avatar: Joi.string().uri().optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // 检查用户名是否已存在
      const existingUserByUsername = await userService.getUserByUsername(value.username);
      if (existingUserByUsername) {
        return res.status(409).json({ error: '用户名已存在' });
      }

      // TODO: 稍后添加邮箱检查
      // const existingUserByEmail = await userService.getUserByEmail(value.email);
      // if (existingUserByEmail) {
      //   return res.status(409).json({ error: '邮箱已存在' });
      // }

      const user = await userService.createUser(value);
      const token = userService.generateToken(user);

      res.status(201).json({
        message: '注册成功',
        user,
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = await userService.authenticateUser(value.username, value.password);
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = userService.generateToken(user);

      res.json({
        message: '登录成功',
        user,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const allowedUpdates = ['displayName', 'email', 'avatar'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      const updatedUser = await userService.updateUser(user.id, updates);

      res.json({
        message: '个人资料更新成功',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: '请提供旧密码和新密码' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: '新密码长度至少为6位' });
      }

      const success = await userService.changePassword(user.id, oldPassword, newPassword);
      if (!success) {
        return res.status(400).json({ error: '旧密码错误' });
      }

      res.json({ message: '密码修改成功' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
}