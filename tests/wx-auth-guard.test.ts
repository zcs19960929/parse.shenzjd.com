// 解析接口认证门禁测试
// 认证门禁已下线（站点免登录使用）：任何凭证状态下解析都应正常放行。
// 文件保留，用于回归验证「门禁下线后凭证/伪造头不影响解析主流程」。
// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiHandler } from "@/lib/api-middleware";
import * as apiUtils from "@/lib/api-utils";

describe("解析接口认证门禁（已下线，免登录放行）", () => {
  const originalFetch = global.fetch;
  const originalVITEST = process.env.VITEST;

  beforeEach(() => {
    vi.restoreAllMocks();
    // 关闭 VITEST 豁免（认证门禁已注释，此环境变量当前无生效点）
    delete process.env.VITEST;
    vi.spyOn(apiUtils, "rateLimit").mockReturnValue(true);
    vi.spyOn(apiUtils, "isValidUrl").mockReturnValue(true);
    vi.spyOn(apiUtils, "sanitizeUrl").mockImplementation((url) => url);
    vi.spyOn(apiUtils, "getClientIP").mockReturnValue("203.0.113.42");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalVITEST === undefined) delete process.env.VITEST;
    else process.env.VITEST = originalVITEST;
  });

  it("无认证 Cookie 时解析正常放行（不再 401）", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request(
        "http://127.0.0.1/api/parse?url=https://v.douyin.com/gnrPF7GJYkY/"
      )
    );
    expect(res.status).toBe(200);
    expect(parseSpy).toHaveBeenCalledTimes(1);
    // 门禁下线后不应发起任何认证 check 请求
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("携带无效 token Cookie 时同样放行解析", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 })
    );
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request(
        "http://127.0.0.1/api/parse?url=https://v.douyin.com/badtoken1/",
        { headers: { cookie: "wxauth-token=bad.token.xyz" } }
      )
    );
    expect(res.status).toBe(200);
    expect(parseSpy).toHaveBeenCalledTimes(1);
  });

  it("Authorization: Bearer 头存在时不再校验，直接放行", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request(
        "http://127.0.0.1/api/parse?url=https://v.douyin.com/gnrPF7GJYkY/bearer1/",
        { headers: { authorization: "Bearer mp.valid.token.abc" } }
      )
    );
    expect(res.status).toBe(200);
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("非 Bearer scheme 的 Authorization 头不影响解析", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request(
        "http://127.0.0.1/api/parse?url=https://v.douyin.com/nonscheme1/",
        { headers: { authorization: "Basic dXNlcjpwYXNz" } }
      )
    );
    expect(res.status).toBe(200);
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("x-parse-internal 头无任何特殊作用（伪造头不会绕过/影响任何逻辑）", async () => {
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request("http://127.0.0.1/api/parse?url=https://v.douyin.com/zzz/", {
        headers: { "x-parse-internal": "1" },
      })
    );
    // 与普通请求行为一致：正常解析（该 URL 解析器返回失败也只体现为 400 业务失败）
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect([200, 400]).toContain(res.status);
  });

  it("非解析类路由（route=test）不受影响", async () => {
    const parseSpy = vi.fn().mockResolvedValue({ code: 200, msg: "ok" });
    const handler = createApiHandler(parseSpy);
    const res = await handler(
      new Request("http://127.0.0.1/api/test?url=https://example.com/video")
    );
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });
});
