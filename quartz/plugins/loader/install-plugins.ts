#!/usr/bin/env node
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import YAML from "yaml"
import {
  getPluginDir,
  installPlugins,
  isPluginInstalled,
  parsePluginSource,
  regeneratePluginIndex,
} from "./gitLoader.js"
import type { GitPluginSpec } from "./gitLoader.js"
import type { PluginSource, QuartzPluginsJson } from "./types.js"

interface QuartzLockEntry {
  resolved?: string
  ref?: string
  commit: string
  subdir?: string
}

interface QuartzLockfile {
  plugins: Record<string, QuartzLockEntry>
}

function resolveConfigPath(): string {
  const configYamlPath = path.join(process.cwd(), "quartz.config.yaml")
  const defaultConfigYamlPath = path.join(process.cwd(), "quartz.config.default.yaml")
  const legacyPluginsJsonPath = path.join(process.cwd(), "quartz.plugins.json")
  const legacyDefaultPluginsJsonPath = path.join(process.cwd(), "quartz.plugins.default.json")

  if (fs.existsSync(configYamlPath)) return configYamlPath
  if (fs.existsSync(legacyPluginsJsonPath)) return legacyPluginsJsonPath
  if (fs.existsSync(defaultConfigYamlPath)) return defaultConfigYamlPath
  if (fs.existsSync(legacyDefaultPluginsJsonPath)) return legacyDefaultPluginsJsonPath
  return configYamlPath
}

function readPluginsJson(): QuartzPluginsJson | null {
  const configPath = resolveConfigPath()
  if (!fs.existsSync(configPath)) return null
  const raw = fs.readFileSync(configPath, "utf-8")
  if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
    return YAML.parse(raw)
  }
  return JSON.parse(raw)
}

function getConfiguredExternalPluginSources(): PluginSource[] {
  const pluginsJson = readPluginsJson()
  const entries = pluginsJson?.plugins ?? []
  return entries.filter((entry) => entry.enabled !== false).map((entry) => entry.source)
}

function readLockfile(): QuartzLockfile {
  const lockfilePath = path.join(process.cwd(), "quartz.lock.json")
  if (!fs.existsSync(lockfilePath)) {
    throw new Error("Missing quartz.lock.json; cannot verify locked Git plugins.")
  }

  const parsed = JSON.parse(fs.readFileSync(lockfilePath, "utf-8")) as Partial<QuartzLockfile>
  if (!parsed.plugins || typeof parsed.plugins !== "object") {
    throw new Error("Invalid quartz.lock.json: missing plugins map.")
  }

  return { plugins: parsed.plugins }
}

function normalizeRepositoryUrl(url: string): string {
  return url.replace(/^git\+/, "").replace(/\/+$/, "")
}

function validateLockedGitPluginMetadata(
  specs: GitPluginSpec[],
  lockfile: QuartzLockfile,
): string[] {
  const configuredNames = specs.map((spec) => spec.name)
  const configuredNameSet = new Set(configuredNames)
  const lockedNames = Object.keys(lockfile.plugins)
  const remoteSpecs = specs.filter((spec) => !spec.local)
  const errors: string[] = []

  if (configuredNameSet.size !== configuredNames.length) {
    errors.push("configured Git plugin names are not unique")
  }

  for (const name of configuredNameSet) {
    if (!lockfile.plugins[name]) {
      errors.push(`${name}: no matching entry in quartz.lock.json`)
    }
  }

  for (const name of lockedNames) {
    if (!configuredNameSet.has(name)) {
      errors.push(`${name}: lockfile entry is not an enabled Git plugin in quartz.config.yaml`)
    }
  }

  for (const spec of remoteSpecs) {
    const lockEntry = lockfile.plugins[spec.name]
    if (!lockEntry) {
      continue
    }

    if (
      !lockEntry.resolved ||
      normalizeRepositoryUrl(spec.repo) !== normalizeRepositoryUrl(lockEntry.resolved)
    ) {
      errors.push(`${spec.name}: configured repository does not match quartz.lock.json`)
      continue
    }

    if ((spec.ref ?? "") !== (lockEntry.ref ?? "")) {
      errors.push(`${spec.name}: configured ref does not match quartz.lock.json`)
      continue
    }

    if (spec.subdir || lockEntry.subdir) {
      errors.push(
        `${spec.name}: subdirectory plugins do not retain Git metadata, so their locked commit ` +
          "cannot be verified safely in --index-only mode",
      )
      continue
    }

    if (!lockEntry.commit || lockEntry.commit === "local" || lockEntry.commit === "unknown") {
      errors.push(`${spec.name}: lockfile does not contain a verifiable Git commit`)
    }
  }

  return errors
}

function purgeLockedGitPlugins(specs: GitPluginSpec[]): void {
  const lockfile = readLockfile()
  const errors = validateLockedGitPluginMetadata(specs, lockfile)
  if (errors.length > 0) {
    throw new Error(`Locked Git plugin metadata validation failed:\n- ${errors.join("\n- ")}`)
  }

  // A cached executable worktree can hide tracked changes behind Git index flags.
  // Always materialize remote plugins again from the locked commit before the
  // upstream installer is allowed to inspect package.json or execute build code.
  fs.rmSync(path.join(process.cwd(), ".quartz", "plugins"), { recursive: true, force: true })
}

