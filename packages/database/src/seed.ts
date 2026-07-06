import { DatabaseAdapter } from '@campus-forum/core';
import bcrypt from 'bcryptjs';

export async function seedData(db: DatabaseAdapter): Promise<void> {
  // Check if already seeded
  const existing = db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (existing && existing.count > 0) return;

  // Create admin user (password: 123456)
  const hash = await bcrypt.hash('123456', 10);
  db.run(
    'INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)',
    'admin', hash, '管理员', 1
  );

  // Create default boards
  const boards = [
    ['树洞', '匿名倾诉，说出心里话', '🌳'],
    ['课程交流', '选课、作业、考试经验分享', '📚'],
    ['二手/失物', '闲置转让、丢失招领', '📦'],
    ['校园生活', '吃喝玩乐、社团活动', '🎉'],
    ['技术交流', '编程、设计、技术讨论', '💻'],
  ];

  const insertBoard = db.prepare<{ id: number }>(
    'INSERT INTO boards (name, description, icon, created_by) VALUES (?, ?, ?, 1)'
  );

  for (const [name, desc, icon] of boards) {
    insertBoard.run(name, desc, icon);
  }

  console.log('✅ Seed data inserted');
}
