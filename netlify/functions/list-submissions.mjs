// Lists pending blog submissions from Netlify Forms for the admin page.
// Strips inline base64 images from the response so it stays a manageable size.

const FORM_NAME = process.env.NETLIFY_FORM_NAME || 'blog-post-entry';

export const handler = async (event) => {
  if (!authorized(event)) {
    return json(401, { error: 'Unauthorized' });
  }

  const siteId = process.env.NETLIFY_SITE_ID;
  const apiToken = process.env.NETLIFY_API_TOKEN;
  if (!siteId || !apiToken) {
    return json(500, { error: 'Server is missing NETLIFY_SITE_ID or NETLIFY_API_TOKEN' });
  }

  const res = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=100`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  if (!res.ok) {
    return json(502, { error: 'Netlify API error', detail: await res.text() });
  }
  const all = await res.json();

  const submissions = all
    .filter((s) => s.form_name === FORM_NAME)
    .map((s) => {
      const data = s.data || {};
      return {
        id: s.id,
        created_at: s.created_at,
        title: data.title || '',
        author_name: data.author_name || '',
        email: data.email || '',
        summary: data.summary || '',
        media_links: data.media_links || '',
        post_content_preview: stripBase64Images(data.post_content || ''),
        inline_image_count: countInlineImages(data.post_content || '')
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return json(200, submissions);
};

function authorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  return expected && provided && provided === expected;
}

function stripBase64Images(html) {
  return html.replace(
    /data:image\/[^;]+;base64,[^"]+/g,
    (m) => `[inline image, ~${Math.round((m.length * 3) / 4 / 1024)} KB]`
  );
}

function countInlineImages(html) {
  const matches = html.match(/data:image\/[^;]+;base64,/g);
  return matches ? matches.length : 0;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
