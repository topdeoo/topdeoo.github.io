import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const port = Number.parseInt(Bun.env.PORT ?? "8080", 10)
const publicRoot = new URL("../public/", import.meta.url)
const publicRootPath = await fs.realpath(fileURLToPath(publicRoot))

function candidatePaths(pathname) {
  const relative = pathname.replace(/^\/+/, "")
  const trimmed = relative.replace(/\/+$/, "")

  if (relative === "") {
    return ["index.html"]
  }

  if (relative.endsWith("/")) {
    return [`${relative}index.html`, `${trimmed}.html`]
  }

  return [relative, `${relative}.html`, `${relative}/index.html`]
}

function isSafePathname(pathname) {
  return !pathname.split("/").includes("..") && !pathname.includes("\\") && !pathname.includes("\0")
}

function publicFileUrl(candidate) {
  const url = new URL(`./${candidate}`, publicRoot)
  if (!url.href.startsWith(publicRoot.href)) {
    throw new Error(`Refusing to serve a path outside public/: ${candidate}`)
  }
  return url
}

async function resolvedPublicFile(candidate) {
  let resolvedPath
  try {
    resolvedPath = await fs.realpath(fileURLToPath(publicFileUrl(candidate)))
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return null
    }
    throw error
  }

  const relativePath = path.relative(publicRootPath, resolvedPath)
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Refusing to follow a path outside public/: ${candidate}`)
  }

  if (!(await fs.stat(resolvedPath)).isFile()) {
    return null
  }

  return Bun.file(resolvedPath)
}

async function serveStatic(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname)
  } catch {
    return new Response("Bad Request", { status: 400 })
  }

  if (!isSafePathname(pathname)) {
    return new Response("Bad Request", { status: 400 })
  }

  for (const candidate of candidatePaths(pathname)) {
    let file
    try {
      file = await resolvedPublicFile(candidate)
    } catch {
      return new Response("Bad Request", { status: 400 })
    }
    if (file) {
      return new Response(request.method === "HEAD" ? null : file)
    }
  }

  const notFound = await resolvedPublicFile("404.html")
  if (!notFound) {
    return new Response("Not Found", { status: 404 })
  }
  return new Response(request.method === "HEAD" ? null : notFound, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

if (import.meta.main) {
  const server = Bun.serve({
    port,
    fetch: serveStatic,
  })

  console.log(`Serving Quartz at http://localhost:${server.port}`)
}
