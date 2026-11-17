#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const readEnvFile = async () => {
  try {
    const contents = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || Object.hasOwn(process.env, match[1])) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const fail = (message) => {
  console.error(`エラー: ${message}`);
  process.exitCode = 1;
};

await readEnvFile();

const args = process.argv.slice(2);
const publish = args.includes("--publish");
const inputPath = args.find((arg) => !arg.startsWith("--"));
if (args.includes("--publish") && args.includes("--draft")) {
  fail("--draft と --publish は同時に指定できません。");
} else if (args.some((arg) => arg.startsWith("--") && arg !== "--publish" && arg !== "--draft")) {
  fail("使用できるオプションは --draft または --publish です。");
} else if (!inputPath) {
  fail("記事JSONファイルを指定してください。例: node scripts/create-blog-post.mjs scripts/example-blog-post.json --draft");
} else {
  const domain = (process.env.MICROCMS_SERVICE_DOMAIN || "").trim();
  const apiKey = (process.env.MICROCMS_API_KEY || "").trim();
  const endpoint = (process.env.MICROCMS_ENDPOINT || "blog").trim();

  if (!/^[a-zA-Z0-9-]+$/.test(domain)) {
    fail("環境変数 MICROCMS_SERVICE_DOMAIN にmicroCMSのサービスドメインを設定してください。");
  } else if (!apiKey) {
    fail("環境変数 MICROCMS_API_KEY に書き込み権限のあるAPIキーを設定してください。");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(endpoint)) {
    fail("MICROCMS_ENDPOINT は英数字、ハイフン、アンダースコアで指定してください。");
  } else {
    try {
      const content = JSON.parse(await readFile(resolve(inputPath), "utf8"));
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new Error("記事JSONはオブジェクト形式で指定してください。");
      }
      if (typeof content.title !== "string" || !content.title.trim()) {
        throw new Error("記事JSONに空でない title を指定してください。");
      }
      if (typeof content.body !== "string" || !content.body.trim()) {
        throw new Error("記事JSONにHTML形式の body を指定してください。");
      }
      if (Object.hasOwn(content, "status") || Object.hasOwn(content, "publishedAt")) {
        throw new Error("status と publishedAt は記事JSONに含めないでください。公開状態は --draft / --publish で指定します。");
      }

      const baseUrl = `https://${domain}.microcms.io/api/v1/${endpoint}`;
      const url = publish ? baseUrl : `${baseUrl}?status=draft`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MICROCMS-API-KEY": apiKey,
        },
        body: JSON.stringify(content),
      });
      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = {};
      }

      if (!response.ok) {
        const detail = typeof result.message === "string" ? result.message : `HTTP ${response.status}`;
        throw new Error(`microCMSへの投稿に失敗しました（${detail}）。APIキーの権限とAPIフィールド名を確認してください。`);
      }
      console.log(`${publish ? "公開" : "下書き"}記事を作成しました。`);
      console.log(`タイトル: ${content.title}`);
      if (result.id) console.log(`記事ID: ${result.id}`);
      if (result.url) console.log(`記事URL: ${result.url}`);
    } catch (error) {
      fail(error.message || "記事の作成に失敗しました。");
    }
  }
}
