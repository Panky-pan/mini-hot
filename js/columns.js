/* ============================================================
   mini-hot · columns.js —— 四栏版首页（index2.html 专用）
   2026-09-22 新增。与 Tab 版（main.js / render.js）互不干扰：
   - 本文件整体包在 IIFE 里，除必要的初始化调用外不新增任何
     全局函数（零构建多脚本共享全局作用域，2026-09-22 曾因
     同名全局函数互相覆盖出过事故，此处从根上规避）
   - 复用 theme.js / api.js / favorites.js 的公开能力；
     榜单条目渲染复用 components.js（Day 8 余力加练收编，variant:"columns"）
   需求对应：
   - 四平台并列展示（>720px 两栏、≤720px 单栏），每栏一卡
   - 每源只显示前 10 条（2026-09-22 拍板）；序号在前、热度在右
   - 每栏四种状态：加载中（骨架）/ 成功（列表）/ 空 / 错误（含重试）
   - 单源失败不拖垮其他源（PRD E1）；先到先渲染（E8）
   - 收藏与 Tab 版共用同一个 localStorage key
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 常量 ---------- */
  var SOURCES = ["weibo", "baidu", "github", "bilibili"];
  var SOURCE_LABEL = { weibo: "微博", baidu: "百度", github: "GitHub", bilibili: "B站" };
  var FAV_SOURCE_CLASS = { weibo: "src-weibo", baidu: "src-baidu", github: "src-github", bilibili: "src-bilibili" };
  var LIST_TYPE_LABEL = { realtime: "实时热搜", daily24h: "24小时榜", daily: "日榜", weekly: "周榜" };
  var STALE_MS = 6 * 60 * 60 * 1000; // 超过 6 小时未更新 → 时间显示警示态（PRD E5）
  var TOP_N = 10; // 每源只显示前 10 条（2026-09-22 用户拍板，覆盖 PRD A4 的全量序号要求）
  var BACK_TOP_AFTER = 400; // 滚动超过该像素数后显示「回到顶部」按钮

  /* ---------- 运行时状态 ---------- */
  var states = {};        // source -> "loading" | "ok" | "empty" | "error"
  var docs = {};          // source -> 榜单数据（成功后缓存）
  var itemsById = {};     // favId -> 榜单条目（收藏按钮点击时反查原始条目）
  var favRecordsById = {};// favId -> 收藏记录（收藏视图里用）
  var favViewOn = false;  // 当前是否处于收藏视图
  var toastTimer = null;

  /* ---------- 格式化工具（与 Tab 版 render.js 同规则） ---------- */
  function formatHeat(n) {
    if (typeof n !== "number") return String(n);
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    return String(n);
  }
  function formatTime(iso) {
    var m = /T(\d{2}:\d{2})/.exec(iso || "");
    return m ? m[1] : "";
  }
  function formatSavedAt(ts) {
    var d = new Date(ts);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------- DOM 定位 ---------- */
  function board() { return document.getElementById("board"); }
  function cardEl(source) {
    return board().querySelector('.col-card[data-source="' + source + '"]');
  }
  function setStateBox(card, child) {
    card.querySelector('[data-role="state"]').replaceChildren(child);
  }

  /* ============================================================
     四种状态（每栏独立）
     ============================================================ */

  /* 状态一：加载中 —— 骨架占位，不用全屏遮罩（PRD E7） */
  function showSkeleton(source) {
    var card = cardEl(source);
    card.querySelector('[data-role="time"]').textContent = "";
    card.querySelector('[data-role="sub"]').textContent = "加载中…";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 6; i++) {
      var row = document.createElement("div");
      row.className = "skel-item";
      var rank = document.createElement("span");
      rank.className = "skel-rank";
      var bar = document.createElement("span");
      bar.className = i % 3 === 2 ? "skel-bar short" : "skel-bar";
      row.appendChild(rank);
      row.appendChild(bar);
      frag.appendChild(row);
    }
    setStateBox(card, frag);
  }

  /* 状态二：成功 —— 渲染榜单（序号在前、热度在右）
     Day 8 余力加练：条目 DOM 细节已收编到 components.js，
     本函数只负责调组件（variant:"columns" + 前 10 条截取）与状态切换 */
  function renderColumn(doc) {
    var card = cardEl(doc.source);
    var r = window.mhCard.rankList(doc.items, {
      variant: "columns",
      limit: TOP_N, // 只渲染前 TOP_N 条（2026-09-22 拍板）；序号仍用原始 rank
      onRegister: function (id, item) { itemsById[id] = item; }, // 收藏点击时反查
    });

    if (r.rendered === 0) { showEmpty(doc.source); return; }
    setStateBox(card, r.el);
  }

  /* 状态三：空 —— 抓到了但 0 条，不显示空白区域（PRD E3） */
  function showEmpty(source) {
    var card = cardEl(source);
    card.querySelector('[data-role="sub"]').textContent = "";
    var p = document.createElement("p");
    p.className = "state-hint";
    p.textContent = "该来源当前没有内容";
    setStateBox(card, p);
  }

  /* 状态四：错误 —— 安静降级 + 重试入口（PRD E1/E6）。
     说实话：断网（E6）和数据源问题（E1）用不同文案 */
  function showError(source, err) {
    var card = cardEl(source);
    card.querySelector('[data-role="time"]').textContent = "";
    card.querySelector('[data-role="sub"]').textContent = "";
    var offline = err instanceof TypeError; // fetch 网络层失败
    var wrap = document.createElement("div");
    wrap.className = "state-hint";
    var p = document.createElement("p");
    p.textContent = offline
      ? "加载失败，请检查网络后重试"
      : "这个来源暂时取不到数据，稍后重试";
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-btn";
    retry.dataset.source = source;
    retry.textContent = "重试";
    wrap.appendChild(p);
    wrap.appendChild(retry);
    setStateBox(card, wrap);
  }

  /* ============================================================
     数据加载：4 源独立请求，先到先渲染（PRD E8）
     ============================================================ */
  function loadOne(source) {
    states[source] = "loading";
    showSkeleton(source);
    return window.api.fetchList(source).then(function (doc) {
      if (doc.listStatus === "empty" || doc.items.length === 0) {
        states[source] = "empty";
        showEmpty(source);
        return;
      }
      states[source] = "ok";
      docs[source] = doc;
      var card = cardEl(source);
      var heatLabel = "";
      for (var i = 0; i < doc.items.length; i++) {
        if (doc.items[i].heatLabel) { heatLabel = doc.items[i].heatLabel; break; }
      }
      card.querySelector('[data-role="sub"]').textContent =
        doc.listTitle + " · " + (LIST_TYPE_LABEL[doc.listType] || "") +
        (heatLabel ? " · " + heatLabel : "") +
        (doc.items.length > TOP_N ? " · 前 " + TOP_N + " 条" : "");
      // 时效信息来自数据本身（F1.4）；超 6 小时未更新则显示警示态（E5），
      // 安静提示不弹窗（§8.5），悬停可见具体说明
      var timeEl = card.querySelector('[data-role="time"]');
      var stale = false;
      var fetchedAt = Date.parse(doc.listUpdatedAt);
      if (!isNaN(fetchedAt) && Date.now() - fetchedAt > STALE_MS) stale = true;
      timeEl.textContent = "更新于 " + formatTime(doc.listUpdatedAt) + (stale ? " ⚠" : "");
      timeEl.title = stale ? "该源数据已超过 6 小时未更新，请自行判断新鲜度" : "";
      timeEl.classList.toggle("stale", stale);
      renderColumn(doc);
    }).catch(function (err) {
      states[source] = "error";
      showError(source, err);
    }).then(function () {
      refreshTopTime();
      refreshGlobalAlert();
    });
  }

  function loadAll() {
    SOURCES.forEach(function (s) { loadOne(s); });
  }

  /* 顶部全站更新时间：取 4 源中最新的一次成功更新（ISO 字符串可直接比较） */
  function refreshTopTime() {
    var latest = "";
    for (var i = 0; i < SOURCES.length; i++) {
      var d = docs[SOURCES[i]];
      if (d && d.listUpdatedAt > latest) latest = d.listUpdatedAt;
    }
    var el = document.getElementById("update-time");
    if (latest) {
      el.textContent = "更新于 " + formatTime(latest);
    } else if (Object.keys(docs).length === 0 && allSettled()) {
      el.textContent = "数据暂时没有更新";
    }
  }

  function allSettled() {
    return SOURCES.every(function (s) { return states[s] && states[s] !== "loading"; });
  }

  /* 全部来源失败的顶部提示条（PRD E2：安静、非弹窗、非红色告警块） */
  function refreshGlobalAlert() {
    var old = document.getElementById("global-alert");
    var allError = allSettled() && SOURCES.every(function (s) { return states[s] === "error"; });
    if (allError && !old) {
      var bar = document.createElement("div");
      bar.className = "global-alert";
      bar.id = "global-alert";
      bar.textContent = "数据暂时没有更新，可能是数据源出了问题，稍后会自动恢复";
      board().parentNode.insertBefore(bar, board());
    } else if (!allError && old) {
      old.remove();
    }
  }

  /* ============================================================
     收藏（复用 favorites.js，与 Tab 版共用 localStorage）
     ============================================================ */
  /* ---------- 收藏按钮点击（榜单条目的收藏按钮由 components.js 生成，
     id→条目映射经 onRegister 回调写入 itemsById） ---------- */
  function handleFavClick(btn) {
    var id = btn.dataset.favId;
    var item = itemsById[id] || favRecordsById[id];
    if (!item) return;
    var r = window.favorites.toggle(item);
    if (r.error === "storage") { showToast("当前浏览器无法保存收藏"); return; }
    if (r.error === "limit") { showToast("收藏已达上限，先清理一些旧收藏吧"); return; }
    if (favViewOn) {
      renderFavList(); // 收藏视图里点 = 取消收藏，直接重绘列表
    } else {
      btn.setAttribute("aria-pressed", String(r.favorited));
      btn.textContent = r.favorited ? "★" : "☆";
      btn.title = r.favorited ? "取消收藏" : "收藏";
      btn.setAttribute("aria-label", r.favorited ? "取消收藏" : "收藏");
    }
  }

  /* ---------- 收藏视图 ---------- */
  function openFavView() {
    favViewOn = true;
    board().hidden = true;
    document.getElementById("fav-area").hidden = false;
    document.getElementById("favorites-toggle").setAttribute("aria-pressed", "true");
    renderFavList();
  }

  function closeFavView() {
    favViewOn = false;
    board().hidden = false;
    document.getElementById("fav-area").hidden = true;
    document.getElementById("favorites-toggle").setAttribute("aria-pressed", "false");
  }

  function renderFavList() {
    var list = window.favorites.getAll(); // savedAt 倒序：新的在上（PRD §6.2）
    favRecordsById = {};
    var area = document.getElementById("fav-list");
    document.getElementById("fav-meta").textContent =
      "我的收藏 · 共 " + list.length + " 条 · 仅保存在本机浏览器";

    if (list.length === 0) {
      // 空状态：友好文案 + 回四栏入口（PRD B6）
      var wrap = document.createElement("div");
      wrap.className = "state-hint";
      var p = document.createElement("p");
      p.textContent = "还没有收藏，去榜单里挑几条吧";
      var back = document.createElement("button");
      back.type = "button";
      back.className = "empty-action";
      back.id = "back-to-fav";
      back.textContent = "回到榜单";
      wrap.appendChild(p);
      wrap.appendChild(back);
      area.replaceChildren(wrap);
      return;
    }

    var ol = document.createElement("ol");
    ol.className = "list";
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      favRecordsById[f.id] = f;
      var li = document.createElement("li");
      li.className = "item";

      // 来源标识：收藏是跨源混合的，必须一眼看出来自哪（PRD F3.3）
      var src = document.createElement("span");
      src.className = "fav-source " + (FAV_SOURCE_CLASS[f.source] || "");
      src.textContent = SOURCE_LABEL[f.source] || f.source;

      var body = document.createElement("div");
      body.className = "item-body";
      var link = document.createElement("a");
      link.className = "item-title";
      link.href = f.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = f.title;
      body.appendChild(link);
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = "收藏于 " + formatSavedAt(f.savedAt) +
        (f.heat != null ? " · 当时" + formatHeat(f.heat) + " " + (f.heatLabel || "") : "");
      body.appendChild(meta);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "item-fav";
      btn.dataset.favId = f.id;
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "已收藏";

      li.appendChild(src);
      li.appendChild(body);
      li.appendChild(btn);
      ol.appendChild(li);
    }
    area.replaceChildren(ol);
  }

  /* ---------- 轻提示（E9/E10：底部浮出自动消失，非弹窗） ---------- */
  function showToast(msg) {
    var el = document.getElementById("minihot-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.id = "minihot-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  /* ---------- 事件委托：收藏按钮 / 重试 / 回榜单（列表会重绘，委托最稳） ---------- */
  document.addEventListener("click", function (e) {
    var fav = e.target.closest(".item-fav");
    if (fav) { handleFavClick(fav); return; }

    var retry = e.target.closest(".retry-btn");
    if (retry && retry.dataset.source) { loadOne(retry.dataset.source); return; }

    if (e.target.closest("#back-to-fav")) { closeFavView(); }
  });

  /* ---------- 回到顶部（2026-09-22 用户要求） ----------
     滚动超过一屏高度才出现，点击回顶；默认行为安静、无动画干扰 */
  var backTopBtn = document.getElementById("back-top");
  window.addEventListener("scroll", function () {
    backTopBtn.hidden = window.scrollY < BACK_TOP_AFTER;
  }, { passive: true });
  backTopBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- 初始化 ---------- */
  window.theme.setupTheme();
  document.getElementById("favorites-toggle").addEventListener("click", function () {
    favViewOn ? closeFavView() : openFavView();
  });
  loadAll();
})();
