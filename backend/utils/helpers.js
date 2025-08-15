/**
 * Validate reservation data.
 * @param {Object} data - Reservation fields.
 * @returns {Array} - Array of errors (empty if valid).
 */
const validateReservation = (data) => {
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (new Date(data.date) < today) {
    errors.push('Date cannot be in the past.');
  }
  if (data.guests <= 0) {
    errors.push('Number of guests must be positive.');
  }
  // Add more validations (e.g., time format, contact regex).

  return errors;
};

// Return system prompt to initialize LLM with clear an concise guidelines
const getSystemPrompt = () => {
  return `You are a restaurant booking assistant.
  Collect: date (YYYY-MM-DD), time (HH:MM), guests (number), name, and contact (phone/email). 
  Ask for one piece at a time.
  Verify that the date is not in the past, so if you receive a date like that, correct the user
  in a nice way.
  The service will be available from 19:00 to 21:59, so any time out of that range, please notify
  the user politely.
  Do not invent values for any piece of information. If you don't understand the values provided
  by the user for date or time, keep asking for them.
  
  Do the same with the contact information. It should be a valid email or a valid 10-digits phone number.
  Do not engage in conversation outside this domain.`;
};

// return LLM array of functions
const getLLMTools = () => {
  return [
    {
      type: 'function',
      function: {
        name: 'save_reservation',
        description: 'Save restaurant reservation details.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            time: {
              type: 'string',
              description: 'HH:MM in 24-hour format',
            },
            guests: { type: 'number', description: 'Number of guests' },
            name: { type: 'string', description: 'Customer full name' },
            contact: { type: 'string', description: 'Email or phone' },
          },
          required: ['date', 'time', 'guests', 'name', 'contact'],
        },
      },
    },
  ];
};

//Check if a user response is affirmative
const wasConfirmed = (userResponse) => {
  const confirmationWords = [
    'yeah',
    'yes',
    'agreed',
    'ok',
    'alright',
    'yep',
    'confirm',
    'booked',
    'i agree',
    'okay',
    'sure',
    'everything ok',
    'proceed',
    'confirmed',
  ];
  return confirmationWords.includes(userResponse.toLowerCase().trim());
};

//check if a user response is negative
const wasCancelled = (userResponse) => {
  const negativeWords = [
    'no',
    'cancel',
    'nothing',
    'none',
    'nevermind',
    'not coming',
    'cancelled',
    'pleas cancel',
    'nope',
    'sorry',
  ];
  return negativeWords.includes(userResponse.toLowerCase().trim());
};

module.exports = {
  validateReservation,
  getSystemPrompt,
  getLLMTools,
  wasConfirmed,
  wasCancelled,
};
