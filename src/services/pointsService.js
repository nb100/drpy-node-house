import db from '../db.js';

const RANKS = [
  { level: 0, title: '倔强青铜', threshold: 0 },
  { level: 1, title: '秩序白银', threshold: 100 },
  { level: 2, title: '荣耀黄金', threshold: 500 },
  { level: 3, title: '尊贵铂金', threshold: 2000 },
  { level: 4, title: '永恒钻石', threshold: 5000 },
  { level: 5, title: '至尊星耀', threshold: 10000 },
  { level: 6, title: '最强王者', threshold: 20000 },
  { level: 7, title: '荣耀王者', threshold: 50000 }
];

export const getRank = (points) => {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (points >= rank.threshold) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
};

export const addPoints = (userId, amount, reason, relatedId = null) => {
  if (amount <= 0) return false;
  
  const stmt = db.prepare('UPDATE users SET points = points + ? WHERE id = ?');
  const result = stmt.run(amount, userId);
  
  if (result.changes > 0) {
    db.run(
      'INSERT INTO user_points_history (user_id, amount, reason, related_id) VALUES (?, ?, ?, ?)',
      userId, amount, reason, relatedId
    );
    return true;
  }
  return false;
};

export const deductPoints = (userId, amount, reason, relatedId = null) => {
  if (amount <= 0) return false;
  
  // Check balance first
  const user = db.query('SELECT points FROM users WHERE id = ?').get(userId);
  if (!user || user.points < amount) return false;

  const stmt = db.prepare('UPDATE users SET points = points - ? WHERE id = ?');
  const result = stmt.run(amount, userId);
  
  if (result.changes > 0) {
    db.run(
      'INSERT INTO user_points_history (user_id, amount, reason, related_id) VALUES (?, ?, ?, ?)',
      userId, -amount, reason, relatedId
    );
    return true;
  }
  return false;
};

export const checkin = (userId) => {
  const today = new Date().toISOString().split('T')[0];
  
  const user = db.query('SELECT last_checkin_date FROM users WHERE id = ?').get(userId);
  if (user && user.last_checkin_date === today) {
    return { success: false, message: 'already_checked_in' };
  }

  const stmt = db.prepare('UPDATE users SET points = points + 10, last_checkin_date = ? WHERE id = ?');
  const result = stmt.run(today, userId);
  
  if (result.changes > 0) {
    db.run(
      'INSERT INTO user_points_history (user_id, amount, reason, related_id) VALUES (?, ?, ?, ?)',
      userId, 10, 'checkin', null
    );
    return { success: true, points: 10 };
  }
  
  return { success: false, message: 'checkin_failed' };
};

export const getPointsHistory = (userId, limit = 20, offset = 0) => {
  return db.query(
    'SELECT * FROM user_points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);
};

export const getUserPointsAndRank = (userId) => {
  const user = db.query('SELECT points, last_checkin_date FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  
  const rank = getRank(user.points || 0);
  const today = new Date().toISOString().split('T')[0];
  const isCheckedIn = user.last_checkin_date === today;
  
  return {
    points: user.points || 0,
    rankLevel: rank.level,
    rankTitle: rank.title,
    isCheckedIn
  };
};

export default {
  addPoints,
  deductPoints,
  checkin,
  getPointsHistory,
  getRank,
  getUserPointsAndRank
};
