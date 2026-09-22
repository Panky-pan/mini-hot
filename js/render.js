/* ============================================================
   mini-hot · render.js
   第 5 步：渲染（榜单列表 + 收藏列表 + 收藏按钮）
   纪律（TECH_DESIGN §6.3）：
   - 所有外部文本只经 textContent 写入，禁止 innerHTML 拼接（防 XSS）
   - 长标题截断用 CSS（-webkit-line-clamp: 2），不用 JS 算字数
   ============================================================ */

// 榜单时间窗口的中文说明（PRD F1.4）
const LIST_TYPE_LABEL = {
  realtime: "实时热搜",
  daily24h: "24小时榜",
  daily: "日榜",
  weekly: "周榜",
};

// 来源中文名（收藏列表必须显示来源，PRD F3.3）
const SOURCE_LABEL = {
  weibo: "微博",
  baidu: "百度",
  github: "GitHub",
  bilibili: "B站",
};
// 与 base.css 中 --source-xxx 变量对应的样式类
const SOURCE_CLASS = {
  weibo: "src-weibo",
  baidu: "src-baidu",
  github: "src-github",
  bilibili: "src-bilibili",
};

// 热度值显示格式化：同源内部格式化，不做跨源换算（PRD §7.3）
function formatHeat(n) {
  if (typeof n !== "number") return String(n);
  if (n >= 10000) {
    return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
  }
  return String(n);
}

function formatTime(iso) {
  const m = /T(\d{2}:\d{2})/.exec(iso || "");
  return m ? m[1] : "";
}

// 收藏时刻 → 「09-21 20:45」
function formatSavedAt(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return (
    p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " +
    p(d.getHours()) + ":" + p(d.getMinutes())
  );
}

/* ---------- 时效说明行 ---------- */
function renderMeta(doc) {
  const el = document.getElementById("meta-line");
  const type = LIST_TYPE_LABEL[doc.listType] || "";
  el.textContent = doc.listTitle + " · 更新于 " + formatTime(doc.listUpdatedAt) + " · " + type;
}

/* 加载中 / 失败时的时效行：必须显示「当前源」，否则会残留上一个源的标题，
   与 Tab 高亮、列表区状态自相矛盾（2026-09-22 修） */
function renderMetaState(source, text) {
  document.getElementById("meta-line").textContent =
    (SOURCE_LABEL[source] || source) + " · " + text;
}

// 收藏视图的时效行位置显示收藏摘要（PRD §7.5：需说明收藏保存在本机）
function renderFavoritesMeta(count) {
  document.getElementById("meta-line").textContent =
    "我的收藏 · 共 " + count + " 条 · 仅保存在本机浏览器";
}

