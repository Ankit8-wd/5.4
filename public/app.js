const healthStatus = document.getElementById("health-status");
const contactForm = document.getElementById("contact-form");
const formFeedback = document.getElementById("form-feedback");
const messagesList = document.getElementById("messages-list");

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

function renderMessages(messages) {
  if (!messages.length) {
    messagesList.innerHTML =
      '<p class="empty-state">No messages yet. Submit the form to create your first record.</p>';
    return;
  }

  messagesList.innerHTML = messages
    .map(
      (entry) => `
        <article class="message-card">
          <h3>${entry.name}</h3>
          <div class="message-meta">${entry.email} · ${formatDate(entry.createdAt)}</div>
          <p>${entry.message}</p>
        </article>
      `
    )
    .join("");
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    healthStatus.textContent = data.status === "ok" ? "API connected" : "API unavailable";
  } catch {
    healthStatus.textContent = "API unavailable";
  }
}

async function loadMessages() {
  try {
    const response = await fetch("/api/messages");
    const data = await response.json();
    renderMessages(data.messages || []);
  } catch {
    messagesList.innerHTML =
      '<p class="empty-state">Could not load messages yet. Try refreshing after the server starts.</p>';
  }
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  formFeedback.textContent = "Sending...";

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      formFeedback.textContent = data.error || "Something went wrong.";
      return;
    }

    contactForm.reset();
    formFeedback.textContent = data.message;
    await loadMessages();
  } catch {
    formFeedback.textContent = "The server could not be reached.";
  }
});

loadHealth();
loadMessages();
