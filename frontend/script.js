let currentSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');

  // Initial bot greeting
  addMessage(
    'bot',
    "Hello! I'm a restaurant service assistant. How can i help you ?",
    true
  );

  // Add message to chat
  function addMessage(sender, text, isInitial = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    messageDiv.innerHTML = `
      ${text}
      <span class="message-time">${time}</span>
    `;

    chatContainer.appendChild(messageDiv);

    if (!isInitial) {
      // Smooth scroll to bottom
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Send message to backend
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;

    try {
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: currentSessionId,
        }),
      });

      const data = await response.json();
      currentSessionId = data.sessionId || currentSessionId;

      // Handle confirmation differently
      if (data.needsConfirmation) {
        showConfirmationButtons(data.reply);
      } else {
        addMessage('bot', data.reply);
      }
    } catch (error) {
      addMessage(
        'bot',
        "Sorry, I'm having trouble connecting. Please try again."
      );
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  }

  // Special handling for confirmation
  function showConfirmationButtons(messageText) {
    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'message bot-message';

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    confirmationDiv.innerHTML = `
      ${messageText.replace('CONFIRM:', '')}
      <div class="confirmation-buttons">
        <button class="confirm-btn yes-btn">Yes</button>
        <button class="confirm-btn no-btn">No</button>
      </div>
      <span class="message-time">${time}</span>
    `;

    chatContainer.appendChild(confirmationDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Add button handlers
    document
      .querySelector('.yes-btn')
      .addEventListener('click', () => handleConfirmation('yes'));
    document
      .querySelector('.no-btn')
      .addEventListener('click', () => handleConfirmation('no'));
  }

  // Handle confirmation response
  async function handleConfirmation(choice) {
    try {
      const response = await fetch('/api/reservations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          confirmation: choice,
        }),
      });

      const data = await response.json();
      addMessage('bot', data.reply);
    } catch (error) {
      addMessage('bot', 'Confirmation failed. Please try again.');
    }
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
});
