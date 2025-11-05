import { db } from '../database';
import { User } from '../types';

export class UserManagementService {
  // 获取所有用户（管理员功能）
  async getAllUsers(page: number = 1, limit: number = 20, filters?: {
    role?: string;
    search?: string;
  }): Promise<{ users: User[], total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.role) {
      whereClause += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.search) {
      whereClause += ' AND (username LIKE ? OR displayName LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const offset = (page - 1) * limit;

    const [users, totalResult] = await Promise.all([
      db.all(
        `SELECT id, username, email, role, displayName, avatar, createdAt, updatedAt
         FROM users ${whereClause}
         ORDER BY createdAt DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.get(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)
    ]);

    return {
      users,
      total: totalResult.count
    };
  }

  // 建立用户关系（家长-孩子或老师-学生）
  async createUserRelationship(parentId: number, childId: number, type: 'parent-child' | 'teacher-student' = 'parent-child'): Promise<boolean> {
    try {
      await db.run(
        'INSERT INTO user_relationships (parentId, childId, relationshipType) VALUES (?, ?, ?)',
        [parentId, childId, type]
      );
      return true;
    } catch (error) {
      console.error('Create relationship error:', error);
      return false;
    }
  }

  // 删除用户关系
  async removeUserRelationship(parentId: number, childId: number): Promise<boolean> {
    try {
      const result = await db.run(
        'DELETE FROM user_relationships WHERE parentId = ? AND childId = ?',
        [parentId, childId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Remove relationship error:', error);
      return false;
    }
  }

  // 获取用户的孩子列表
  async getChildrenByParent(parentId: number): Promise<User[]> {
    return db.all(
      `SELECT u.id, u.username, u.email, u.displayName, u.avatar, u.createdAt,
              us.totalBooks, us.totalReadingTime, us.consecutiveDays, us.totalPoints, us.level
       FROM users u
       JOIN user_relationships ur ON u.id = ur.childId
       LEFT JOIN user_stats us ON u.id = us.userId
       WHERE ur.parentId = ? AND u.role = 'child'
       ORDER BY u.displayName`,
      [parentId]
    );
  }

  // 获取用户的学生列表（老师）
  async getStudentsByTeacher(teacherId: number): Promise<User[]> {
    return db.all(
      `SELECT u.id, u.username, u.email, u.displayName, u.avatar, u.createdAt,
              us.totalBooks, us.totalReadingTime, us.consecutiveDays, us.totalPoints, us.level
       FROM users u
       JOIN user_relationships ur ON u.id = ur.childId
       LEFT JOIN user_stats us ON u.id = us.userId
       WHERE ur.parentId = ? AND ur.relationshipType = 'teacher-student' AND u.role = 'child'
       ORDER BY u.displayName`,
      [teacherId]
    );
  }

  // 获取用户的监护人列表
  async getParentsByChild(childId: number): Promise<User[]> {
    return db.all(
      `SELECT u.id, u.username, u.email, u.displayName, u.avatar, u.role, ur.relationshipType
       FROM users u
       JOIN user_relationships ur ON u.id = ur.parentId
       WHERE ur.childId = ?
       ORDER BY ur.relationshipType, u.displayName`,
      [childId]
    );
  }

  // 软删除用户（保留数据但标记为删除）
  async softDeleteUser(userId: number): Promise<boolean> {
    try {
      // 添加deleted字段到users表的逻辑需要先修改表结构
      // 这里先简单地更新用户状态
      await db.run(
        'UPDATE users SET username = CONCAT(username, "_deleted_", id), email = CONCAT(email, "_deleted_", id), updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Soft delete user error:', error);
      return false;
    }
  }

  // 获取用户统计信息
  async getUserStats(userId: number): Promise<any> {
    const stats = await db.get(
      `SELECT us.*,
              (SELECT COUNT(*) FROM checkins WHERE userId = ?) as totalCheckins,
              (SELECT COUNT(*) FROM user_badges WHERE userId = ?) as badgeCount
       FROM user_stats us
       WHERE us.userId = ?`,
      [userId, userId, userId]
    );

    return stats;
  }

  // 批量操作：为多个孩子分配同一个家长
  async assignParentToChildren(parentId: number, childIds: number[]): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;

    for (const childId of childIds) {
      try {
        await this.createUserRelationship(parentId, childId, 'parent-child');
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }

  // 获取用户活动概览
  async getUserActivity(userId: number, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [checkins, badges, points] = await Promise.all([
      db.all(
        'SELECT DATE(checkinDate) as date, COUNT(*) as count FROM checkins WHERE userId = ? AND checkinDate >= ? GROUP BY DATE(checkinDate) ORDER BY date DESC',
        [userId, startDate.toISOString().split('T')[0]]
      ),
      db.all(
        'SELECT b.name, b.icon, ub.earnedAt FROM user_badges ub JOIN badges b ON ub.badgeId = b.id WHERE ub.userId = ? AND ub.earnedAt >= ? ORDER BY ub.earnedAt DESC',
        [userId, startDate.toISOString()]
      ),
      db.get(
        'SELECT SUM(points) as totalPoints FROM points WHERE userId = ? AND createdAt >= ?',
        [userId, startDate.toISOString()]
      )
    ]);

    return {
      recentCheckins: checkins,
      recentBadges: badges,
      pointsEarned: points?.totalPoints || 0
    };
  }

  // 搜索用户
  async searchUsers(query: string, excludeIds: number[] = [], role?: string): Promise<User[]> {
    let whereClause = 'WHERE (username LIKE ? OR displayName LIKE ? OR email LIKE ?)';
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (excludeIds.length > 0) {
      whereClause += ` AND id NOT IN (${excludeIds.map(() => '?').join(',')})`;
      params.push(...excludeIds);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    return db.all(
      `SELECT id, username, email, role, displayName, avatar
       FROM users ${whereClause}
       ORDER BY displayName
       LIMIT 20`,
      params
    );
  }
}