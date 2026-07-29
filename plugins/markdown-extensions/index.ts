import type { Root } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import type { Plugin } from "unified"
import rehypeImageCaption from "rehype-image-caption"
import { visit } from "unist-util-visit"

export interface MarkdownExtensionsOptions {
  poetryLanguages: string[]
  poetryClassName: string
  wrapImagesWithoutCaptions: boolean
}

const defaultOptions: MarkdownExtensionsOptions = {
  poetryLanguages: ["poetry"],
  poetryClassName: "poetry",
  wrapImagesWithoutCaptions: true,
}

const poetryBlocks: Plugin<[MarkdownExtensionsOptions], Root> = (options) => {
  const languages = new Set(options.poetryLanguages)

  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "pre" || node.children.length !== 1) return

      const code = node.children[0]
      if (code.type !== "element" || code.tagName !== "code" || code.children.length !== 1) return

      const text = code.children[0]
      if (text.type !== "text") return

      const rawClassNames = code.properties.className
      const classNames = Array.isArray(rawClassNames)
        ? rawClassNames.map(String)
        : rawClassNames == null
          ? []
          : [String(rawClassNames)]
      const language = classNames
        .find((className) => className.startsWith("language-"))
        ?.slice("language-".length)
      if (!language || !languages.has(language)) return

      node.properties = { ...node.properties, className: [options.poetryClassName] }
      node.children = [{ type: "text", value: text.value }]
    })
  }
}

export const MarkdownExtensions: QuartzTransformerPlugin<Partial<MarkdownExtensionsOptions>> = (
  userOptions,
) => {
  const options = { ...defaultOptions, ...userOptions }

  return {
    name: "MarkdownExtensions",
    htmlPlugins() {
      return [
        [poetryBlocks, options],
        [rehypeImageCaption, { wrapImagesWithoutCaptions: options.wrapImagesWithoutCaptions }],
      ]
    },
  }
}
