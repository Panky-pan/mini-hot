/* ============================================================
   mini-hot · favorites.js
   第 5 步：收藏存储（localStorage）
   对应 PRD F3（收藏/取消/收藏列表）+ E9（存储不可用）+ E10（超上限）
   存储约定（TECH_DESIGN §4.3）：单 key 整读整写，key = minihot.favorites，
   上限 500 条，数据只存本机浏览器
   ============================================================ */

const FAV_KEY = "minihot.favorites";
const FAV_LIMIT = 500;

/* ---------- 存储可用性探测（E9） ----------
   隐私模式等场景下 localStorage 一写就抛异常。
   页面加载时探测一次，不可用则收藏按钮整个不渲染（TECH_DESIGN E9），
   看榜完全不受影响 */
let storageOk = true;
try {
  localStorage.setItem("minihot.probe", "1");
  localStorage.removeItem("minihot.probe");
} catch (e) {
  storageOk = false;
}

/* ---------- 条目稳定 ID（TECH_DESIGN §4.5） ----------
   排名每小时都变，id 不能只用 rank：
   id = <source>-<rank>-<url哈希前4位>
   同一 URL 视为同一条，再点一次 = 取消收藏（toggle 依据） */
function hashUrl(url) {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function favIdOf(item) {
  return item.source + "-" + item.rank + "-" + hashUrl(item.url).slice(0, 4);
}

/* ---------- 读写 ----------
   ⚠️ 函数名必须避开 main.js 的全局启动函数 loadAll：
   本项目零构建，所有 .js 共享全局作用域，同名函数会互相覆盖
   （2026-09-22 修：原 loadAll 被 main.js 覆盖，isFavorite 一调用就崩，
   且报错被误判成「取数失败」——改名 loadFavorites 根治） */
function loadFavorites() {
  if (!storageOk) return [];
  try {
    const arr = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return []; // 数据损坏时按空处理，不抛错给用户
  }
}

function persist(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false; // 写入失败（存储被禁用/满了），由调用方降级
  }
}

/* ---------- 收藏 / 取消收藏（toggle） ----------
   @returns {favorited: boolean, error?: "storage" | "limit"} */
function toggle(item) {
  if (!storageOk) return { favorited: false, error: "storage" };

  const id = favIdOf(item);
  const list = loadFavorites();
  const idx = list.findIndex((f) => f.id === id);

  if (idx >= 0) {
    // 已收藏 → 取消
    list.splice(idx, 1);
    return persist(list) ? { favorited: false } : { favorited: false, error: "storage" };
  }

  // 未收藏 → 收藏。超上限时拒绝本次写入但不丢旧数据（E10）
  if (list.length >= FAV_LIMIT) return { favorited: false, error: "limit" };

  list.push({
    id: id,
    title: item.title,   // 收藏时的标题快照（PRD §7.5）
    url: item.url,
    source: item.source,
    savedAt: Date.now(), // 收藏时刻，收藏列表按它倒序（新的在上）
    rank: item.rank,
    heat: item.heat,     // 排名/热度快照，帮回忆当时为什么收藏
    heatLabel: item.heatLabel,
  });
  return persist(list) ? { favorited: true } : { favorited: true, error: "storage" };
}

function isFavorite(id) {
  return loadFavorites().some((f) => f.id === id);
}

// 收藏列表：按 savedAt 倒序（PRD §6.2：新的在上）
function getAll() {
  return loadFavorites().sort((a, b) => b.savedAt - a.savedAt);
}

window.favorites = { storageOk, favIdOf, toggle, isFavorite, getAll };
