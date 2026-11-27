const form = document.getElementById('space-form');
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener('htmx:beforeRequest', () => {
  submitButton.setAttribute('aria-disabled', 'true');
  document.getElementById('form-error').textContent = '';
});

document.body.addEventListener('htmx:beforeSwap', (event) => {
  if (event.detail.xhr.getResponseHeader('HX-Retarget') === '#form-error') {
    // HTMX skips error responses by default, but these contain an HTML error partial.
    event.detail.shouldSwap = true;
    event.detail.isError = false;
  }
});

form.addEventListener('htmx:afterRequest', (event) => {
  submitButton.removeAttribute('aria-disabled');
  const { status } = event.detail.xhr;
  if (status === 201) {
    form.reset();
  } else if (status === 401) {
    document.getElementById('form-error').textContent = 'Please log in to add a study space.';
  }
});

form.addEventListener('htmx:sendError', () => {
  document.getElementById('form-error').textContent =
    'Could not reach the server. Please check your connection and try again.';
});
