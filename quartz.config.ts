import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "また夏を追う",
    pageTitleSuffix: " | 思想犯",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "clarity",
      projectId: "pfddmzzkif"
    },
    locale: "zh-CN",
    baseUrl: "topdeoo.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    generateSocialImages: false,
    theme: {
      fontOrigin: "local",
      cdnCaching: false,
      typography: {
        header: "LXGWWenKaiScreen",
        body: "LXGWWenKaiScreen",
        code: "Monaco",
      },
      colors: {
        lightMode: {
          light: "#f9f4ee",
          lightgray: "#ebe6e0",
          gray: "#c0b8b0",
          darkgray: "#111",
          dark: "#2b2b2b",
          secondary: "#943BB3",
          tertiary: "#8fb5ac",
          highlight: "#c4d7c472",
          textHighlight: "#d6b0b1",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#a1a1a1",
          darkgray: "#C7C7C7",
          dark: "#ebebec",
          secondary: "#d685f7",
          tertiary: "#fba7c1",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#d6b0b1",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting(),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description({ descriptionLength: 60 }),
      Plugin.LightBox(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
