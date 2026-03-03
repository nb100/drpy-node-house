import db from '../db.js';

export default async function forumRoutes(fastify, options) {
    // Get all topics (with pagination and optional search)
    fastify.get('/topics', async (request, reply) => {
        const { page = 1, limit = 10, search = '', sort = 'newest', filter = 'all' } = request.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT t.*, u.username, u.nickname, u.role,
            (SELECT COUNT(*) FROM comments c WHERE c.topic_id = t.id) as comment_count
            FROM topics t
            JOIN users u ON t.user_id = u.id
        `;
        let countQuery = 'SELECT COUNT(*) as count FROM topics t JOIN users u ON t.user_id = u.id';
        const params = [];
        const whereClauses = [];

        if (search) {
            whereClauses.push('(t.title LIKE ? OR t.content LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (filter === 'featured') {
            whereClauses.push('t.is_featured = 1');
        }

        if (whereClauses.length > 0) {
            const whereClause = ' WHERE ' + whereClauses.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        // Sorting logic
        // Default: Pinned first, then by sort criteria
        let orderBy = ' ORDER BY t.is_pinned DESC';
        
        switch (sort) {
            case 'hottest': // Most views + comments? or just views? Let's use views for now, or a simple heuristic
                orderBy += ', t.views DESC, comment_count DESC';
                break;
            case 'replies':
                orderBy += ', comment_count DESC';
                break;
            case 'newest':
            default:
                orderBy += ', t.updated_at DESC';
                break;
        }
        
        query += orderBy + ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const topics = db.prepare(query).all(...params);
        // We need to run count query with ONLY search/filter params, not limit/offset
        // The params array currently has search params + limit + offset
        // We need to slice off the last 2 for the count query
        const countParams = params.slice(0, -2);
        const total = db.prepare(countQuery).get(...countParams).count;

        return {
            topics,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        };
    });

    // Get single topic
    fastify.get('/topics/:id', async (request, reply) => {
        const { id } = request.params;
        
        // Update views
        db.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').run(id);

        const topic = db.prepare(`
            SELECT t.*, u.username, u.nickname, u.role
            FROM topics t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `).get(id);

        if (!topic) {
            return reply.code(404).send({ error: 'Topic not found' });
        }

        const comments = db.prepare(`
            SELECT c.*, u.username, u.nickname, u.role
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.topic_id = ?
            ORDER BY c.created_at ASC
        `).all(id);

        return { topic, comments };
    });

    // Create topic (Auth required)
    fastify.post('/topics', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { title, content } = request.body;
        const user_id = request.user.id;

        if (!title || !content) {
            return reply.code(400).send({ error: 'Title and content are required' });
        }

        const stmt = db.prepare('INSERT INTO topics (title, content, user_id) VALUES (?, ?, ?)');
        const result = stmt.run(title, content, user_id);

        return { id: result.lastInsertRowid, message: 'Topic created successfully' };
    });

    // Add comment (Auth required)
    fastify.post('/topics/:id/comments', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { content } = request.body;
        const user_id = request.user.id;

        if (!content) {
            return reply.code(400).send({ error: 'Content is required' });
        }

        const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(id);
        if (!topic) {
            return reply.code(404).send({ error: 'Topic not found' });
        }

        const stmt = db.prepare('INSERT INTO comments (topic_id, user_id, content) VALUES (?, ?, ?)');
        stmt.run(id, user_id, content);
        
        // Update topic updated_at
        db.prepare('UPDATE topics SET updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(id);

        return { message: 'Comment added successfully' };
    });

    // Update topic (Auth required)
    fastify.put('/topics/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { title, content } = request.body;
        const user_id = request.user.id;
        const role = request.user.role;

        if (!title || !content) {
            return reply.code(400).send({ error: 'Title and content are required' });
        }

        const topic = db.prepare('SELECT user_id FROM topics WHERE id = ?').get(id);
        if (!topic) {
            return reply.code(404).send({ error: 'Topic not found' });
        }

        if (topic.user_id !== user_id && !['admin', 'super_admin'].includes(role)) {
            return reply.code(403).send({ error: 'Permission denied' });
        }

        db.prepare('UPDATE topics SET title = ?, content = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(title, content, id);

        return { message: 'Topic updated successfully' };
    });

    // Toggle Pin (Admin only)
    fastify.patch('/topics/:id/pin', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { is_pinned } = request.body; // boolean or 0/1
        const role = request.user.role;

        if (!['admin', 'super_admin'].includes(role)) {
            return reply.code(403).send({ error: 'Permission denied' });
        }

        db.prepare('UPDATE topics SET is_pinned = ? WHERE id = ?').run(is_pinned ? 1 : 0, id);

        return { message: 'Topic pin status updated' };
    });

    // Toggle Feature (Admin only)
    fastify.patch('/topics/:id/feature', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { is_featured } = request.body; // boolean or 0/1
        const role = request.user.role;

        if (!['admin', 'super_admin'].includes(role)) {
            return reply.code(403).send({ error: 'Permission denied' });
        }

        db.prepare('UPDATE topics SET is_featured = ? WHERE id = ?').run(is_featured ? 1 : 0, id);

        return { message: 'Topic feature status updated' };
    });

    // Delete topic (Admin or Owner)
    fastify.delete('/topics/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;

        const topic = db.prepare('SELECT user_id FROM topics WHERE id = ?').get(id);
        if (!topic) {
            return reply.code(404).send({ error: 'Topic not found' });
        }

        if (user.role !== 'admin' && user.role !== 'super_admin' && user.id !== topic.user_id) {
            return reply.code(403).send({ error: 'Permission denied' });
        }

        // Delete comments first (if no CASCADE) - but we added ON DELETE CASCADE in schema
        db.prepare('DELETE FROM topics WHERE id = ?').run(id);

        return { message: 'Topic deleted successfully' };
    });

    // Delete comment (Admin, Owner, or Topic Owner)
    fastify.delete('/comments/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;

        // Get comment and its topic_id to check topic owner
        const comment = db.prepare(`
            SELECT c.user_id, c.topic_id, t.user_id as topic_owner_id 
            FROM comments c
            JOIN topics t ON c.topic_id = t.id
            WHERE c.id = ?
        `).get(id);

        if (!comment) {
            return reply.code(404).send({ error: 'Comment not found' });
        }

        const isCommentOwner = user.id === comment.user_id;
        const isTopicOwner = user.id === comment.topic_owner_id;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';

        if (!isAdmin && !isCommentOwner && !isTopicOwner) {
            return reply.code(403).send({ error: 'Permission denied' });
        }

        db.prepare('DELETE FROM comments WHERE id = ?').run(id);

        return { message: 'Comment deleted successfully' };
    });
}
