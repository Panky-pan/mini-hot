/* ============================================================
   mini-hot · main.js
   第 6 步：入口 —— 数据加载 + Tab 切换 + 收藏 + 主题
   模块协作：theme.js / api.js / favorites.js / render.js → 本文件（编排）
   ============================================================ */

const SOURCES = ["weibo", "baidu", "github", "bilibili"];
const DEFAULT_SOURCE = "weibo";

// 内存缓存：4 份榜单 JSON 打开页面时一次性拉回来，
// 切 Tab 直接读缓存、不发新请求（TECH_DESIGN §6.2）
const cache = {}; // source -> { doc } 或 { error: true }

let currentSource = DEFAULT_SOURCE; // 用户当前想看的源（Tab 决定）
let displayedSource = null;         // 实际已上屏的源（null = 还没有任何源渲染过）
let viewMode = "board";             // 视图模式：board 榜单 | fav 收藏列表

// 当前屏幕上可见条目的索引：favId -> 条目数据
// （收藏按钮点击时凭 id 找回完整条目，用于快照入库）
let itemIndex = {};

function buildItemIndex(items) {
  itemIndex = {};
  if (!items) return;
  for (const it of items) itemIndex[favorites.favIdOf(it)] = it;
}

/* ---------- 视图切换 ---------- */
function showBoardView() {
  viewMode = "board";
  document.getElementById("favorites-toggle").setAttribute("aria-pressed", "false");
  renderCurrent();
}

function showFavoritesView() {
  viewMode = "fav";
  document.getElementById("favorites-toggle").setAttribute("aria-pressed", "true");
  const list = favorites.getAll();
  render.renderFavoritesMeta(list.length);
  render.renderFavorites(list);
  buildItemIndex(list);
}

/* ---------- 轻提示（PRD E9/E10：不打断阅读，非弹窗非 alert） ---------- */
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

/* ---------- 收藏按钮 / 重试按钮点击（事件委托，榜单与收藏视图共用） ---------- */
function setupListClicks() {
  document.getElementById("list-area").addEventListener("click", (e) => {
    // 空状态里的「回到榜单」按钮
    const backBtn = e.target.closest("#back-to-board");
    if (backBtn) {
      showBoardView();
      return;
    }

    // 失败态里的「重试」按钮（E6/E1 的退路）：重新拉取所有失败的源
    const retryBtn = e.target.closest("[data-action='retry']");
    if (retryBtn) {
      retryFailed();
      return;
    }

    const btn = e.target.closest(".item-fav");
    if (!btn) return;
    const item = itemIndex[btn.dataset.favId];
    if (!item) return;

    const result = favorites.toggle(item);
    if (result.error === "storage") {
      showToast("当前浏览器无法保存收藏"); // E9：降级不影响看榜
      return;
    }
    if (result.error === "limit") {
      showToast("收藏已达上限（500 条），请先清理部分旧收藏"); // E10
      return;
    }

    if (viewMode === "fav") {
      // 收藏视图里取消后重渲染列表（该条消失，排序保持新的在上）
      showFavoritesView();
    } else {
      // 榜单里只更新这一个按钮，不重刷整列表
      btn.setAttribute("aria-pressed", String(result.favorited));
      btn.textContent = result.favorited ? "已收藏" : "收藏";
    }
  });
}

/* ---------- 重试：重新拉取指定源（E6 的「给退路」） ----------
   两个入口：「重试」按钮（所有失败的源）、再点一次出错源的 Tab（2026-09-22 修：
   原先点已选中的 Tab 会被守卫直接忽略，用户看起来就是「点了没反应」） */
function retrySources(list) {
  if (list.length === 0) return;
  render.removeGlobalAlert();

  // 当前正在看的源在重试名单里 → 先给骨架屏反馈，别让用户觉得又没反应
  if (viewMode === "board" && list.includes(currentSource)) {
    render.renderSkeleton();
    render.renderMetaState(currentSource, "正在重试…");
  }

  let pending = list.length;
  list.forEach((source) => {
    api
      .fetchList(source)
      .then((doc) => {
        cache[source] = { doc };
        if (source === currentSource && viewMode === "board") renderCurrent();
      })
      .catch(() => {
        cache[source] = { error: true };
      })
      .finally(() => {
        pending--;
        // 重试全部结束：当前源仍失败 → 重绘错误态（全部失败会带上提示条）
        if (pending === 0 && viewMode === "board") {
          const stillAllFailed = SOURCES.every((s) => cache[s] && cache[s].error);
          if (stillAllFailed || cache[currentSource].error) renderCurrent();
          else render.removeGlobalAlert();
        }
      });
  });
}

