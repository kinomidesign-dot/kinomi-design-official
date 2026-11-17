const SERVICE_DOMAIN = "kinomidesignblog";
const ENDPOINT = "blog";
const CONTENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "この操作は許可されていません。" });
  }

  const apiKey = process.env.MICROCMS_READ_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: "ブログAPIの設定が完了していません。管理者にお問い合わせください。" });
  }

  const rawId = req.query.id;
  if (Array.isArray(rawId)) {
    return sendJson(res, 400, { error: "記事IDが正しくありません。" });
  }
  const id = rawId;
  if (id !== undefined && (typeof id !== "string" || !CONTENT_ID_PATTERN.test(id))) {
    return sendJson(res, 400, { error: "記事IDが正しくありません。" });
  }

  const params = new URLSearchParams();
  if (!id) {
    if (Array.isArray(req.query.limit) || Array.isArray(req.query.offset)) {
      return sendJson(res, 400, { error: "記事一覧の取得条件が正しくありません。" });
    }
    const rawLimit = req.query.limit || "9";
    const rawOffset = req.query.offset || "0";
    const limit = Number(rawLimit);
    const offset = Number(rawOffset);
    if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return sendJson(res, 400, { error: "記事の取得件数が正しくありません。" });
    }
    if (!/^\d+$/.test(rawOffset) || !Number.isInteger(offset) || offset < 0 || offset > 100000) {
      return sendJson(res, 400, { error: "記事の取得位置が正しくありません。" });
    }
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    params.set("orders", "-publishedAt");
  }

  const resource = id ? `/${encodeURIComponent(id)}` : "";
  const url = `https://${SERVICE_DOMAIN}.microcms.io/api/v1/${ENDPOINT}${resource}${params.size ? `?${params}` : ""}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await fetch(url, {
      headers: { "X-MICROCMS-API-KEY": apiKey },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.error(`microCMS blog request failed with status ${upstream.status}`);
      return sendJson(res, upstream.status === 404 ? 404 : 502, {
        error: upstream.status === 404 ? "記事が見つかりませんでした。" : "ブログ記事を取得できませんでした。",
      });
    }

    const content = await upstream.json();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.end(JSON.stringify(content));
  } catch (error) {
    if (error.name === "AbortError") {
      return sendJson(res, 504, { error: "ブログ記事の取得がタイムアウトしました。時間をおいて再度お試しください。" });
    }
    console.error("microCMS blog request could not be completed");
    return sendJson(res, 502, { error: "ブログ記事を取得できませんでした。" });
  } finally {
    clearTimeout(timeout);
  }
};
