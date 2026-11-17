# Kinomi Design Website

Kinomi Designの顧客向けWebサイトです。AI社員管理アプリとは別のGitHubリポジトリ・Vercelプロジェクトとして管理します。

## Contents

- `index.html`, `services.html`, `pricing.html`: public website pages
- `blog/`: microCMS-backed blog list and detail pages
- `api/blog.js`: server-side read-only proxy to microCMS
- `scripts/create-blog-post.mjs`: optional local article creation helper

## Vercel setup

Import this repository as a new Vercel project. Set the project Root Directory to the repository root and use the `Other` framework preset; no build command or output directory is required for the static HTML site.

Set this environment variable for Production (and Preview if needed):

| Name | Value |
| --- | --- |
| `MICROCMS_READ_API_KEY` | microCMS API key with read-only access to the `blog` endpoint |

Do not put the API key in HTML, JavaScript, or any committed file. Keep the existing production deployment and its environment variable until this separate project has been deployed and verified. Only then should the public domain be reassigned to this project.

## Local preview

From this directory, run a local static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The `/api/blog` serverless endpoint requires Vercel to run and will not be provided by Python's static server.

## Blog and microCMS

The service domain and endpoint are configured in `api/blog.js` (`kinomidesignblog` / `blog`). The browser requests `/api/blog`; the serverless function reads `MICROCMS_READ_API_KEY` on the server and never sends it to the browser.

See [blog setup](./blog/README.md) for the expected fields, environment variables, and local article-posting helper.
