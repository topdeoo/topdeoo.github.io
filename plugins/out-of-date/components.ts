import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { minimatch } from "minimatch"
import { h } from "preact"

export interface OutOfDateOptions {
  checkPaths: string[]
  staleThreshold: number
  title: string
  staleMessage: string
  reviewMessage: string
}

const defaultOptions: OutOfDateOptions = {
  checkPaths: ["01-courses/**", "03-tools/**"],
  staleThreshold: 365,
  title: "时效性提示",
  staleMessage: "本文最后复核或更新于 {date}，距今已超过 {days} 天，内容可能已经过时。",
  reviewMessage: "本文的计划复核日期为 {date}，现已逾期 {days} 天，请确认内容仍然有效。",
}

const millisecondsPerDay = 24 * 60 * 60 * 1000

function coerceDate(value: unknown): Date | undefined {
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) {
    return undefined
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function daysSince(date: Date, now: Date): number {
  return Math.floor((utcDay(now) - utcDay(date)) / millisecondsPerDay)
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function fillTemplate(template: string, days: number, date: Date): string {
  return template.replaceAll("{days}", String(days)).replaceAll("{date}", formatDate(date))
}

function pathIsChecked(relativePath: unknown, patterns: string[]): boolean {
  if (typeof relativePath !== "string") return false
  const normalizedPath = relativePath.replaceAll("\\", "/")
  return patterns.some((pattern) => minimatch(normalizedPath, pattern, { dot: true, nocase: true }))
}

function referenceDate(fileData: QuartzComponentProps["fileData"]): Date | undefined {
  const frontmatter = fileData.frontmatter as Record<string, unknown> | undefined
  const dates = fileData.dates as { created?: unknown; modified?: unknown } | undefined

  return (
    coerceDate(frontmatter?.reviewed) ??
    coerceDate(frontmatter?.modified) ??
    coerceDate(frontmatter?.updated) ??
    coerceDate(frontmatter?.lastmod) ??
    coerceDate(frontmatter?.["last-modified"]) ??
    coerceDate(dates?.modified) ??
    coerceDate(frontmatter?.created) ??
    coerceDate(frontmatter?.date) ??
    coerceDate(dates?.created)
  )
}

export const OutOfDate: QuartzComponentConstructor<Partial<OutOfDateOptions>> = (userOptions) => {
  const options = { ...defaultOptions, ...userOptions }

  const Component: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const frontmatter = fileData.frontmatter as Record<string, unknown> | undefined
    if (!frontmatter || frontmatter.stale === false) return null

    const now = new Date()
    const reviewAfter = coerceDate(frontmatter.reviewAfter)
    let warningDate: Date | undefined
    let age = 0
    let messageTemplate = options.staleMessage

    if (reviewAfter) {
      const overdueDays = daysSince(reviewAfter, now)
      if (overdueDays <= 0) return null

      warningDate = reviewAfter
      age = overdueDays
      messageTemplate = options.reviewMessage
    }

    if (!warningDate) {
      const staleAfter = positiveNumber(frontmatter.staleAfter)
      const shouldCheck =
        frontmatter.stale === true ||
        staleAfter !== undefined ||
        pathIsChecked(fileData.relativePath, options.checkPaths)
      if (!shouldCheck) return null

      const lastReviewed = referenceDate(fileData)
      if (!lastReviewed) return null

      const elapsedDays = daysSince(lastReviewed, now)
      if (elapsedDays <= (staleAfter ?? options.staleThreshold)) return null

      warningDate = lastReviewed
      age = elapsedDays
    }

    return h(
      "aside",
      {
        class: "callout out-of-date",
        "data-callout": "warning",
        role: "note",
      },
      h(
        "div",
        { class: "callout-title" },
        h("div", { class: "callout-icon", "aria-hidden": "true" }),
        h("div", { class: "callout-title-inner" }, h("p", null, options.title)),
      ),
      h(
        "div",
        { class: "callout-content" },
        h("p", null, fillTemplate(messageTemplate, age, warningDate)),
      ),
    )
  }

  Component.css = ".out-of-date { margin-block: 1rem; }"
  return Component
}
