/* ============================================================
   mini-hot · theme.js
   第 6 步：深浅模式（PRD §6.2.1，验收 M1~M9）
   策略：手动选择（localStorage 持久）> 系统偏好 > 默认浅色
   注意：<html data-theme> 的初始值由 index.html <head> 里的
        一段内联脚本在首帧渲染前设好（避免打开时闪一下），
        本文件负责按钮显示、点击切换与记忆
   ============================================================ */

const THEME_KEY = "minihot.theme";

// 当前生效的模式（从 <html> 属性读，内联脚本已保证它总是有值）
function appliedTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// 按钮显示当前状态（PRD §6.2：如「☾ 深色」/「☀ 浅色」）
function updateThemeButton() {
  const btn = document.getElementById("theme-toggle");
  btn.textContent = appliedTheme() === "dark" ? "☾ 深色" : "☀ 浅色";
}

function setupTheme() {
  updateThemeButton();

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = appliedTheme() === "dark" ? "light" : "dark";
    // 只改一个属性：CSS 变量整体切换。无重载、无白屏、
    // 不滚动回顶部、当前 Tab 与收藏视图原样保留（M2/M3）
    document.documentElement.setAttribute("data-theme", next);
    updateThemeButton();
    // 手动选择写回本机记忆（M4/M9）。写失败（隐私模式等）就安静
    // 降级为「本次生效、不记忆」，不报错不弹窗（M8）
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* 安静降级 */
    }
  });
}

window.theme = { setupTheme };
