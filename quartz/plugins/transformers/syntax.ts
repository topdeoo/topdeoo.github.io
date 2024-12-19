import { QuartzTransformerPlugin } from "../types"
import rehypeExpressiveCode, {
  ExpressiveCodePlugin,
  PluginFramesOptions,
  RehypeExpressiveCodeOptions,
  ThemeObjectOrShikiThemeName
} from "rehype-expressive-code"
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'
import { visit } from "unist-util-visit"
import { Element } from "hast"

interface Options extends Partial<RehypeExpressiveCodeOptions> {
  themes?: ThemeObjectOrShikiThemeName[]
  plugins?: ExpressiveCodePlugin[]
  styleOverrides?: {}
  frames?: boolean | PluginFramesOptions
  textMarkers?: boolean
  minSyntaxHighlightingColorContrast?: number
  useThemedScrollbars?: boolean
  useThemedSelectionColors?: boolean
  useDarkModeMediaQuery?: boolean
}

const defaultOptions: Options = {
  themes: [
    "github-light",
    "tokyo-night"
  ],
  plugins: [
    pluginLineNumbers(),
    pluginCollapsibleSections(),
  ],
  styleOverrides: {
    collapsibleSections: {
      collapsePreserveIndent: true,
      closedPaddingBlock: '0',
      closedLineHeight: '3rem',
      closedFontFamily: 'inherit',
      closedTextColor: 'inherit',
      closedBackgroundColor: 'var(--lightgray)'
    },
    // codePaddingInline: "1rem"
  },
  tabWidth: 2,
  textMarkers: true,
  minSyntaxHighlightingColorContrast: 5.5,
  useThemedScrollbars: true,
  useThemedSelectionColors: true,
  useDarkModeMediaQuery: true,
  frames: {}
}

export const SyntaxHighlighting: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = {
    ...defaultOptions,
    ...userOpts,
  }

  return {
    name: "SyntaxHighlighting",
    htmlPlugins() {
      return [
        [rehypeExpressiveCode, opts],
        () => (tree, file) => {
          const scripts: Element[] = []
          // 找到 div.expressive-code 下的所有 script 和 style 标签
          visit(tree, 'element', (node: Element) => {
            if (node.tagName === 'div' &&
              Array.isArray(node.properties?.className) &&
              node.properties.className.includes('expressive-code')) {

              // 遍历 div 的子元素
              node.children.forEach((child: any) => {
                if (child.type === 'element') {
                  if (child.tagName === 'script') {
                    scripts.push(child)
                  }
                }
              })

              // 从原 div 中移除 script 和 style 节点
              node.children = node.children.filter((child: any) =>
                !(child.type === 'element' &&
                  (child.tagName === 'script'))
              )
            }
          })

          // 将收集到的 script 标签添加到 body 末尾
          if (scripts.length > 0) {
            visit(tree, 'element', (node: Element) => {
              if (node.tagName === 'body') {
                node.children.push(...scripts)
                return false
              }
            })
          }
        }
      ]
    },
  }
}