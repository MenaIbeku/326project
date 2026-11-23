const authForm = document.getElementById("auth-form");
const authStatus = document.getElementById("auth-status");
const authError = document.getElementById("auth-error");
const guestLinks = document.getElementById("guest-links");
const logoutButton = document.getElementById("logout-button");

function showAuthError(message) {
  authError.textContent = message;
  authError.focus();
}

async function loadAuthStatus() {
  try {
    const response = await fetch("/auth/me", { cache: "no-store" });
    if (response.status === 401) {
      authStatus.textContent = "Not logged in.";
      guestLinks.hidden = false;
      logoutButton.hidden = true;
      return;
    }
    if (!response.ok) throw new Error();
    const { user } = await response.json();
    authStatus.textContent = `Logged in as ${user.name} (${user.role}).`;
    guestLinks.hidden = true;
    logoutButton.hidden = false;
  } catch {
    authStatus.textContent = "Unable to check login status. Please reload the page.";
  }
}

async function submitAuth(url, data, button) {
  button.disabled = true;
  authError.textContent = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const result = await response.json();
      showAuthError(result.error || "Please try again.");
      return;
    }
    window.location.assign(url === "/auth/logout" ? "/auth/login" : "/spaces");
  } catch {
    showAuthError("Could not reach the server. Please try again.");
  } finally {
    button.disabled = false;
  }
}

if (authForm) {
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(authForm));
    submitAuth(authForm.getAttribute("action"), data, authForm.querySelector('button[type="submit"]'));
  });
}

logoutButton.addEventListener("click", () => submitAuth("/auth/logout", {}, logoutButton));
window.addEventListener("pageshow", loadAuthStatus);
