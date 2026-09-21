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

/* ---------- 重试：重新拉取所有失败的源（E6 的「给退路」） ---------- */
function retryFailed() {
  const failed = SOURCES.filter((s) => cache[s] && cache[s].error);
  if (failed.length === 0) return;
  render.removeGlobalAlert();
  render.renderSkeleton();

  let pending = failed.length;
  failed.forEach((source) => {
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
        // 全部重试完仍全失败 → 重新渲染当前错误态（会带上提示条）
        if (pending === 0 && viewMode === "board") {
          const stillAllFailed = SOURCES.every((s) => cache[s] && cache[s].error);
          if (stillAllFailed || cache[currentSource].error) renderCurrent();
        }
      });
  });
}

/* ---------- 统一渲染当前源 ---------- */
function renderCurrent() {
  const entry = cache[currentSource];
  if (!entry) {
    render.renderSkeleton(); // 数据未到：骨架屏占位（E7）
    return;
  }
  if (entry.error) {
    // E1（单源失败）/ E6（断网）用不同文案；全部源都失败时加 E2 提示条
    const allFailed = SOURCES.every((s) => cache[s] && cache[s].error);
    render.renderSourceError({ offline: !navigator.onLine, allFailed: allFailed });
    if (allFailed) render.renderGlobalAlert();
    return;
  }
  render.removeGlobalAlert();
  render.renderMeta(entry.doc);
  render.renderList(entry.doc);
  buildItemIndex(entry.doc.items);
  displayedSource = currentSource;
}

/* ---------- Tab 切换（PRD F1.2；点 Tab 也等于离开收藏视图回到榜单） ---------- */
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const source = btn.dataset.source;
      if (!SOURCES.includes(source) || (source === currentSource && viewMode === "board")) return;

      currentSource = source;
      tabs.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
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
        }
        if (source === currentSource && viewMode === "board") {
          renderCurrent();
        }
      })
      .catch((err) => {
        cache[source] = { error: true };
        console.warn("[mini-hot] 数据获取失败:", source, err.message);
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
