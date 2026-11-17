/**
 * public/ 下的资源要跟着部署 base 走。
 *
 * 开发环境 `import.meta.env.BASE_URL` 是 `/`；
 * 构建时由 `vite.config.ts` 的 `base` 决定——GitHub Pages 项目页是
 * `https://<user>.github.io/<repo>/`，于是 BASE_URL 变成 `/<repo>/`。
 *
 * 所以模板/数据里**不要写死 `/assets/xxx.jpg`**，一律过 `assetUrl()`，
 * 否则部署后图片会去站点根目录找，404。
 */

/** 拼 base 与路径，保证中间只有一个斜杠。 */
export function joinBase(base: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, '')
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  return cleanPath === '' ? cleanBase : `${cleanBase}${cleanPath}`
}

/** 把 `/assets/xxx.jpg` 这类 public 路径转成部署后的实际地址。 */
export function assetUrl(path: string): string {
  return joinBase(import.meta.env.BASE_URL, path)
}
