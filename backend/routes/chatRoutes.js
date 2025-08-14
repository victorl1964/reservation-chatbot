const express = require('express');
const router = express.Router();
const {
  handleBookingIntent,
  handleConfirmationIntent,
} = require('../controllers/handleRequestsController');

router.post('/reservations/create', handleBookingIntent);
router.post('/reservations/confirm', handleConfirmationIntent);

module.exports = router;
