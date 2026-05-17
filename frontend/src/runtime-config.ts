declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { enableLandingPage?: boolean };
  }
}

/** 是否展示根路径 `/` 的产品首页。由 `public/runtime-config.js`（或 Docker 启动时写入）注入。 */
export function isLandingPageEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.__RUNTIME_CONFIG__?.enableLandingPage !== false;
}
