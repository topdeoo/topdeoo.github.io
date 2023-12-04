import { defineUserConfig } from "vuepress";
import { shikiPlugin } from '@vuepress/plugin-shiki';
import { searchProPlugin } from "vuepress-plugin-search-pro";
import theme from "./theme.js";


export default defineUserConfig({
  base: "/",

  locales: {
    "/": {
      lang: "zh-CN",
      title: "nya~",
      description: "Virgil's personal blog",
    },
  },

  head: [
    ["link", {
      href: "https://fonts.cdnfonts.com/css/monaco",
      rel: "stylesheet",
    }],
  ],

  theme,

  plugins: [

    // code highlight
    shikiPlugin({
      theme: "one-dark-pro"
    }),

    // search
    searchProPlugin({
      // 索引全部内容
      indexContent: true,
      // 为分类和标签添加索引
      customFields: [
        {
          getter: (page) => page.frontmatter.category,
          formatter: "分类：$content",
        },
        {
          getter: (page) => page.frontmatter.tag,
          formatter: "标签：$content",
        },
      ],
    }),

  ]

  // Enable it with pwa
  // shouldPrefetch: false,
});
