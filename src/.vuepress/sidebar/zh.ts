import { sidebar } from "vuepress-theme-hope";

export const zhSidebar = sidebar({
  "/": [
    { text: "Home", link: "/", icon: "home" },
    {
      text: "Article",
      icon: "book",
      prefix: "posts/",
      children: "structure",
    },
    { text: "Slide", link: "/slide/", icon: "person-chalkboard" },
  ],

});
