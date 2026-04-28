// Approves a blog submission: fetches it from Netlify, extracts inline images
// into separate files, builds a Hugo markdown post (draft: true), and commits
// everything in a single GitHub commit via the Git Data API.

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

  const env = readEnv();
  const missing = ['NETLIFY_API_TOKEN', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH']
    .filter((k) => !env[k]);
  if (missing.length) {
    return json(500, { error: `Server missing env vars: ${missing.join(', ')}` });
  }

  // 1. Fetch the submission (full data including inline base64 images)
  const subRes = await fetch(`https://api.netlify.com/api/v1/submissions/${submissionId}`, {
    headers: { Authorization: `Bearer ${env.NETLIFY_API_TOKEN}` }
  });
  if (!subRes.ok) {
    return json(502, { error: 'Failed to fetch submission', detail: await subRes.text() });
  }
  const submission = await subRes.json();
  const data = submission.data || {};

  const title = (data.title || '').trim() || 'Untitled post';
  const slug = slugify(title) || `post-${Date.now()}`;
  const date = (submission.created_at || new Date().toISOString()).slice(0, 10);

  // 2. Extract inline base64 images. Returns rewritten HTML + list of binary blobs.
  const { html: bodyHtml, images } = extractInlineImages(data.post_content || '');

  // 3. Build the markdown file content
  const markdown = buildMarkdown({
    title,
    date,
    author: data.author_name || 'Anonymous',
    email: data.email || '',
    summary: data.summary || '',
    body: bodyHtml,
    mediaLinks: data.media_links || ''
  });

  // 4. Commit to GitHub in a single commit using the Git Data API
  try {
    const result = await commitToGitHub({
      env,
      slug,
      title,
      markdown,
      images
    });
    // 5. Delete the submission from Netlify Forms (best-effort)
    await fetch(`https://api.netlify.com/api/v1/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.NETLIFY_API_TOKEN}` }
    }).catch(() => {});

    return json(200, { ok: true, slug, commit: result.commitSha, branch: env.GITHUB_BRANCH });
  } catch (err) {
    return json(502, { error: 'GitHub commit failed', detail: String(err.message || err) });
  }
};

// ---- helpers ----

function readEnv() {
  return {
    NETLIFY_API_TOKEN: process.env.NETLIFY_API_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH
  };
}

function authorized(event) {
  const provided = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  const expected = process.env.ADMIN_PASSWORD;
  return expected && provided && provided === expected;
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extractInlineImages(html) {
  const images = [];
  let counter = 0;
  const cleaned = html.replace(
    /<img([^>]*?)\ssrc="data:image\/([a-zA-Z0-9+.-]+);base64,([^"]+)"([^>]*)>/g,
    (_match, before, mime, b64, after) => {
      counter += 1;
      const ext = mime.toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const filename = `image${counter}.${ext}`;
      images.push({ filename, base64: b64 });
      return `<img${before} src="${filename}"${after}>`;
    }
  );
  return { html: cleaned, images };
}

function buildMarkdown({ title, date, author, email, summary, body, mediaLinks }) {
  const escapedTitle = JSON.stringify(title);
  const escapedSummary = JSON.stringify(summary);
  const escapedAuthor = JSON.stringify(author);

  const mediaSection = mediaLinks
    ? `\n<aside class="lab-blog-media-links">\n  <h2>Supporting media links</h2>\n  <pre>${escapeHtml(mediaLinks)}</pre>\n</aside>\n`
    : '';

  return [
    '---',
    `title: ${escapedTitle}`,
    `date: ${date}`,
    'draft: true',
    `summary: ${escapedSummary}`,
    `# Submitted by ${author} <${email}> via the website blog form.`,
    `# Authors list below uses the raw display name; replace with a real authors-key`,
    `# from data/authors/ before publishing.`,
    `authors: [${escapedAuthor}]`,
    '---',
    '',
    body,
    mediaSection
  ].join('\n');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function commitToGitHub({ env, slug, title, markdown, images }) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env;
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'vrlab-admin',
    'Content-Type': 'application/json'
  };

  // Get current branch ref
  const refRes = await fetch(`${apiBase}/git/ref/heads/${GITHUB_BRANCH}`, { headers: ghHeaders });
  if (!refRes.ok) throw new Error(`Cannot get branch ref: ${await refRes.text()}`);
  const baseSha = (await refRes.json()).object.sha;

  // Get parent commit (for tree sha)
  const commitRes = await fetch(`${apiBase}/git/commits/${baseSha}`, { headers: ghHeaders });
  if (!commitRes.ok) throw new Error(`Cannot get parent commit: ${await commitRes.text()}`);
  const baseTreeSha = (await commitRes.json()).tree.sha;

  // Create blobs (markdown as utf-8, images as base64)
  const tree = [];
  const mdBlob = await postJson(`${apiBase}/git/blobs`, ghHeaders, {
    content: markdown,
    encoding: 'utf-8'
  });
  tree.push({
    path: `content/blog/${slug}/index.md`,
    mode: '100644',
    type: 'blob',
    sha: mdBlob.sha
  });

  for (const img of images) {
    const blob = await postJson(`${apiBase}/git/blobs`, ghHeaders, {
      content: img.base64,
      encoding: 'base64'
    });
    tree.push({
      path: `content/blog/${slug}/${img.filename}`,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }

  // Create new tree
  const newTree = await postJson(`${apiBase}/git/trees`, ghHeaders, {
    base_tree: baseTreeSha,
    tree
  });

  // Create commit
  const newCommit = await postJson(`${apiBase}/git/commits`, ghHeaders, {
    message: `Add blog draft: ${title}`,
    tree: newTree.sha,
    parents: [baseSha]
  });

  // Move branch ref
  const updateRes = await fetch(`${apiBase}/git/refs/heads/${GITHUB_BRANCH}`, {
    method: 'PATCH',
    headers: ghHeaders,
    body: JSON.stringify({ sha: newCommit.sha })
  });
  if (!updateRes.ok) throw new Error(`Cannot update branch ref: ${await updateRes.text()}`);

  return { commitSha: newCommit.sha };
}

async function postJson(url, headers, body) {
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
