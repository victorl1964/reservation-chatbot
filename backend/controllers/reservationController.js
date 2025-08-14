const { getLLMResponse } = require('../utils/llm');
const {
  validateReservation,
  wasConfirmed,
  wasCancelled,
} = require('../utils/helpers');
const Reservation = require('../models/Reservation');
const { getSession, clearSession } = require('../config/session');

const handleChat = async (sessionId, userInput) => {
  const session = getSession(sessionId);

  // Add user message
  session.messages.push({ role: 'user', content: userInput });

  // Get LLM response using all the conversiontion beween the message and the LLM so far
  const assistantMessage = await getLLMResponse(session.messages);
  // add the LLM response to the conversation
  session.messages.push({
    role: 'assistant',
    content: assistantMessage.content,
  });

  // Check for function call (all data collected). If 'tool_calls' is present in the
  // LLM response, we have collected all data needed, and we should proceed with
  // booking
  if (assistantMessage.tool_calls) {
    const toolCall = assistantMessage.tool_calls[0];
    // We must check that the function to be called is the right one. This should be
    // the one defined in helpers.js
    if (toolCall.function.name === 'save_reservation') {
      try {
        // data collected by the LLM through subsequent user messages, are stored in
        // toolCall.function.arguments
        const data = JSON.parse(toolCall.function.arguments);
        //Let's validate before saving ...'
        const errors = validateReservation(data);

        if (errors.length > 0) {
          return {
            reply: `Validation errors: ${errors.join(', ')}`,
            sessionId,
          };
        }

        session.collectedData = data;
        //If we have collected all data, we return all of them, for the user to confirme or cancel
        return {
          reply: `CONFIRM: Reserve for ${data.date} at ${data.time} for ${data.guests} people ?`,
          sessionId,
          needsConfirmation: true,
        };
      } catch (error) {
        return {
          reply: 'Failed to parse reservation data',
          sessionId,
        };
      }
    }
  }
  //Otherwise, we return the LLM response, which should be in Natural Language
  return { reply: assistantMessage.content, sessionId };
};

const confirmReservation = async (sessionId, confirmation) => {
  const session = getSession(sessionId);
  if (!session.collectedData) return 'No pending reservation';

  if (wasConfirmed(confirmation)) {
    try {
      const reservation = await new Reservation({
        ...session.collectedData,
        confirmed: true,
        createdAt: new Date(),
      }).save();
      clearSession(sessionId);

      return {
        reply: `Thank U Mr/Ms ${session.collectedData.name}. You have booked a table for 
        ${session.collectedData.guests} people on ${session.collectedData.date}/${session.collectedData.time}.
         We'll be reaching out to you at ${session.collectedData.contact} ...`,
        sessionId,
        reservationId: reservation._id.toString(),
      };
    } catch (error) {
      console.error('DB Error:', error);
      return 'Failed to save reservation';
    }
  } else {
    if (wasCancelled(confirmation)) {
      return { reply: 'Reservation cancelled!', sessionId };
    } else {
      // The backend does not know if the user confirmed or cancelled the reservation, will
      // ask again:
      const data = session.collectedData;
      return {
        reply: `Could not understand, please CONFIRM: Reserve for ${data.date} at ${data.time} for ${data.guests} people ? `,
        sessionId,
        needsConfirmation: true,
      };
    }
  }
};

module.exports = { handleChat, confirmReservation };
