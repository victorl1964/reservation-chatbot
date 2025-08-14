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
  Do not invent values for any piece of information. If you don't understand the values provided
  by the user for date or time, keep asking for them.
  The service will be available from 19:00 to 21:59, so any time out of that range, please notify
  the user politely.
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

// Format Date to YYYY-MM-DD
const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

//Extract, if possible, a date from a given string
const parseDateFromStringToYYYYMMDD = (input) => {
  if (typeof input !== 'string' || !input.trim()) return null;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  // Validate if year/month/day form a real date
  const isValidDate = (year, month, day) => {
    const d = new Date(year, month - 1, day);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    );
  };

  // Month and day name mappings
  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  const words = input.toLowerCase().split(/\s+/);

  // ———————————————————————
  // Case 1: ISO date (YYYY-MM-DD)
  const isoMatch = input.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [_, yearStr, monthStr, dayStr] = isoMatch;
    const [year, month, day] = [yearStr, monthStr, dayStr].map(Number);
    return isValidDate(year, month, day)
      ? formatDate(new Date(year, month - 1, day))
      : null;
  }

  // ———————————————————————
  // Case 2: Relative keywords
  if (input.match(/\btomorrow\b/i)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(currentDate + 1);
    return formatDate(tomorrow);
  }

  if (input.match(/\btonight\b/i)) {
    return formatDate(today);
  }

  // "next <day>" or "next <month>"
  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'next' && i + 1 < words.length) {
      const nextWord = words[i + 1];

      // next Monday, Tuesday, etc.
      if (dayMap[nextWord] !== undefined) {
        const targetDay = dayMap[nextWord];
        const todayDay = today.getDay();
        const daysToAdd = (targetDay - todayDay + 7) % 7 || 7; // next occurrence
        const nextDate = new Date(today);
        nextDate.setDate(currentDate + daysToAdd);
        return formatDate(nextDate);
      }

      // next January, etc. (with day)
      if (monthMap[nextWord]) {
        const targetMonth = monthMap[nextWord];
        let year = currentYear;
        if (targetMonth <= today.getMonth() + 1) year += 1;

        // Look for a day number after "next January 5"
        let day = null;
        for (let j = i + 2; j < words.length; j++) {
          if (/^\d+$/.test(words[j])) {
            day = Number(words[j]);
            break;
          }
        }

        if (day !== null && isValidDate(year, targetMonth, day)) {
          return formatDate(new Date(year, targetMonth - 1, day));
        }
        return null;
      }
    }
  }

  // ———————————————————————
  // Case 3: Natural language: "May 2", "May 2 2025"
  let foundMonth = null;
  let foundDay = null;
  let foundYear = null;

  for (const word of words) {
    if (monthMap[word]) foundMonth = monthMap[word];
    if (/^\d{4}$/.test(word)) {
      const year = Number(word);
      if (year >= 1000 && year <= 3000) foundYear = year;
    }
    if (/^\d{1,2}$/.test(word)) {
      const day = Number(word);
      if (day >= 1 && day <= 31) foundDay = day;
    }
  }

  // If we have month and day, infer year
  if (foundMonth && foundDay) {
    const year = foundYear || currentYear;
    return isValidDate(year, foundMonth, foundDay)
      ? formatDate(new Date(year, foundMonth - 1, foundDay))
      : null;
  }

  // ———————————————————————
  // Not enough info
  if (foundYear && !foundMonth && !foundDay) return null; // e.g. "2025"
  if (foundMonth && !foundDay) return null; // e.g. "See you in May"
  if (foundDay && !foundMonth) return null; // e.g. "on the 5th" (no month)

  return null;
};

module.exports = {
  validateReservation,
  getSystemPrompt,
  getLLMTools,
  wasConfirmed,
  wasCancelled,
  formatDate,
  parseDateFromStringToYYYYMMDD,
};