/* ---------- 收藏按钮（榜单条目右侧） ---------- */
function buildFavButton(item) {
  if (!window.favorites || !window.favorites.storageOk) return null; // E9：存储不可用则不渲染
  const id = window.favorites.favIdOf(item);
  const faved = window.favorites.isFavorite(id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "item-fav";
  btn.dataset.favId = id;
  btn.setAttribute("aria-pressed", String(faved));
  btn.textContent = faved ? "已收藏" : "收藏";
  return btn;
}

/* ---------- 榜单列表 ---------- */
function renderList(doc) {
  const area = document.getElementById("list-area");
  const ol = document.createElement("ol");
  ol.className = "list";

  for (const it of doc.items) {
    // 条目五要素不齐的不渲染（PRD E4：宁可少一条，不可死链）
    if (!it.title || !it.url || typeof it.rank !== "number") continue;

    const li = document.createElement("li");
    li.className = "item";

    const rank = document.createElement("span");
    rank.className = "item-rank";
    rank.textContent = String(it.rank);

    const body = document.createElement("div");
    body.className = "item-body";

    const link = document.createElement("a");
    link.className = "item-title";
    link.href = it.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = it.title;
    body.appendChild(link);

    const meta = document.createElement("div");
    meta.className = "item-meta";
    const parts = [];
    if (it.heat != null) parts.push(formatHeat(it.heat) + " " + (it.heatLabel || ""));
    if (it.extra && it.extra.lang) parts.push(it.extra.lang);
    if (it.extra && it.extra.up) parts.push(it.extra.up);
    meta.textContent = parts.join(" · ");

    if (Array.isArray(it.tags)) {
      for (const t of it.tags) {
        const tag = document.createElement("span");
        tag.className = "item-tag";
        tag.textContent = t;
        meta.appendChild(tag);
      }
    }
    body.appendChild(meta);

    li.appendChild(rank);
    li.appendChild(body);
    const favBtn = buildFavButton(it);
    if (favBtn) li.appendChild(favBtn);
    ol.appendChild(li);
  }

  if (ol.children.length === 0) {
    renderSourceEmpty();
    return;
  }
  const frag = document.createDocumentFragment();
  frag.appendChild(ol);
  area.replaceChildren(frag);
}

/* ---------- 收藏列表视图（PRD F3.3） ----------
   每条显示来源标识 + 标题 + 收藏时刻；新的在上（排序由 favorites.getAll 完成） */
function renderFavorites(list) {
  const area = document.getElementById("list-area");

  if (list.length === 0) {
    // 空状态：友好文案 + 回榜单入口（PRD B6）
    const wrap = document.createElement("div");
    wrap.className = "state-hint";
    const p = document.createElement("p");
    p.textContent = "还没有收藏，去榜单里挑几条吧";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "empty-action";
    back.id = "back-to-board";
    back.textContent = "回到榜单";
    wrap.appendChild(p);
    wrap.appendChild(back);
    area.replaceChildren(wrap);
    return;
  }

  const ol = document.createElement("ol");
  ol.className = "list";

  for (const f of list) {
    const li = document.createElement("li");
    li.className = "item";

    // 来源标识（带色点）：收藏是跨源混合的，必须一眼看出来自哪（PRD F3.3）
    const src = document.createElement("span");
    src.className = "fav-source " + (SOURCE_CLASS[f.source] || "");
    src.textContent = SOURCE_LABEL[f.source] || f.source;

    const body = document.createElement("div");
    body.className = "item-body";

    const link = document.createElement("a");
    link.className = "item-title";
    link.href = f.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = f.title;
    body.appendChild(link);

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = "收藏于 " + formatSavedAt(f.savedAt) +
      (f.heat != null ? " · 当时" + formatHeat(f.heat) + " " + (f.heatLabel || "") : "");
    body.appendChild(meta);

    li.appendChild(src);
    li.appendChild(body);

    // 收藏视图里再点一次 = 取消收藏（与榜单内交互一致，PRD §6.2）
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-fav";
    btn.dataset.favId = f.id;
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "已收藏";
    li.appendChild(btn);

    ol.appendChild(li);
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(ol);
  area.replaceChildren(frag);
}

/* ---------- 空态（榜单 0 条，PRD E3） ---------- */
function renderSourceEmpty() {
  const area = document.getElementById("list-area");
  const p = document.createElement("p");
  p.className = "state-hint";
  p.textContent = "该来源当前没有内容，可以切换其他来源看看";
  area.replaceChildren(p);
}

/* ---------- 单源失败态（PRD E1/E6：安静降级 + 给退路——重试入口） ---------- */
function renderSourceError(opts) {
  opts = opts || {};
  const area = document.getElementById("list-area");
  const wrap = document.createElement("div");
  wrap.className = "state-hint";
  const p = document.createElement("p");
  // 说实话（PRD §8.5）：断网（E6）和数据源问题（E1）用不同文案
  p.textContent = opts.offline
    ? "加载失败，请检查网络后重试"
    : "这个来源暂时取不到数据，稍后重试。可以先看看其他来源。";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "retry-btn";
  retry.dataset.action = "retry";
  retry.textContent = "重试";
  wrap.appendChild(p);
  wrap.appendChild(retry);
  area.replaceChildren(wrap);
}

/* ---------- 全部来源失败的顶部提示条（PRD E2：非弹窗、不刺眼） ---------- */
function renderGlobalAlert() {
  removeGlobalAlert();
  const bar = document.createElement("div");
  bar.className = "global-alert";
  bar.id = "global-alert";
  bar.textContent = "数据暂时没有更新，可能是数据源出了问题，稍后会自动恢复";
  const page = document.querySelector(".page");
  page.insertBefore(bar, page.firstChild);
}

function removeGlobalAlert() {
  const el = document.getElementById("global-alert");
  if (el) el.remove();
}

/* ---------- 骨架屏（PRD E7） ---------- */
function renderSkeleton() {
  const area = document.getElementById("list-area");
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 10; i++) {
    const row = document.createElement("div");
    row.className = "skel-item";
    const rank = document.createElement("span");
    rank.className = "skel-rank";
    const bar = document.createElement("span");
    bar.className = i % 3 === 2 ? "skel-bar short" : "skel-bar";
    row.appendChild(rank);
    row.appendChild(bar);
    frag.appendChild(row);
  }
  area.replaceChildren(frag);
}

window.render = {
  renderMeta,
  renderMetaState,
  renderFavoritesMeta,
  renderList,
  renderFavorites,
  renderSourceEmpty,
  renderSourceError,
  renderGlobalAlert,
  removeGlobalAlert,
  renderSkeleton,
};
