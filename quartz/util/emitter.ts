import type { ProcessedContent } from "../plugins/vfile"

export function contentForEmitter(
  emitterName: string,
  content: ProcessedContent[],
  contentWithVirtual: ProcessedContent[],
): ProcessedContent[] {
  // Virtual tag/folder pages have no source date. ContentIndex currently
  // substitutes the build time, which makes them displace real notes in RSS.
  // Keep search, sitemap, and RSS source-backed, matching the v4 site contract.
  return emitterName === "ContentIndex" ? content : contentWithVirtual
}
