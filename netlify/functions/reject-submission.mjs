// Rejects a blog submission by deleting it from Netlify Forms.

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!authorized(event)) {
    return json(401, { error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const submissionId = payload.id;
  if (!submissionId) {
    return json(400, { error: 'Missing submission id' });
  }

  const apiToken = process.env.NETLIFY_API_TOKEN;
  if (!apiToken) {
    return json(500, { error: 'Server is missing NETLIFY_API_TOKEN' });
  }

  const res = await fetch(`https://api.netlify.com/api/v1/submissions/${submissionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  if (!res.ok) {
    return json(502, { error: 'Failed to delete submission', detail: await res.text() });
  }

  return json(200, { ok: true });
};

function authorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  return expected && provided && provided === expected;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
