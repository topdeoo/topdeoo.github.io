export function hoistCssImports(css: string): { imports: string; styles: string } {
  const imports: string[] = []
  const styles = css.replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g, (rule) => {
    imports.push(rule)
    return ""
  })

  return {
    imports: imports.join("\n"),
    styles,
  }
}
