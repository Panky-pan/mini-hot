/* ============================================================
   mini-hot · api.js
   第 3 步：数据获取
   职责：fetch 静态 JSON + 超时控制（对应 PRD E7：8 秒超时）
   说明：数据文件路径必须用相对路径 ./data/...，
        GitHub Pages 是子路径部署（TECH_DESIGN §5.2/§10.2）
   ============================================================ */

// 单源超时：8 秒（TECH_DESIGN §6.1）。超时后视为该源失败，
// 不影响其他源（PRD E1：单源失败不拖垮全站）
const FETCH_TIMEOUT_MS = 8000;

/**
 * 拉取一个来源的榜单数据
 * @param {string} source - 来源标识：weibo | baidu | github | bilibili
 * @returns {Promise<object>} 符合 TECH_DESIGN §4.1 结构的榜单对象
 * @throws {Error} 网络失败 / 超时 / 数据结构异常时抛错，由调用方决定降级表现
 */
async function fetchList(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("./data/" + source + ".json", {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const doc = await res.json();

    // 最小结构校验：不是合法榜单就当作「取不到数据」处理，
    // 宁可显示失败提示，也不渲染残缺内容（PRD E4 精神的读取侧版本）
    const valid =
      doc &&
      typeof doc.listTitle === "string" &&
      typeof doc.listUpdatedAt === "string" &&
      (doc.listStatus === "ok" || doc.listStatus === "empty") &&
      Array.isArray(doc.items);
    if (!valid) {
      throw new Error("数据结构异常");
    }
    return doc;
  } finally {
    clearTimeout(timer);
  }
}

// 挂到全局（本项目零构建、无模块系统，脚本按顺序加载后互相通过全局对象协作）
window.api = { fetchList };
