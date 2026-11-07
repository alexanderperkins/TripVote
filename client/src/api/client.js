const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  constructor(status, { code = 'UNKNOWN_ERROR', message = FALLBACK_MESSAGE, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const options = { method, credentials: 'include' };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  const data = parseJson(await response.text());
  if (!response.ok) {
    throw new ApiError(response.status, data?.error);
  }
  return data;
}
