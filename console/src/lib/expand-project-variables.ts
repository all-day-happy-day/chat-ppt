import type { ProjectVariable } from '@/domain/models/project'

/**
 * Replaces `{name}` with the project variable value when `name` exists.
 * Unknown tokens are left unchanged so typos stay visible.
 *
 * Use this only for **render/export** paths that need resolved text. Project parts PATCH
 * must send `{name}` tokens as stored in the editor so variables remain references, not
 * substituted strings.
 */
export function expandProjectVariableTokens(
  text: string | null | undefined,
  variables: readonly ProjectVariable[]
): string | null {
  if (text === null || text === undefined) {
    return text ?? null
  }
  if (variables.length === 0 || !text.includes('{')) {
    return text
  }
  const map: Map<string, string> = new Map<string, string>(
    variables.map((v: ProjectVariable): readonly [string, string] => [v.name, v.value])
  )
  return text.replace(/\{([^}]+)\}/g, (full: string, rawName: string): string => {
    const name: string = rawName.trim()
    const repl: string | undefined = map.get(name)
    return repl !== undefined ? repl : full
  })
}
