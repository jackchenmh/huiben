# 悦读之旅打卡系统

一个专为儿童设计的游戏化阅读打卡系统，通过积分、徽章、排行榜等机制激励孩子养成阅读习惯。

## 功能特点

### 核心功能
- **用户管理**: 支持儿童、家长、老师三种角色
- **绘本管理**: 丰富的绘本库，支持按年龄段和难度分类
- **打卡系统**: 每日阅读打卡，记录阅读时间和心得
- **游戏化激励**: 积分系统、徽章收集、排行榜竞争
- **数据可视化**: 阅读进度、统计图表、成长轨迹

### 特色功能
- **连续打卡奖励**: 连续阅读获得额外积分
- **等级系统**: 根据阅读量自动提升等级
- **家园共育**: 家长和老师可以查看和评论孩子的阅读记录
- **个性化推荐**: 根据阅读历史推荐适合的绘本
- **阅读日历**: 可视化展示每月阅读情况

## 技术栈

### 后端
- **框架**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **认证**: JWT
- **安全**: Helmet, CORS, Rate Limiting

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Context API
- **路由**: React Router
- **图标**: Lucide React
- **表单**: React Hook Form
- **通知**: React Hot Toast

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
```bash
# 安装项目依赖
npm install

# 安装前端依赖
cd src/client
npm install
cd ../..
```

### 环境配置
1. 复制环境配置文件：
```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置项：
```env
NODE_ENV=development
PORT=3001
DB_PATH=./data/reading_journey.db
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
CLIENT_URL=http://localhost:3000
```

### 初始化数据库
```bash
npm run init-db
```

### 启动开发服务器
```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run server:dev  # 后端服务器 (端口 3001)
npm run client:dev  # 前端服务器 (端口 3000)
```

### 构建生产版本
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `POST /api/auth/change-password` - 修改密码

### 绘本接口
- `GET /api/books` - 获取绘本列表
- `GET /api/books/:id` - 获取绘本详情
- `GET /api/books/popular` - 获取热门绘本
- `GET /api/books/recommended` - 获取推荐绘本
- `POST /api/books` - 创建绘本（仅老师）
- `PUT /api/books/:id` - 更新绘本（仅老师）
- `DELETE /api/books/:id` - 删除绘本（仅老师）

### 打卡接口
- `GET /api/checkins` - 获取打卡记录
- `POST /api/checkins` - 创建打卡记录
- `GET /api/checkins/today` - 获取今日打卡
- `GET /api/checkins/streak` - 获取连续打卡天数
- `POST /api/checkins/:id/comment` - 添加评论（家长/老师）

### 游戏化接口
- `GET /api/game/stats` - 获取用户统计
- `GET /api/game/badges` - 获取用户徽章
- `GET /api/game/leaderboard` - 获取排行榜
- `GET /api/game/dashboard` - 获取游戏仪表盘

### 数据分析接口
- `GET /api/analytics/dashboard` - 获取分析仪表盘
- `GET /api/analytics/trends` - 获取阅读趋势
- `GET /api/analytics/heatmap` - 获取阅读热力图

## 项目结构

```
reading-journey-checkin/
├── src/
│   ├── server/              # 后端代码
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由配置
│   │   ├── middleware/      # 中间件
│   │   ├── database/        # 数据库配置
│   │   ├── types/          # 类型定义
│   │   └── scripts/        # 工具脚本
│   └── client/             # 前端代码
│       ├── src/
│       │   ├── components/ # React 组件
│       │   ├── pages/      # 页面组件
│       │   ├── contexts/   # React Context
│       │   ├── lib/        # 工具函数
│       │   └── types/      # 类型定义
│       └── public/         # 静态资源
├── data/                   # 数据库文件
├── uploads/               # 上传文件
└── dist/                  # 构建输出
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目链接: [https://github.com/your-username/reading-journey-checkin](https://github.com/your-username/reading-journey-checkin)
- 邮箱: your-email@example.com

## 更新日志

### v1.0.0 (2024-11-04)
- 初始版本发布
- 基础用户管理功能
- 绘本库管理
- 打卡系统
- 游戏化激励机制
- 数据可视化看板# huiben
