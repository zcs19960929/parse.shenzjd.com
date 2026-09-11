import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * 自定义 Web Component 元素类型声明
 * 让 TypeScript 识别 JSX 中使用的自定义元素（如 <site-navbar />）
 * React 19 使用 React.JSX 命名空间，需在此处扩展
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "site-navbar": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          /** 头像/登录入口：传 "false" 隐藏右上角头像 */
          avatar?: string;
          /** wx-auth-sdk 登录态接入：传 "false" 不加载 SDK、不发校验 */
          "wx-auth-enabled"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};