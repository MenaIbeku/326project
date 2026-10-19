const form = document.getElementById('space-form');
const errorMessage = document.getElementById('form-error');

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  errorMessage.hidden = true;

  const formData = new FormData(form);
  const space = {
    name: formData.get('name'),
    location: formData.get('location'),
    noiseLevel: formData.get('noiseLevel'),
    groupFriendly: formData.has('groupFriendly'),
  };

  let response;
  try {
    response = await fetch('/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(space),
    });
  } catch {
    showError('Could not reach the server. Please check your connection and try again.');
    return;
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    showError(result?.error || 'Could not save the study space. Please try again.');
    return;
  }

  window.location.reload();
});
