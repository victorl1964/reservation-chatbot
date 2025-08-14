const { handleChat, confirmReservation } = require('./reservationController');
const { generateSessionId } = require('../config/session');
const handleBookingIntent = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || generateSessionId();
    const result = await handleChat(sessionId, req.body.message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ reply: 'Server error', error: error.message });
  }
};

const handleConfirmationIntent = async (req, res) => {
  try {
    if (!req.body.sessionId) throw new Error('sessionId required');
    const result = await confirmReservation(
      req.body.sessionId,
      req.body.confirmation
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ reply: error.message });
  }
};

module.exports = { handleBookingIntent, handleConfirmationIntent };
