import fs from "fs"
import sourceMapSupport from "source-map-support"
import { fileURLToPath } from "url"

export const options: sourceMapSupport.Options = {
  // source map hack to get around query param
  // import cache busting
  retrieveSourceMap(source) {
    // Bun can report bundled frames using its own URL scheme. Those frames do
    // not have a filesystem-backed source map and must not reach fileURLToPath.
    if (!source.includes(".quartz-cache") || !source.startsWith("file:")) {
      return null
    }

    try {
      const realSource = fileURLToPath(source.split("?", 2)[0] + ".map")
      return {
        map: fs.readFileSync(realSource, "utf8"),
      }
    } catch {
      return null
    }
  },
}
