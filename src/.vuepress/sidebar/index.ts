import { sidebar } from "vuepress-theme-hope";
import { docs } from "./docs";
import { posts } from "./posts";

export const zhSidebar = sidebar({
    "/": [
        { text: "Home", link: "/", icon: "home" },
        { text: "Slide", link: "/slide/", icon: "person-chalkboard" },
    ],

    "/posts": posts,
    "/posts/Algorithm/": "structure",
    "/posts/CMU 15445/": "structure",
    "/posts/Chcore/": "structure",
    "/posts/ECNU/": "structure",
    "/posts/ICT AI Compilers": "structure",
    "/posts/In Night": "structure",
    "/posts/jyyOS/": "structure",
    "/posts/MIT 6.824/": "structure",
    "/posts/MIT 6.S081/": "structure",
    "/posts/NJU ICS/": "structure",
    "/posts/Stanford CS143/": "structure",
    "/posts/Stanford CS144/": "structure",
    "/posts/Stanford CS144(sp23)/": "structure",
    "/posts/UCB CS162/": "structure",

    "/docs/ChCore/": "structure",
    "/docs": docs,
});
