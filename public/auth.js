// Shared client logic for the sign-up and login forms.
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function showErrors(form, data) {
  const fields = data?.fields ?? {};
  for (const input of form.querySelectorAll('input')) {
    const message = fields[input.name] ?? '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    const slot = form.querySelector(`#${input.name}-error`);
    if (slot) slot.textContent = message;
  }
  // Field-level messages are enough on their own; only show the banner when there are none.
  form.querySelector('.form-error').textContent =
    Object.keys(fields).length ? '' : (data?.error ?? 'Something went wrong. Please try again.');
}

function wireForm(form, url) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form));
      const { ok, data } = await postJson(url, body);
      if (ok) {
        window.location.assign('/');
      } else {
        showErrors(form, data);
      }
    } catch {
      showErrors(form, { error: 'Could not reach the server. Check your connection.' });
    } finally {
      button.disabled = false;
    }
  });
}

const form = document.querySelector('form[data-auth]');
if (form) wireForm(form, `/api/auth/${form.dataset.auth}`);
