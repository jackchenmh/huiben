import { db } from '../database';

export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing database...');
    await db.initialize();
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  initializeDatabase().then(() => {
    console.log('Database setup complete');
    process.exit(0);
  });
}