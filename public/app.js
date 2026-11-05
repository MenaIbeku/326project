const form = document.getElementById('space-form');

form.addEventListener('htmx:beforeRequest', () => {
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
  if (event.detail.xhr.status === 201) {
    form.reset();
  }
});

form.addEventListener('htmx:sendError', () => {
  document.getElementById('form-error').textContent =
    'Could not reach the server. Please check your connection and try again.';
});
