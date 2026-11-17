(() => {
  const pageSize = 9;
  const listElement = document.querySelector("#blog-list");

  if (!listElement && !document.querySelector("#article-content")) return;

  const cleanText = (value) => {
    if (typeof value !== "string") return "";
    const parser = new DOMParser();
    let text = parser.parseFromString(value, "text/html").body.textContent.trim();
    if (/<(?:p|h[1-6]|ul|ol|blockquote|br|div)\b/i.test(text)) {
      text = parser.parseFromString(text, "text/html").body.textContent.trim();
    }
    return text.replace(/\s+/g, " ");
  };

  const imageUrl = (image) => {
    if (typeof image === "string") return image;
    return image && typeof image.url === "string" ? image.url : "";
  };

  const displayName = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(displayName).filter(Boolean).join("、");
    if (value && typeof value === "object") return value.name || value.title || "";
    return "";
  };

  const displayDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
  };

  const showStatus = (element, message, isError = false) => {
    element.textContent = message;
    element.classList.toggle("error", isError);
  };

  const fetchContent = async ({ id, limit, offset } = {}) => {
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    else {
      params.set("limit", String(limit));
      params.set("offset", String(offset));
    }
    const response = await fetch(`/api/blog?${params}`);
    if (!response.ok) {
      let message = `ブログ記事を取得できませんでした（HTTP ${response.status}）。`;
      try {
        const result = await response.json();
        if (typeof result.error === "string") message = result.error;
      } catch {
        // Keep the HTTP status message when the endpoint response is not JSON.
      }
      throw new Error(message);
    }
    return response.json();
  };

  const addImage = (container, src, alt, className) => {
    const image = document.createElement("img");
    image.className = className;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.src = src;
    container.append(image);
  };

  const renderList = async () => {
    const status = document.querySelector("#blog-status");
    const pagination = document.querySelector("#blog-pagination");
    const pageIndicator = document.querySelector("#blog-page-indicator");
    const previous = document.querySelector("#blog-previous");
    const next = document.querySelector("#blog-next");
    let offset = 0;
    let totalCount = 0;

    const loadPage = async () => {
      showStatus(status, "記事を読み込んでいます。");
      listElement.replaceChildren();
      pagination.hidden = true;
      try {
        const result = await fetchContent({ limit: pageSize, offset });
        const articles = Array.isArray(result.contents) ? result.contents : [];
        totalCount = Number(result.totalCount) || articles.length;

        if (articles.length === 0) {
          const empty = document.createElement("p");
          empty.className = "blog-empty";
          empty.textContent = "現在、公開中の記事はありません。";
          listElement.append(empty);
          showStatus(status, "記事はありません。");
          return;
        }

        for (const article of articles) {
          const link = document.createElement("a");
          link.className = "blog-card";
          link.href = `./article.html?id=${encodeURIComponent(article.id)}`;
          const cover = imageUrl(article.eyecatch);
          if (cover) addImage(link, cover, article.title || "ブログ記事", "blog-card-image");
          else {
            const placeholder = document.createElement("div");
            placeholder.className = "blog-card-image is-empty";
            placeholder.setAttribute("aria-hidden", "true");
            link.append(placeholder);
          }

          const copy = document.createElement("div");
          copy.className = "blog-card-copy";
          const meta = document.createElement("div");
          meta.className = "blog-meta";
          const category = displayName(article.category);
          if (category) {
            const categoryLabel = document.createElement("span");
            categoryLabel.className = "blog-category";
            categoryLabel.textContent = category;
            meta.append(categoryLabel);
          }
          const dateText = displayDate(article.publishedAt || article.createdAt);
          if (dateText) {
            const date = document.createElement("time");
            date.dateTime = article.publishedAt || article.createdAt;
            date.textContent = dateText;
            meta.append(date);
          }
          copy.append(meta);

          const title = document.createElement("h2");
          title.textContent = article.title || "タイトル未設定";
          copy.append(title);
          const rawSummary = cleanText(article.summary) || cleanText(article.body);
          const summaryText = rawSummary.length > 150 ? `${rawSummary.slice(0, 150).trim()}…` : rawSummary;
          if (summaryText) {
            const summary = document.createElement("p");
            summary.className = "blog-card-summary";
            summary.textContent = summaryText;
            copy.append(summary);
          }
          link.append(copy);
          listElement.append(link);
        }

        const currentPage = Math.floor(offset / pageSize) + 1;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        pagination.hidden = totalCount <= pageSize;
        pageIndicator.textContent = `${currentPage} / ${totalPages}`;
        previous.disabled = offset === 0;
        next.disabled = offset + pageSize >= totalCount;
        showStatus(status, `${totalCount}件の記事`);
      } catch (error) {
        showStatus(status, error.message || "記事の読み込みに失敗しました。", true);
        const setup = document.createElement("p");
        setup.className = "blog-setup-note";
        setup.textContent = "ブログAPIの接続設定を確認してください。管理者はVercelの環境変数 MICROCMS_READ_API_KEY と、microCMS側の読み取り権限をご確認ください。";
        listElement.append(setup);
      }
    };

    previous.addEventListener("click", () => {
      offset = Math.max(0, offset - pageSize);
      loadPage();
    });
    next.addEventListener("click", () => {
      offset += pageSize;
      loadPage();
    });
    await loadPage();
  };

  const sanitizeRichText = (html) => {
    const allowed = new Set(["P", "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "STRONG", "B", "EM", "I", "A", "IMG", "HR", "BR", "CODE", "PRE"]);
    const blocked = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "VIDEO", "AUDIO"]);
    const parser = new DOMParser();
    let parsed = parser.parseFromString(html, "text/html");
    const decodedText = parsed.body.textContent.trim();
    if (/<(?:p|h[1-6]|ul|ol|blockquote|br|div)\b/i.test(decodedText)) {
      parsed = parser.parseFromString(decodedText, "text/html");
    }

    const copySafeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
      if (blocked.has(node.tagName)) return document.createDocumentFragment();

      const wrapper = document.createDocumentFragment();
      if (allowed.has(node.tagName)) {
        const target = document.createElement(node.tagName.toLowerCase());
        if (node.tagName === "A") {
          const href = node.getAttribute("href") || "";
          if (/^(https:\/\/|mailto:)/i.test(href)) {
            target.setAttribute("href", href);
            target.setAttribute("rel", "noopener noreferrer");
            if (/^https:\/\//i.test(href)) target.setAttribute("target", "_blank");
          }
        }
        if (node.tagName === "IMG") {
          const src = node.getAttribute("src") || "";
          if (!/^https:\/\//i.test(src)) return document.createDocumentFragment();
          target.setAttribute("src", src);
          target.setAttribute("alt", node.getAttribute("alt") || "");
          target.setAttribute("loading", "lazy");
          target.setAttribute("decoding", "async");
        }
        if (node.tagName === "CODE" && node.parentElement?.tagName === "PRE") target.classList.add("language-plain");
        for (const child of node.childNodes) target.append(copySafeNode(child));
        wrapper.append(target);
      } else {
        for (const child of node.childNodes) wrapper.append(copySafeNode(child));
      }
      return wrapper;
    };

    const fragment = document.createDocumentFragment();
    for (const child of parsed.body.childNodes) fragment.append(copySafeNode(child));
    return fragment;
  };

  const renderArticle = async () => {
    const status = document.querySelector("#article-status");
    const content = document.querySelector("#article-content");
    const id = new URLSearchParams(location.search).get("id");
    if (!id) {
      showStatus(status, "記事が指定されていません。ブログ一覧から記事をお選びください。", true);
      return;
    }

    try {
      const article = await fetchContent({ id });
      if (!article || !article.id) throw new Error("記事が見つかりませんでした。");
      document.title = `${article.title || "記事"}｜ブログ・お知らせ｜Kinomi Design`;
      const description = cleanText(article.summary || article.body || "").slice(0, 150);
      if (description) document.querySelector('meta[name="description"]').content = description;
      document.querySelector("#article-title").textContent = article.title || "タイトル未設定";
      document.querySelector("#article-breadcrumb-title").textContent = article.title || "記事";
      document.querySelector("#article-category").textContent = displayName(article.category);
      const date = document.querySelector("#article-date");
      const dateValue = article.publishedAt || article.createdAt;
      date.textContent = displayDate(dateValue);
      if (dateValue) date.dateTime = dateValue;
      const summary = document.querySelector("#article-summary");
      if (article.summary) {
        summary.textContent = article.summary;
        summary.hidden = false;
      }
      const cover = imageUrl(article.eyecatch);
      const image = document.querySelector("#article-eyecatch");
      if (cover) {
        image.src = cover;
        image.alt = article.title || "";
        image.hidden = false;
      }
      const body = article.body;
      if (typeof body !== "string") throw new Error("記事本文がありません。microCMSのAPIスキーマで本文フィールドを「body」に設定してください。");
      document.querySelector("#article-body").replaceChildren(sanitizeRichText(body));
      content.hidden = false;
      status.hidden = true;
    } catch (error) {
      showStatus(status, error.message || "記事の読み込みに失敗しました。", true);
    }
  };

  if (document.querySelector("#blog-list")) renderList();
  else renderArticle();
})();
