import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('user'), // 'admin', 'user'
  status: text('status').default('active'), // 'active', 'pending', 'banned'
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  notifyOnReply: integer('notify_on_reply').default(1),
  notifyOnComment: integer('notify_on_comment').default(1),
  notifyOnMention: integer('notify_on_mention').default(1),
  showScrollButtons: integer('show_scroll_buttons').default(0),
  nickname: text('nickname').unique(),
  qq: text('qq'),
  email: text('email'),
  phone: text('phone'),
  downloadPreference: text('download_preference').default('default'),
  reason: text('reason'),
  registrationIp: text('registration_ip'),
  points: integer('points').default(0),
  lastCheckinDate: text('last_checkin_date')
});

// Settings Table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
});

// Invites Table
export const invites = sqliteTable('invites', {
  code: text('code').primaryKey(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  maxUses: integer('max_uses').default(1),
  usedCount: integer('used_count').default(0),
  expiresAt: integer('expires_at')
});

// Notifications Table
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('system'), // 'system', 'approval', 'account'
  isRead: integer('is_read').default(0),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  link: text('link')
});

// Forum Topics Table
export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
  views: integer('views').default(0),
  isPinned: integer('is_pinned').default(0),
  isFeatured: integer('is_featured').default(0),
  viewPermissionLevel: integer('view_permission_level').default(0),
  viewPointsRequired: integer('view_points_required').default(0),
  bountyPoints: integer('bounty_points').default(0),
  isSolved: integer('is_solved').default(0),
  solvedCommentId: integer('solved_comment_id')
});

// Forum Comments Table
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  parentId: integer('parent_id') // Self-reference defined below or handled in query
});

// Chat Messages Table
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  room: text('room').default('general')
});

// Files Table
export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cid: text('cid').notNull(),
  filename: text('filename').notNull(),
  mimetype: text('mimetype'),
  size: integer('size'),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
  userId: integer('user_id').references(() => users.id),
  isPublic: integer('is_public').default(1),
  tags: text('tags')
});

// User Points History Table
export const userPointsHistory = sqliteTable('user_points_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  relatedId: integer('related_id'),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`)
});

// Topic Purchases Table
export const topicPurchases = sqliteTable('topic_purchases', {
  userId: integer('user_id').notNull().references(() => users.id),
  topicId: integer('topic_id').notNull().references(() => topics.id),
  amount: integer('amount').notNull(),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`)
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.topicId] })
  };
});
