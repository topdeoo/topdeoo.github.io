import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Root, Element } from "hast"

// Options supported here should be in sync with what GLightbox supports:
// https://github.com/biati-digital/glightbox
interface Options {
  /** Name of the effect on lightbox open. */
  openEffect: "zoom" | "fade" | "none"
  /** Name of the effect on lightbox close. */
  closeEffect: "zoom" | "fade" | "none"
  /** Name of the effect on slide change. */
  slideEffect: "slide" | "zoom" | "fade" | "none"
  /** Show or hide the close button. */
  closeButton: boolean
}

const defaultOptions: Options = {
  openEffect: "zoom",
  closeEffect: "zoom",
  slideEffect: "slide",
  closeButton: true,
}

export const LightBox: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "LightBox",
    htmlPlugins() {
  return [
    () => {
      return (tree: Root) => {
        const visited: Set<string> = new Set();
        visit(tree, "element", (node, index, parent) => {
          if (
            node.tagName === "img" &&
            node.properties &&
            typeof node.properties.src === "string"
          ) {
            if (visited.has(node.properties.src)) {
              return;
            }
            visited.add(node.properties.src);
            const linkNode: Element = {
              type: "element",
              tagName: "a",
              properties: {
                href: node.properties.src,
                class: "glightbox"
              },
              children: [
                {
                  type: "element",
                  tagName: "img",
                  properties: {
                    src: node.properties.src,
                  },
                  children: [],
                },
              ],
            };
            parent!.children[index!] = linkNode;
          }
        });
      };
    },
  ];
},
    externalResources() {
      return {
        css: [{content: "https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css"}],
        js: [
          {
            src: "https://cdn.jsdelivr.net/gh/mcstudios/glightbox/dist/js/glightbox.min.js",
            loadTime: "afterDOMReady",
            contentType: "external",
          },
          {
            contentType: "inline",
            loadTime: "afterDOMReady",
            // GLightbox needs to be reloaded whenever there's a page content change
            // to make sure it loads all the images in the new page content.
            // Ref: https://quartz.jzhao.xyz/advanced/creating-components#scripts-and-interactivity
            script: `
document.addEventListener("nav", () => {
  const lightbox = GLightbox(${JSON.stringify(opts)});
});
`.trim(),
          },
        ],
      }
    },
  }
}