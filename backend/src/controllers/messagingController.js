const pool = require('../config/db');

// GET /api/conversations
// Lists all conversations the current user is part of, with last message preview.
async function listConversations(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.*, p.name AS project_name,
              (SELECT message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       LEFT JOIN projects p ON p.id = c.project_id
       WHERE cp.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
}

// GET /api/conversations/group/:projectId
// Gets (or creates) the group conversation for a project, and makes sure the
// current user is a participant. Admin, assigned Supervisors, and assigned
// Employees (via their user account) can all reach this for their project.
async function getOrCreateGroupConversation(req, res) {
  const { projectId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let convResult = await client.query(
      "SELECT * FROM conversations WHERE type = 'group' AND project_id = $1",
      [projectId]
    );

    let conversation;
    if (convResult.rows.length === 0) {
      const created = await client.query(
        "INSERT INTO conversations (type, project_id) VALUES ('group', $1) RETURNING *",
        [projectId]
      );
      conversation = created.rows[0];
    } else {
      conversation = convResult.rows[0];
    }

    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [conversation.id, req.user.id]
    );

    await client.query('COMMIT');
    res.json(conversation);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Get/create group conversation error:', err);
    res.status(500).json({ error: 'Server error accessing group conversation' });
  } finally {
    client.release();
  }
}

// POST /api/conversations/direct  body: { other_user_id }
// Gets (or creates) a 1-to-1 conversation between the current user and another user.
async function getOrCreateDirectConversation(req, res) {
  const { other_user_id } = req.body;

  if (!other_user_id) {
    return res.status(400).json({ error: 'other_user_id is required' });
  }
  if (parseInt(other_user_id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Cannot start a conversation with yourself' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Look for an existing direct conversation between exactly these two users
    const existing = await client.query(
      `SELECT c.* FROM conversations c
       WHERE c.type = 'direct'
       AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = $1)
       AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = $2)
       AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2`,
      [req.user.id, other_user_id]
    );

    let conversation;
    if (existing.rows.length > 0) {
      conversation = existing.rows[0];
    } else {
      const created = await client.query(
        "INSERT INTO conversations (type) VALUES ('direct') RETURNING *"
      );
      conversation = created.rows[0];

      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversation.id, req.user.id, other_user_id]
      );
    }

    await client.query('COMMIT');
    res.json(conversation);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Get/create direct conversation error:', err);
    res.status(500).json({ error: 'Server error accessing direct conversation' });
  } finally {
    client.release();
  }
}

// Helper: check the current user is a participant of this conversation
async function isParticipant(conversationId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/conversations/:id/messages
async function listMessages(req, res) {
  const { id } = req.params;

  try {
    const allowed = await isParticipant(id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const result = await pool.query(
      `SELECT m.*, u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List messages error:', err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
}

// POST /api/conversations/:id/messages
// Supports text and/or an optional image (via multer - req.file)
async function sendMessage(req, res) {
  const { id } = req.params;
  const { message_text } = req.body;

  if (!message_text && !req.file) {
    return res.status(400).json({ error: 'message_text or an image is required' });
  }

  try {
    const allowed = await isParticipant(id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    const imagePath = req.file ? `/uploads/chat/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message_text, image_path)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, message_text || null, imagePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error sending message' });
  }
}

module.exports = {
  listConversations, getOrCreateGroupConversation, getOrCreateDirectConversation,
  listMessages, sendMessage,
};

