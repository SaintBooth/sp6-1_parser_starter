function parsePage(root = document, debug = false) {
  const isDoc = (n) => n && (n.nodeType === 9 || n.defaultView);
  const ctxDoc = isDoc(root) ? root : root.ownerDocument || document;
  const ctxRoot = isDoc(root) ? root : root;

  const $ = (sel, r = ctxRoot) => r.querySelector(sel);
  const $$ = (sel, r = ctxRoot) => Array.from(r.querySelectorAll(sel));
  const txt = (el) => (el?.textContent || "").trim();

  const currencyMap = { "₽": "RUB", $: "USD", "€": "EUR" };

  const getMetaContent = (propName) => {
    const head = isDoc(ctxDoc) ? ctxDoc.head : $("head", ctxRoot) || ctxRoot;
    const metas = head ? head.querySelectorAll("meta") : [];
    for (const m of metas) {
      const prop = (
        m.getAttribute("property") ||
        m.getAttribute("name") ||
        ""
      ).toLowerCase();
      if (prop === propName.toLowerCase())
        return m.getAttribute("content") || "";
    }
    return "";
  };

  const parsePrice = (raw) => {
    const s = (raw || "").toString();
    const m = s.match(/([₽$€])?\s*([\d\s.,]+)/);
    if (!m) return { amount: 0, code: "" };
    const symbol = m[1] || "";
    const numeric = (m[2] || "").replace(/[^\d]/g, "");
    const amount = Number(numeric || 0);
    if (debug) {
      console.log(
        "parsePrice input:",
        s,
        "numeric:",
        numeric,
        "amount:",
        amount,
        "typeof amount:",
        typeof amount
      );
    }
    return { amount, code: currencyMap[symbol] || "" };
  };

  const stripAllAttrs = (html, element) => {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
    });
    return clone.innerHTML.trim();
  };

  // ---------- META ----------
  const htmlEl = isDoc(ctxDoc)
    ? ctxDoc.documentElement
    : $("html", ctxRoot) || ctxDoc.documentElement;
  const language = (htmlEl?.getAttribute("lang") || "").trim();

  const fullTitle =
    getMetaContent("og:title") ||
    (isDoc(ctxDoc) ? ctxDoc.title : $("title", ctxRoot)?.textContent || "");
  const pageTitleTag = isDoc(ctxDoc)
    ? ctxDoc.title
    : $("title", ctxRoot)?.textContent || "";
  const title =
    pageTitleTag && pageTitleTag.includes("—")
      ? pageTitleTag.split("—")[0].trim()
      : (pageTitleTag || "").trim();

  const description = (getMetaContent("description") || "").trim();

  const keywords = (getMetaContent("keywords") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (debug) {
    console.log("og:title:", getMetaContent("og:title"));
  }
  const opengraph = {
    title: getMetaContent("og:title").split("—").shift().trim(),
    image: getMetaContent("og:image"),
    type: getMetaContent("og:type"),
  };
  if (debug) {
    console.log("Final opengraph.title:", opengraph.title);
  }

  const meta = { language, title, description, keywords, opengraph };
  if (debug) {
    console.log("Final meta before return:", JSON.stringify(meta, null, 2));
  }

  // ---------- PRODUCT ----------
  const productSection = $(".product");

  const id = (productSection?.getAttribute("data-id") || "").trim();
  const name = txt($(".product h1.title"));
  const isLiked = !!$(".product .preview .like.active");

  const tags = { category: [], label: [], discount: [] };
  $$(".product .tags span").forEach((el) => {
    const t = txt(el);
    if (!t) return;
    if (el.classList.contains("green")) tags.category.push(t);
    else if (el.classList.contains("blue")) tags.label.push(t);
    else if (el.classList.contains("red")) tags.discount.push(t);
  });

  let price = 0,
    oldPrice = 0,
    currency = "";
  const priceEl = $(".product .price");
  if (priceEl) {
    const currentRaw =
      (priceEl.firstChild?.textContent || "").trim() ||
      (priceEl.textContent || "")
        .replace(priceEl.querySelector("span")?.textContent || "", "")
        .trim();

    const p = parsePrice(currentRaw);
    price = p.amount;
    currency = p.code;

    const oldRaw = (priceEl.querySelector("span")?.textContent || "").trim();
    const op = parsePrice(oldRaw);
    oldPrice = op.amount;
    if (!currency) currency = op.code || "";
  }

  const discount = oldPrice > 0 && price > 0 ? oldPrice - price : 0;
  const discountPercent =
    oldPrice > 0 && price > 0
      ? ((discount / oldPrice) * 100).toFixed(2) + "%"
      : "0.00%";

  const properties = {};
  $$(".about .properties li").forEach((li) => {
    const spans = li.querySelectorAll("span");
    if (spans.length >= 2) {
      const k = txt(spans[0]);
      const v = txt(spans[1]);
      if (k) properties[k] = v;
    }
  });

  const images = $$(".product .preview nav button")
    .map((btn) => {
      const img = btn.querySelector("img");
      if (!img) return null;
      return {
        preview: img.getAttribute("src") || "",
        full: img.getAttribute("data-src") || "",
        alt: (img.getAttribute("alt") || "").trim(),
      };
    })
    .filter(Boolean);

  let descriptionHTML = "";
  const descEl = $(".about .description");
  if (descEl) {
    descriptionHTML = stripAllAttrs(descEl.innerHTML, descEl);
    if (debug) {
      console.log("descriptionHTML:", JSON.stringify(descriptionHTML));
    }
  }

  const product = {
    id,
    name,
    isLiked,
    tags,
    price,
    oldPrice,
    discount,
    discountPercent,
    currency,
    properties,
    images,
    description: descriptionHTML,
  };

  // ---------- SUGGESTED ----------
  const suggested = $$(".suggested .items article").map((card) => {
    const name = txt(card.querySelector("h3"));
    const description = txt(card.querySelector("p"));
    const image = card.querySelector("img")?.getAttribute("src") || "";
    const priceRaw = (card.querySelector("b")?.textContent || "").trim();
    const parsed = parsePrice(priceRaw);
    if (debug) {
      console.log(
        "suggested priceRaw:",
        priceRaw,
        "parsed.amount:",
        parsed.amount,
        "typeof parsed.amount:",
        typeof parsed.amount
      );
      console.log(
        "suggested item.price:",
        parsed.amount,
        "typeof item.price:",
        typeof String(parsed.amount)
      );
    }
    const item = {
      name,
      description,
      image,
      price: String(parsed.amount),
      currency: parsed.code,
    };
    return item;
  });

  if (debug) {
    console.log(
      "Final suggested:",
      suggested.map((item) => ({ price: item.price, type: typeof item.price }))
    );
  }

  // ---------- REVIEWS ----------
  const reviews = $$(".reviews .items article").map((card) => {
    const rating = card.querySelectorAll(".rating .filled").length;
    const title = txt(card.querySelector("h3.title"));
    const description = txt(card.querySelector("p"));
    const avatar = card.querySelector(".author img")?.getAttribute("src") || "";
    const authorName = txt(card.querySelector(".author span"));
    const rawDate = (card.querySelector(".author i")?.textContent || "").trim();
    let date = rawDate;
    const m = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) date = `${m[1]}.${m[2]}.${m[3]}`;
    return {
      rating,
      author: { avatar, name: authorName },
      title,
      description,
      date,
    };
  });

  if (debug) {
    console.log(
      "Final result:",
      JSON.stringify({ meta, product, suggested, reviews }, null, 2)
    );
  }
  return { meta, product, suggested, reviews };
}

window.parsePage = parsePage;