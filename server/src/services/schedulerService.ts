import { NotificationService } from './notificationService';
import { GameService } from './gameService';

export class SchedulerService {
  private notificationService: NotificationService;
  private gameService: GameService;
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    this.notificationService = new NotificationService();
    this.gameService = new GameService();
  }

  // 启动所有定时任务
  start(): void {
    this.startDailyReminders();
    this.startParentReminders();
    this.startNotificationCleanup();
    console.log('📅 定时任务已启动');
  }

  // 停止所有定时任务
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('📅 定时任务已停止');
  }

  // 每日阅读提醒 - 每天晚上8点执行
  private startDailyReminders(): void {
    const runDailyReminders = async () => {
      try {
        const now = new Date();
        const hour = now.getHours();

        // 晚上8点执行
        if (hour === 20) {
          console.log('🔔 执行每日阅读提醒检查...');
          await this.notificationService.checkAndSendReadingReminders();
          console.log('✅ 每日阅读提醒检查完成');
        }
      } catch (error) {
        console.error('❌ 每日阅读提醒执行失败:', error);
      }
    };

    // 每小时检查一次
    const interval = setInterval(runDailyReminders, 60 * 60 * 1000);
    this.intervals.push(interval);

    // 立即执行一次检查
    runDailyReminders();
  }

  // 家长提醒 - 每天上午9点执行
  private startParentReminders(): void {
    const runParentReminders = async () => {
      try {
        const now = new Date();
        const hour = now.getHours();

        // 上午9点执行
        if (hour === 9) {
          console.log('👨‍👩‍👧‍👦 执行家长提醒检查...');
          await this.notificationService.checkAndSendParentReminders();
          console.log('✅ 家长提醒检查完成');
        }
      } catch (error) {
        console.error('❌ 家长提醒执行失败:', error);
      }
    };

    // 每小时检查一次
    const interval = setInterval(runParentReminders, 60 * 60 * 1000);
    this.intervals.push(interval);
  }

  // 通知清理 - 每天凌晨2点执行
  private startNotificationCleanup(): void {
    const runCleanup = async () => {
      try {
        const now = new Date();
        const hour = now.getHours();

        // 凌晨2点执行
        if (hour === 2) {
          console.log('🧹 执行通知清理...');
          const deletedCount = await this.notificationService.cleanupOldNotifications(30);
          console.log(`✅ 通知清理完成，删除了 ${deletedCount} 条旧通知`);
        }
      } catch (error) {
        console.error('❌ 通知清理执行失败:', error);
      }
    };

    // 每小时检查一次
    const interval = setInterval(runCleanup, 60 * 60 * 1000);
    this.intervals.push(interval);
  }

  // 手动触发每日提醒（用于测试）
  async triggerDailyReminders(): Promise<void> {
    console.log('🔔 手动触发每日阅读提醒...');
    await this.notificationService.checkAndSendReadingReminders();
    console.log('✅ 手动触发完成');
  }

  // 手动触发家长提醒（用于测试）
  async triggerParentReminders(): Promise<void> {
    console.log('👨‍👩‍👧‍👦 手动触发家长提醒...');
    await this.notificationService.checkAndSendParentReminders();
    console.log('✅ 手动触发完成');
  }

  // 手动触发通知清理（用于测试）
  async triggerNotificationCleanup(): Promise<void> {
    console.log('🧹 手动触发通知清理...');
    const deletedCount = await this.notificationService.cleanupOldNotifications(30);
    console.log(`✅ 清理完成，删除了 ${deletedCount} 条旧通知`);
  }

  // 获取定时任务状态
  getStatus(): { active: boolean; taskCount: number } {
    return {
      active: this.intervals.length > 0,
      taskCount: this.intervals.length
    };
  }
}