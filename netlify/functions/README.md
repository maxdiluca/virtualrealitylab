# Blog Submissions Admin — Setup

The page at `/blog-admin/` lets you review pending blog submissions, approve them
(commits a markdown draft to GitHub), or reject them (deletes the form
submission). Backed by three Netlify Functions in this folder.

## Required Netlify environment variables

Set these in **Netlify dashboard → Site settings → Environment variables**.
None of these go in the repo.

| Name | Value | How to get it |
|---|---|---|
| `ADMIN_PASSWORD` | A long random string you choose | Pick something only you know. Used to gate `/blog-admin/`. |
| `NETLIFY_API_TOKEN` | Netlify Personal Access Token | https://app.netlify.com/user/applications#personal-access-tokens → "New access token" |
| `NETLIFY_SITE_ID` | This site's UUID | Netlify dashboard → Site settings → General → "Site ID" |
| `NETLIFY_FORM_NAME` | `blog-post-entry` (default) | Optional. Override only if the form is renamed. |
| `GITHUB_TOKEN` | GitHub fine-grained PAT | See "GitHub PAT" below |
| `GITHUB_OWNER` | `maxdiluca` | Owner of the repo |
| `GITHUB_REPO` | `virtualrealitylab` | Repo name |
| `GITHUB_BRANCH` | `profile-updates-branch` | Target branch for committed drafts |

## GitHub PAT

The repo `maxdiluca/virtualrealitylab` is owned by Max. Two ways to authorise the
function to commit:

1. **(Recommended)** Max adds you (Arindam) as a Collaborator on the repo
   (`Settings → Collaborators → Add people` on github.com). You then create the
   PAT under your own GitHub account.
2. Max creates the PAT himself and shares it with you to paste into Netlify.

### Creating the fine-grained PAT

1. github.com → your avatar → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `vrlab-blog-admin`. Expiration: pick whatever you're comfortable with (1 year max).
3. **Resource owner**: `maxdiluca`. **Repository access**: Only select repositories → `virtualrealitylab`.
4. **Repository permissions**: set **Contents** = **Read and write**. Leave everything else at "No access".
5. Generate. Copy the token (starts with `github_pat_…`). Paste into Netlify's `GITHUB_TOKEN` env var.

## Local testing (optional)

If you have the Netlify CLI installed:

```
npm install -g netlify-cli
netlify dev
```

Then visit `http://localhost:8888/blog-admin/` and `netlify dev` will proxy
function calls. You'll need a `.env` file with the same variables (don't commit
this).

## How approve actually works

1. The function fetches the full submission (including any inline base64 images)
   from the Netlify Forms API.
2. It scans `post_content` for `<img src="data:image/...;base64,...">` tags,
   extracts each image, and rewrites the `<img>` to point at `image1.png`,
   `image2.png`, etc.
3. It builds `content/blog/<slug>/index.md` with `draft: true` frontmatter and
   the rewritten HTML body. The slug is derived from the title.
4. Using GitHub's Git Data API, it creates blobs for the markdown and every
   image, then assembles them into one tree and one commit on the configured
   branch. Single commit per approval — the post folder appears with all its
   files at once.
5. The Netlify Forms submission is then deleted (best-effort).

After approval, the post is **a draft** — it won't appear on the published site
until someone (you or Max) flips `draft: true` to `draft: false` and the next
build runs. This is by design so you have a final review pass before publish.
