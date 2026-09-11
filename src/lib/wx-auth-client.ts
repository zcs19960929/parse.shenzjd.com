/**
 * wx-auth 客户端接入（UMD 全局单例，与 panhub 同款策略）
 *
 * - 站点已改为免登录使用，本模块当前无人调用（解析弹窗已下线，见
 *   VideoParserForm.tsx 注释）；文件保留供恢复登录时复用
 * - 本模块不装 npm 依赖，SDK 发版站点零改动；仅在 window.WxAuth 未就绪时
 *   兜底注入同一 URL 的 script（id 去重，保证全站只有这一份实例）
 * - 服务端 api-middleware 的微信认证门禁同步下线，恢复时两处一起还原
 */

const SDK_URL = "https://unpkg.com/wx-auth-sdk/dist/wx-auth.umd.js";
const SCRIPT_ID = "wx-auth-sdk-umd";
const LOAD_TIMEOUT_MS = 10000;

interface WxAuthGlobalApi {
  requireAuth(): Promise<boolean>;
}

declare global {
  interface Window {
    WxAuth?: WxAuthGlobalApi;
  }
}

let readyPromise: Promise<WxAuthGlobalApi | null> | null = null;

/** 等待 window.WxAuth 就绪；未就绪则兜底注入 script（幂等，id 去重） */
function waitForWxAuth(): Promise<WxAuthGlobalApi | null> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve) => {
    if (window.WxAuth) {
      resolve(window.WxAuth);
      return;
    }

    // 兜底加载（正常情况下 layout 的 <script defer> 已在加载中）
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SDK_URL;
      document.head.appendChild(script);
    }

    const startedAt = Date.now();
    const poll = () => {
      if (window.WxAuth) {
        resolve(window.WxAuth);
        return;
      }
      if (Date.now() - startedAt > LOAD_TIMEOUT_MS) {
        console.warn("[wx-auth] SDK 加载超时，本次解析中断");
        resolve(null);
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  });

  return readyPromise;
}

/**
 * 弹出微信公众号登录弹窗（每次发起解析都弹出），验证通过后才继续解析
 * @returns true=验证通过, false=失败/关闭/超时（上层应中断解析）
 */
export async function showWxAuth(): Promise<boolean> {
  try {
    const sdk = await waitForWxAuth();
    if (!sdk) return false;
    return await sdk.requireAuth();
  } catch {
    return false;
  }
}
