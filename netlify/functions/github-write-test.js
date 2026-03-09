export default async () => {
  try {
    const token = Netlify.env.get("GITHUB_TOKEN");
    const owner = Netlify.env.get("GITHUB_OWNER");
    const repo = Netlify.env.get("GITHUB_REPO");
    const branch = Netlify.env.get("GITHUB_BRANCH") || "main";

    if (!token || !owner || !repo) {
      return new Response(
        JSON.stringify({ error: "Missing GitHub environment variables" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const repoPath = "content/authors/test-author/index.md";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const content = `---
title: "Test Author"
draft: false
source: "netlify-test"
---

This file was created by github-write-test.js.
`;

    let sha = undefined;

    const existingRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers,
    });

    if (existingRes.status === 200) {
      const existingJson = await existingRes.json();
      sha = existingJson.sha;
    } else if (existingRes.status !== 404) {
      const details = await existingRes.text();
      return new Response(
        JSON.stringify({ error: "Failed to check existing file", details }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const encodedContent = Buffer.from(content, "utf8").toString("base64");

    const payload = {
      message: "Netlify test: create/update test author",
      content: encodedContent,
      branch,
      ...(sha ? { sha } : {}),
    };

    const writeRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    const writeJson = await writeRes.json();

    if (!writeRes.ok) {
      return new Response(
        JSON.stringify({ error: "GitHub write failed", details: writeJson }),
        { status: writeRes.status, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        path: repoPath,
        commit: writeJson.commit?.sha || null,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unhandled error", details: error.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};