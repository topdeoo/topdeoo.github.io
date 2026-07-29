import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { h, type ComponentChild } from "preact"
import readingTime from "reading-time"

export interface ContentMetaOptions {
  showPublishedDate: boolean
  showModifiedDate: boolean
  showReadingTime: boolean
  showComma: boolean
  locale: string
}

const defaultOptions: ContentMetaOptions = {
  showPublishedDate: true,
  showModifiedDate: true,
  showReadingTime: true,
  showComma: true,
  locale: "en-US",
}

type ContentDates = Partial<Record<"created" | "modified" | "published", unknown>>

function coerceDate(value: unknown): Date | undefined {
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) {
    return undefined
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function dateElement(date: Date, locale: string) {
  return h("time", { datetime: date.toISOString() }, formatDate(date, locale))
}

export const ContentMeta: QuartzComponentConstructor<Partial<ContentMetaOptions>> = (
  userOptions,
) => {
  const options = { ...defaultOptions, ...userOptions }

  const Component: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const frontmatter = fileData.frontmatter as Record<string, unknown> | undefined
    const dates = fileData.dates as ContentDates | undefined
    const text = typeof fileData.text === "string" ? fileData.text : ""
    const segments: ComponentChild[] = []

    if (options.showPublishedDate) {
      const published =
        coerceDate(dates?.created) ??
        coerceDate(
          frontmatter?.date ??
            frontmatter?.published ??
            frontmatter?.publishDate ??
            frontmatter?.created,
        )

      if (published) {
        segments.push(
          h(
            "span",
            { class: "content-meta-published", title: "Published" },
            h("span", { class: "content-meta-icon", "aria-hidden": "true" }, "✏️ "),
            h("span", { class: "content-meta-label" }, "Published "),
            dateElement(published, options.locale),
          ),
        )
      }
    }

    if (options.showModifiedDate) {
      const modified =
        coerceDate(dates?.modified) ??
        coerceDate(
          frontmatter?.lastmod ??
            frontmatter?.modified ??
            frontmatter?.updated ??
            frontmatter?.["last-modified"],
        )

      if (modified) {
        segments.push(
          h(
            "span",
            { class: "content-meta-modified", title: "Last updated" },
            h("span", { class: "content-meta-icon", "aria-hidden": "true" }, "🔧 "),
            h("span", { class: "content-meta-label" }, "Last updated "),
            dateElement(modified, options.locale),
          ),
        )
      }
    }

    if (options.showReadingTime && text) {
      const minutes = Math.ceil(readingTime(text).minutes)
      segments.push(h("span", { class: "content-meta-reading-time" }, `${minutes} min read`))
    }

    if (segments.length === 0) return null

    const className = [displayClass, "content-meta"].filter(Boolean).join(" ")
    return h(
      "p",
      {
        "show-comma": options.showComma,
        class: className,
        lang: options.locale,
      },
      segments,
    )
  }

  Component.css = `
.content-meta {
  margin-top: 0;
  color: var(--gray);
}

.content-meta[show-comma="true"] > *:not(:last-child) {
  margin-right: 8px;
}

.content-meta[show-comma="true"] > *:not(:last-child)::after {
  content: ",";
}

.content-meta-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`

  return Component
}
