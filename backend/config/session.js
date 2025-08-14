//will keep track sessions for multiple users ...
const sessions = new Map();
const { getSystemPrompt } = require('../utils/helpers');
const generateSessionId = () =>
  `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// There is no session object for sessionId received? create a new one, return
// Otherwise, return the session object found
const getSession = (sessionId) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [
        {
          role: 'system',
          //content: 'You are a restaurant booking assistant. Collect: date (YYYY-MM-DD), time (HH:MM), guests (number), name, and contact (phone/email). Ask for one piece at a time.',
          content: getSystemPrompt(),
        },
      ],
      collectedData: {},
    });
  }
  return sessions.get(sessionId);
};

const clearSession = (sessionId) => sessions.delete(sessionId);

module.exports = { generateSessionId, getSession, clearSession };
