import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

const userService = new UserService();

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  const decoded = userService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: '无效的访问令牌' });
  }

  const user = await userService.getUserById(decoded.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  (req as any).user = user;
  next();
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};

export const authorizeChildAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const targetUserId = parseInt(req.params.userId || req.body.userId);

  if (user.role === 'child' && user.id !== targetUserId) {
    return res.status(403).json({ error: '只能访问自己的数据' });
  }

  if (user.role === 'parent') {
    const children = await userService.getChildrenByParent(user.id);
    const hasAccess = children.some(child => child.id === targetUserId) || user.id === targetUserId;

    if (!hasAccess) {
      return res.status(403).json({ error: '只能访问自己或孩子的数据' });
    }
  }

  next();
};