/** Fixed color used by all variable text chips. */
export interface VariableTagColorPair {
  readonly background: string
  readonly foreground: string
}

const VARIABLE_TEXT_COLOR: VariableTagColorPair = {
  background: 'transparent',
  foreground: 'hsl(217 91% 60%)',
}

export function variableTagColors(name: string): VariableTagColorPair {
  void name
  return VARIABLE_TEXT_COLOR
}