function retryFailed() {
  retrySources(SOURCES.filter((s) => cache[s] && cache[s].error));
}

/* ---------- 统一渲染当前源 ---------- */
function renderCurrent() {
  const entry = cache[currentSource];
  if (!entry) {
    render.renderSkeleton(); // 数据未到：骨架屏占位（E7）
    render.renderMetaState(currentSource, "正在加载…");
    return;
  }
  if (entry.error) {
    // E1（单源失败）/ E6（断网）用不同文案；全部源都失败时加 E2 提示条
    const allFailed = SOURCES.every((s) => cache[s] && cache[s].error);
    render.renderSourceError({ offline: !navigator.onLine, allFailed: allFailed });
    render.renderMetaState(currentSource, "暂时无法显示");
    if (allFailed) render.renderGlobalAlert();
    return;
  }
  render.removeGlobalAlert();
  render.renderMeta(entry.doc);
  render.renderList(entry.doc);
  buildItemIndex(entry.doc.items);
  displayedSource = currentSource;
}

/* ---------- Tab 选中态同步 ----------
   两种触发场景：用户点 Tab、程序自己换展示源（E8 先到先渲染）。
   只改高亮的写法曾导致「微博高亮着、内容却是百度」（2026-09-22 修） */
function setActiveTab(source) {
  document.querySelectorAll(".tab").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.source === source));
  });
}

/* ---------- Tab 切换（PRD F1.2；点 Tab 也等于离开收藏视图回到榜单） ---------- */
function setupTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const source = btn.dataset.source;
      if (!SOURCES.includes(source)) return;

      if (source === currentSource && viewMode === "board") {
        // 再点一次已选中的 Tab：正常情况下不做事（避免白重绘），
        // 但该源处于失败态时视为「重试」（2026-09-22 修）
        if (cache[source] && cache[source].error) retrySources([source]);
        return;
      }

      currentSource = source;
      setActiveTab(source);
      showBoardView();
    });
  });
}

/* ---------- 收藏入口（PRD §6.2：与 Tab 同层级，点击切换视图） ---------- */
function setupFavoritesToggle() {
  document.getElementById("favorites-toggle").addEventListener("click", () => {
    if (viewMode === "fav") {
      showBoardView(); // 再点一次回到榜单
    } else {
      showFavoritesView();
    }
  });
}

/* ---------- 启动加载 ---------- */
function loadAll() {
  theme.setupTheme(); // 深浅模式：按钮显示 + 点击切换 + 本机记忆（第 6 步）
  render.renderSkeleton();
  setupTabs();
  setupFavoritesToggle();
  setupListClicks();

  let pending = SOURCES.length;

  SOURCES.forEach((source) => {
    api
      .fetchList(source)
      .then((doc) => {
        cache[source] = { doc };
        console.log("[mini-hot] 数据就绪:", source, doc.itemCount + " 条");
        // 先到先渲染（E8）：用户尚未选择时，第一个成功的源当默认展示源
        if (displayedSource === null && currentSource === DEFAULT_SOURCE && viewMode === "board") {
          currentSource = source;
          setActiveTab(source); // Tab 高亮跟着走，不能只换内容
        }
        if (source === currentSource && viewMode === "board") {
          renderCurrent();
        }
      })
      .catch((err) => {
        cache[source] = { error: true };
        console.warn("[mini-hot] 数据获取失败:", source, err.message, "\n", err.stack);
        if (source === currentSource && viewMode === "board") {
          renderCurrent();
        }
      })
      .finally(() => {
        pending--;
        if (pending === 0 && displayedSource === null && viewMode === "board") {
          renderCurrent();
        }
      });
  });
}

loadAll();
