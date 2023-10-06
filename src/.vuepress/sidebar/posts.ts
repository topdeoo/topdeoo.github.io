import { arraySidebar } from "vuepress-theme-hope";

export const posts = arraySidebar([
    {
        text: "Open Courses",
        icon: "cloud",
        children: ["NJU ICS/", "MIT 6.S081/", "Chcore/", "jyyOS/",
            "UCB CS162/", "Stanford CS144/", "Stanford CS144(sp23)/",
            "Stanford CS143/", "MIT 6.824/", "CMU 15445/"],
    },
    {
        text: "Life in NENU",
        icon: "droplet",
        children: ["Algorithm", "In Night/", "ICT AI Compilers/", "ECNU"],
    }
]);