import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { initializeDatabase } from './scripts/initDatabase';
import { SchedulerService } from './services/schedulerService';

import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import checkinRoutes from './routes/checkins';
import gameRoutes from './routes/game';
import analyticsRoutes from './routes/analytics';
import userManagementRoutes from './routes/userManagement';
import notificationRoutes from './routes/notifications';
import systemConfigRoutes from './routes/systemConfig';

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: '请求过于频繁，请稍后再试'
});

app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', systemConfigRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '悦读之旅打卡系统运行正常' });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

const startServer = async () => {
  try {
    await initializeDatabase();

    // 启动定时任务
    const scheduler = new SchedulerService();
    scheduler.start();

    app.listen(PORT, () => {
      console.log(`🚀 悦读之旅打卡系统启动成功！`);
      console.log(`📍 服务器地址: http://localhost:${PORT}`);
      console.log(`📖 API文档: http://localhost:${PORT}/api/health`);
    });

    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.log('🛑 收到关闭信号，正在优雅关闭...');
      scheduler.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('🛑 收到中断信号，正在优雅关闭...');
      scheduler.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();