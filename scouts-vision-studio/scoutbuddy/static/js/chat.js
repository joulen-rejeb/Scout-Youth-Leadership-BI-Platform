// ===================================================
//  SCOUTBUDDY — chat.js
// ===================================================

const chatMessages = document.getElementById('chatMessages');
const msgInput     = document.getElementById('msgInput');
const sendBtn      = document.getElementById('sendBtn');
const clearBtn     = document.getElementById('clearBtn');

// Set welcome message time
document.getElementById('welcomeTime').textContent = getTime();

// ===== HELPERS =====
function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoading(state) {
  sendBtn.disabled = state;
  msgInput.disabled = state;
}

// ===== ADD MESSAGES =====
function addUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user-row';
  row.innerHTML = `
    <div class="msg-avatar-wrap">
      <div class="msg-avatar user-av">👤</div>
    </div>
    <div class="msg-content">
      <div class="bubble user-bubble">${escapeHtml(text)}</div>
      <span class="msg-time">${getTime()}</span>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function addBotMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row bot-row';
  row.innerHTML = `
    <div class="msg-avatar-wrap">
      <div class="msg-avatar bot-av">⚜️</div>
    </div>
    <div class="msg-content">
      <span class="msg-sender">Q&amp;A Assistance</span>
      <div class="bubble bot-bubble">${text}</div>
      <span class="msg-time">${getTime()}</span>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row bot-row';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar-wrap">
      <div class="msg-avatar bot-av">⚜️</div>
    </div>
    <div class="msg-content">
      <span class="msg-sender">Q&amp;A Assistance</span>
      <div class="bubble bot-bubble typing-bubble">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const t = document.getElementById('typingRow');
  if (t) t.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ===== SEND MESSAGE =====
async function sendMessage(text) {
  if (!text || !text.trim()) return;

  addUserMessage(text);
  setLoading(true);
  addTypingIndicator();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    removeTypingIndicator();

    if (data.bot_response) {
      addBotMessage(data.bot_response);
    } else {
      addBotMessage("Sorry, something went wrong. Please try again.");
    }
  } catch (err) {
    removeTypingIndicator();
    addBotMessage("We could not reach the server. Check your connection and try again.");
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
    msgInput.focus();
  }
}

// ===== QUICK QUESTION =====
function askQuestion(text) {
  sendMessage(text);
}

// ===== CLEAR CHAT =====
clearBtn.addEventListener('click', () => {
  // Keep only the date divider + welcome message
  const rows = chatMessages.querySelectorAll('.msg-row');
  rows.forEach((r, i) => { if (i > 0) r.remove(); });
  msgInput.focus();
});

// ===== EVENTS =====
sendBtn.addEventListener('click', () => {
  const text = msgInput.value.trim();
  msgInput.value = '';
  sendMessage(text);
});

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const text = msgInput.value.trim();
    msgInput.value = '';
    sendMessage(text);
  }
});

// ===== AUTO FOCUS =====
msgInput.focus();
