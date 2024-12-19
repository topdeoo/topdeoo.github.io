import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import expressiveClipboardScript from "./scripts/expressive-clipboard.inline"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

// 添加新的复制脚本
Body.afterDOMLoaded = expressiveClipboardScript

export default (() => Body) satisfies QuartzComponentConstructor