function verifyLockedGitPlugins(specs: GitPluginSpec[]): void {
  const missing = specs.filter((spec) => !isPluginInstalled(spec.name))
  if (missing.length > 0) {
    throw new Error(
      `Missing locked Git plugin(s): ${missing.map((spec) => spec.name).join(", ")}. ` +
        "Run `bun run plugins:install` first.",
    )
  }

  const lockfile = readLockfile()
  const errors = validateLockedGitPluginMetadata(specs, lockfile)
  const remoteSpecs = specs.filter((spec) => !spec.local)

  for (const spec of remoteSpecs) {
    const lockEntry = lockfile.plugins[spec.name]
    if (!lockEntry || errors.some((error) => error.startsWith(`${spec.name}:`))) continue

    try {
      const installedCommit = execFileSync(
        "git",
        ["-C", getPluginDir(spec.name), "rev-parse", "--verify", "HEAD^{commit}"],
        {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      ).trim()

      if (installedCommit !== lockEntry.commit) {
        errors.push(
          `${spec.name}: installed HEAD ${installedCommit} does not match locked commit ${lockEntry.commit}`,
        )
      }

      const workingTreeChanges = execFileSync(
        "git",
        ["-C", getPluginDir(spec.name), "status", "--porcelain=v1", "--untracked-files=all"],
        {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      ).trim()
      if (workingTreeChanges) {
        errors.push(`${spec.name}: installed working tree differs from the locked commit`)
      }

      const indexEntries = execFileSync("git", ["-C", getPluginDir(spec.name), "ls-files", "-v"], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      })
        .trim()
        .split("\n")
        .filter(Boolean)
      if (indexEntries.some((entry) => !entry.startsWith("H "))) {
        errors.push(`${spec.name}: installed Git index contains hidden worktree flags`)
      }

      const ignoredFiles = execFileSync(
        "git",
        ["-C", getPluginDir(spec.name), "ls-files", "--others", "--ignored", "--exclude-standard"],
        {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      ).trim()
      if (ignoredFiles) {
        errors.push(`${spec.name}: installed working tree contains ignored files outside the lock`)
      }
    } catch {
      errors.push(`${spec.name}: installed directory is not a readable full Git repository`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Locked Git plugin verification failed:\n- ${errors.join("\n- ")}`)
  }
}

async function getExternalPluginSources(): Promise<PluginSource[]> {
  try {
    const module = await import("../../../quartz.js")
    const config = module.default ?? module
    const externalPlugins = config.externalPlugins
    if (Array.isArray(externalPlugins) && externalPlugins.length > 0) {
      return externalPlugins as PluginSource[]
    }
  } catch {
    // fall back to config yaml parsing
  }

  return getConfiguredExternalPluginSources()
}

async function main() {
  const indexOnly = process.argv.includes("--index-only")
  const purgeLocked = process.argv.includes("--purge-locked")
  // In preparation mode, parse declarative YAML only. Importing quartz.js here
  // would load external plugin code before its cached checkout had been verified.
  const externalPlugins =
    indexOnly || purgeLocked
      ? getConfiguredExternalPluginSources()
      : await getExternalPluginSources()

  const specs = externalPlugins
    .map((source: PluginSource) => parsePluginSource(source))
    .filter((spec) => !spec.npmPackage)

  const npmSpecs = externalPlugins
    .map((source: PluginSource) => parsePluginSource(source))
    .filter((spec) => spec.npmPackage)

  if (purgeLocked) {
    purgeLockedGitPlugins(specs)
    console.log("✓ Cleared executable Git plugin worktrees; reinstalling from locked commits")
    return
  }

  if (specs.length === 0 && npmSpecs.length === 0) {
    console.log("No external plugins to install.")
    return
  }

  if (indexOnly) {
    verifyLockedGitPlugins(specs)

    await regeneratePluginIndex({
      verbose: true,
      npmPackages: npmSpecs.map((spec) => spec.name),
    })
    return
  }

  if (specs.length > 0) {
    console.log(`Installing ${specs.length} plugin(s) from Git...`)
    const installed = await installPlugins(specs, { verbose: true })

    if (installed.size === specs.length) {
      console.log("✓ All Git plugins installed successfully")
    } else {
      console.error(`✗ Only ${installed.size}/${specs.length} Git plugins installed`)
      process.exit(1)
    }
  }

  if (npmSpecs.length > 0) {
    console.log(`Found ${npmSpecs.length} npm plugin(s), regenerating plugin index...`)
    await regeneratePluginIndex({ verbose: true, npmPackages: npmSpecs.map((s) => s.name) })
  }
}

main().catch((err) => {
  console.error("Failed to install plugins:", err)
  process.exit(1)
})
