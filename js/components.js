/* ============================================================
   mini-hot · components.js —— 可复用榜单条目组件（Day 8 余力加练）
   2026-09-22 新增。解决的问题是：Tab 版（render.js）和双栏版
   （columns.js）各自手写了一份「榜单条目」的 DOM 拼装，结构
   90% 相同，改一处要记两处。本文件把条目渲染收编成组件。

   设计（零构建环境下的取舍）：
   - 整体包在 IIFE 里，只暴露 window.mhCard 一个全局命名空间，
     不与其他脚本的全局函数撞名（2026-09-22 同名覆盖事故的教训）
   - 两版页面的差异全部收进「变体（variant）」配置，而不是写死：
     ┌──────────┬─────────────────────┬─────────────────────┐
     │          │ tab（Tab 版）        │ columns（双栏版）    │
     ├──────────┼─────────────────────┼─────────────────────┤
     │ 类名前缀  │ item-*              │ col-*               │
     │ 热度位置  │ 混在 meta 文本里     │ 独立元素靠右         │
     │ 收藏按钮  │ 文字「收藏/已收藏」   │ 星形 ☆/★ + 悬停说明  │
     └──────────┴─────────────────────┴─────────────────────┘
   - 铁律沿用 render.js（TECH_DESIGN §6.3）：
     所有外部文本只经 textContent 写入，禁止 innerHTML 拼接（防 XSS）；
     条目五要素（rank/title/url/…）不齐的不渲染，宁可少一条不可死链（E4）
   - 收藏按钮依赖 favorites.js：存储不可用时整个不渲染（E9）；
     调用方通过 opts.onRegister(id, item) 维护自己的 id→条目映射

   对外接口：
   - mhCard.itemCard(item, opts) → 返回一个 <li>（单条）
   - mhCard.rankList(items, opts) → 返回 { el: <ol>, rendered: n }
     （opts.limit 可截取前 N 条；rendered 为 0 时由调用方处理空态）
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 变体配置：两版页面的全部差异都在这里 ---------- */
  var VARIANTS = {
    tab: {
      list: "list",
      li: "item",
      rank: "item-rank",
      body: "item-body",
      title: "item-title",
      meta: "item-meta",
      heatInMeta: true,  // 热度混进 meta 文本（「342万 热搜指数」）
      metaAlways: true,  // 空容器也追加（维持 Tab 版现状：.item-meta 有 3px 上边距）
      fav: "text",       // 文字按钮
    },
    columns: {
      list: "col-list",
      li: "col-item",
      rank: "col-rank",
      body: "col-body",
      title: "col-title",
      meta: "col-meta",
      heat: "col-heat",
      heatInMeta: false, // 热度独立元素放右侧（序号在前、热度在右）
      metaAlways: false, // 空容器不追加
      fav: "star",       // 星形按钮
    },
  };

  /* ---------- 收藏按钮（两种样式） ---------- */
  function buildFavBtn(item, style) {
    var id = window.favorites.favIdOf(item);
    var faved = window.favorites.isFavorite(id);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-fav";
    btn.dataset.favId = id;
    btn.setAttribute("aria-pressed", String(faved));
    if (style === "star") {
      btn.textContent = faved ? "★" : "☆";
      btn.title = faved ? "取消收藏" : "收藏";
      btn.setAttribute("aria-label", faved ? "取消收藏" : "收藏");
    } else {
      btn.textContent = faved ? "已收藏" : "收藏";
    }
    return btn;
  }

  /* ---------- 单条卡片 ----------
     @param item  榜单条目 { rank, title, url, heat, heatLabel, extra, tags }
     @param opts  { variant: "tab"|"columns", limit?, onRegister?(id, item) } */
  function itemCard(item, opts) {
    var v = VARIANTS[opts.variant] || VARIANTS.tab;

    var li = document.createElement("li");
    li.className = v.li;

    // 序号在前
    var rank = document.createElement("span");
    rank.className = v.rank;
    rank.textContent = String(item.rank);
    li.appendChild(rank);

    // 标题（新窗口打开，noopener 防钓鱼）
    var body = document.createElement("div");
    body.className = v.body;
    var link = document.createElement("a");
    link.className = v.title;
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.title;
    body.appendChild(link);

    // meta 行：热度（tab 变体）+ 特色字段 + 标签
    var meta = document.createElement("div");
    meta.className = v.meta;
    var parts = [];
    if (v.heatInMeta && item.heat != null) {
      parts.push(formatHeat(item.heat) + " " + (item.heatLabel || ""));
    }
    if (item.extra && item.extra.lang) parts.push(item.extra.lang);
    if (item.extra && item.extra.up) parts.push(item.extra.up);
    if (parts.length) meta.textContent = parts.join(" · ");
    if (Array.isArray(item.tags)) {
      for (var t = 0; t < item.tags.length; t++) {
        var tag = document.createElement("span");
        tag.className = "item-tag"; // 两版共用同一个标签样式
        tag.textContent = item.tags[t];
        meta.appendChild(tag);
      }
    }
    if (v.metaAlways || meta.childNodes.length) body.appendChild(meta);
    li.appendChild(body);

    // 热度在右（columns 变体；口径在栏副标题标明，不跨源比较——PRD §7.2）
    if (!v.heatInMeta && item.heat != null) {
      var heat = document.createElement("span");
      heat.className = v.heat;
      heat.textContent = formatHeat(item.heat);
      li.appendChild(heat);
    }

    // 收藏按钮：存储不可用则整个不渲染（PRD E9，看榜不受影响）
    if (window.favorites && window.favorites.storageOk) {
      if (opts.onRegister) opts.onRegister(window.favorites.favIdOf(item), item);
      li.appendChild(buildFavBtn(item, v.fav));
    }

    return li;
  }

  /* ---------- 整张榜单 ----------
     @returns { el: <ol>, rendered: 实际渲染条数 }（0 时调用方处理空态） */
  function rankList(items, opts) {
    opts = opts || {};
    var v = VARIANTS[opts.variant] || VARIANTS.tab;
    var limit = typeof opts.limit === "number" ? opts.limit : Infinity;

    var ol = document.createElement("ol");
    ol.className = v.list;

    var rendered = 0;
    for (var i = 0; i < items.length && rendered < limit; i++) {
      var it = items[i];
      // 五要素不齐的不渲染：宁可少一条，不可死链（PRD E4）
      if (!it.title || !it.url || typeof it.rank !== "number") continue;
      ol.appendChild(itemCard(it, opts));
      rendered++;
    }
    return { el: ol, rendered: rendered };
  }

  /* ---------- 热度格式化（与 render.js 同规则：同源内部格式化，不跨源换算 §7.3） ---------- */
  function formatHeat(n) {
    if (typeof n !== "number") return String(n);
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    return String(n);
  }

  window.mhCard = { itemCard: itemCard, rankList: rankList };
})();
