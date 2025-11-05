import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { User } from '../types';

export class UserService {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const result = await db.run(
      `INSERT INTO users (username, password, email, role, displayName, avatar)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userData.username, hashedPassword, userData.email, userData.role, userData.displayName, userData.avatar]
    );

    await db.run(
      `INSERT INTO user_stats (userId) VALUES (?)`,
      [result.lastID]
    );

    const user = await this.getUserById(result.lastID);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['displayName', 'email', 'avatar'];
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    await db.run(
      `UPDATE users SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.getUserById(id);
  }

  async changePassword(id: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await db.get('SELECT password FROM users WHERE id = ?', [id]);

    if (!user || !await bcrypt.compare(oldPassword, user.password)) {
      return false;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.run(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, id]
    );

    return true;
  }

  generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      'secret_key_for_development',
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, 'secret_key_for_development');
    } catch (error) {
      return null;
    }
  }

  async getChildrenByParent(parentId: number): Promise<User[]> {
    return db.all(
      `SELECT u.id, u.username, u.email, u.displayName, u.avatar, u.createdAt
       FROM users u
       JOIN user_relationships ur ON u.id = ur.childId
       WHERE ur.parentId = ? AND u.role = 'child'`,
      [parentId]
    );
  }
}