import * as React from 'react'
import { createPortal } from 'react-dom'

import type { ProjectVariable } from '@/domain/models/project'
import { cn } from '@/lib/utils'

/** Bindings for `/` variable picker on a plain-text model (`{name}` tokens). */
export interface VariableSlashEditorHost {
  readonly getPlainValue: () => string
  readonly getCaretIndex: () => number
  readonly replaceRange: (start: number, end: number, insert: string) => void
  readonly focus: () => void
  readonly getAnchorRect: () => DOMRect | null
  readonly getRootElement: () => HTMLElement | null
}

export interface UseVariableSlashParams {
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly enabled: boolean
  readonly variables: readonly ProjectVariable[]
  /** Exactly one of `inputRef` or `editorHost` must be provided. */
  readonly inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  readonly editorHost?: VariableSlashEditorHost
  /** Shown when the typed filter matches no variable names. */
  readonly emptyListLabel: string
}

export interface UseVariableSlashResult {
  readonly menuOpen: boolean
  /** Returns true when the parent should skip additional `preventDefault` / shortcut handling. */
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => boolean
  readonly onInput: () => void
  readonly onSelectCapture: () => void
  readonly menuPortal: React.ReactNode
}

interface SlashMenuState {
  readonly slashIndex: number
  readonly highlightIndex: number
  /** Exclusive end of filter slice `value.slice(slashIndex + 1, filterEnd)`. */
  readonly filterEnd: number
  readonly anchorRect: DOMRect
}

interface SlashBinding {
  readonly getPlainValue: () => string
  readonly getCaretIndex: () => number
  readonly replaceRange: (start: number, end: number, insert: string) => void
  readonly focus: () => void
  readonly getAnchorRect: () => DOMRect | null
  readonly getRootElement: () => HTMLElement | null
}

function clampHighlight(filteredLength: number, idx: number): number {
  if (filteredLength <= 0) {
    return 0
  }
  return Math.max(0, Math.min(idx, filteredLength - 1))
}

function fallbackAnchorRect(): DOMRect {
  return new DOMRect(0, 0, 0, 0)
}

export function useVariableSlash({
  value,
  onValueChange,
  enabled,
  variables,
  inputRef,
  editorHost,
  emptyListLabel,
}: UseVariableSlashParams): UseVariableSlashResult {
  if (editorHost === undefined && inputRef === undefined) {
    throw new Error('useVariableSlash: provide `inputRef` or `editorHost`.')
  }

  const bindingRef: React.MutableRefObject<SlashBinding | null> = React.useRef<SlashBinding | null>(null)
  const onValueChangeRef: React.MutableRefObject<(next: string) => void> =
    React.useRef<(next: string) => void>(onValueChange)

  React.useLayoutEffect((): void => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  React.useLayoutEffect((): void => {
    if (editorHost !== undefined) {
      bindingRef.current = editorHost
      return
    }
    const inputElRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null> = inputRef!
    bindingRef.current = {
      getPlainValue: (): string => inputElRef.current?.value ?? '',
      getCaretIndex: (): number => inputElRef.current?.selectionStart ?? 0,
      replaceRange: (start: number, end: number, insert: string): void => {
        const el: HTMLInputElement | HTMLTextAreaElement | null = inputElRef.current
        if (el === null) {
          return
        }
        const v: string = el.value
        const next: string = v.slice(0, start) + insert + v.slice(end)
        onValueChangeRef.current(next)
        const caret: number = start + insert.length
        window.requestAnimationFrame((): void => {
          const node: HTMLInputElement | HTMLTextAreaElement | null = inputElRef.current
          if (node !== null) {
            node.focus()
            node.setSelectionRange(caret, caret)
          }
        })
      },
      focus: (): void => {
        inputElRef.current?.focus()
      },
      getAnchorRect: (): DOMRect | null => inputElRef.current?.getBoundingClientRect() ?? null,
      getRootElement: (): HTMLElement | null => inputElRef.current as HTMLElement | null,
    }
  }, [editorHost, inputRef])

  const reactId: string = React.useId()
  const slashMenuDomId: string = React.useMemo(
    (): string => `project-variable-slash-${reactId.replace(/:/g, '')}`,
    [reactId]
  )
  const [menu, setMenu] = React.useState<SlashMenuState | null>(null)

  const closeMenu = React.useCallback((): void => {
    setMenu(null)
  }, [])

  const filterText = React.useMemo((): string => {
    if (menu === null) {
      return ''
    }
    const end: number = Math.min(menu.filterEnd, value.length)
    return value.slice(menu.slashIndex + 1, end).toLowerCase()
  }, [menu, value])

  const filteredVariables = React.useMemo((): ProjectVariable[] => {
    if (menu === null || variables.length === 0) {
      return []
    }
    const q: string = filterText
    if (q.length === 0) {
      return [...variables]
    }
    return variables.filter((v: ProjectVariable): boolean => v.name.toLowerCase().includes(q))
  }, [filterText, menu, variables])

  const menuOpen: boolean = menu !== null

  const syncMenuOrClose = React.useCallback((): void => {
    setMenu((prev: SlashMenuState | null): SlashMenuState | null => {
      if (prev === null) {
        return null
      }
      const binding: SlashBinding | null = bindingRef.current
      if (binding === null) {
        return null
      }
      const text: string = binding.getPlainValue()
      if (prev.slashIndex >= text.length || text[prev.slashIndex] !== '/') {
        return null
      }
      const sel: number = binding.getCaretIndex()
      if (sel < prev.slashIndex) {
        return null
      }
      const nextFilterEnd: number = sel
      const q: string = text.slice(prev.slashIndex + 1, nextFilterEnd).toLowerCase()
      const list: ProjectVariable[] =
        q.length === 0
          ? [...variables]
          : variables.filter((v: ProjectVariable): boolean => v.name.toLowerCase().includes(q))
      const len: number = list.length
      const nextHighlight: number = len <= 0 ? 0 : clampHighlight(len, prev.highlightIndex)
      const rect: DOMRect | null = binding.getAnchorRect()
      return {
        ...prev,
        filterEnd: nextFilterEnd,
        highlightIndex: nextHighlight,
        anchorRect: rect ?? prev.anchorRect,
      }
    })
  }, [variables])

  const pickVariable = React.useCallback((variableName: string): void => {
    setMenu((prev: SlashMenuState | null): SlashMenuState | null => {
      if (prev === null) {
        return null
      }
      const binding: SlashBinding | null = bindingRef.current
      if (binding === null) {
        return prev
      }
      const selStart: number = binding.getCaretIndex()
      const insert: string = `{${variableName}}`
      binding.replaceRange(prev.slashIndex, selStart, insert)
      return null
    })
  }, [])

  React.useEffect((): void | (() => void) => {
    if (menu === null) {
      return
    }
    const onDocPointerDown = (e: PointerEvent): void => {
      const binding: SlashBinding | null = bindingRef.current
      const el: HTMLElement | null = binding?.getRootElement() ?? null
      const t: Node | null = e.target as Node | null
      if (el !== null && t !== null && el.contains(t)) {
        return
      }
      const menuEl: HTMLElement | null = document.getElementById(slashMenuDomId)
      if (menuEl !== null && t !== null && menuEl.contains(t)) {
        return
      }
      closeMenu()
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return (): void => {
      document.removeEventListener('pointerdown', onDocPointerDown, true)
    }
  }, [closeMenu, menu, slashMenuDomId])

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>): boolean => {
      if (!enabled || variables.length === 0) {
        return false
      }

      if (menu !== null) {
        if (e.key === 'Escape') {
          e.preventDefault()
          closeMenu()
          return true
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMenu((prev: SlashMenuState | null): SlashMenuState | null => {
            if (prev === null) {
              return null
            }
            const len: number = filteredVariables.length
            if (len <= 0) {
              return prev
            }
            return { ...prev, highlightIndex: clampHighlight(len, prev.highlightIndex + 1) }
          })
          return true
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMenu((prev: SlashMenuState | null): SlashMenuState | null => {
            if (prev === null) {
              return null
            }
            const len: number = filteredVariables.length
            if (len <= 0) {
              return prev
            }
            return { ...prev, highlightIndex: clampHighlight(len, prev.highlightIndex - 1) }
          })
          return true
        }
        if (e.key === 'Enter') {
          const row: ProjectVariable | undefined = filteredVariables[menu.highlightIndex]
          if (row !== undefined) {
            e.preventDefault()
            pickVariable(row.name)
            return true
          }
          return false
        }
        if (e.key === 'Tab') {
          closeMenu()
          return false
        }
      }

      if (menu === null && e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent.isComposing) {
        const el: HTMLElement = e.currentTarget
        window.requestAnimationFrame((): void => {
          if (inputRef !== undefined) {
            const node: HTMLInputElement | HTMLTextAreaElement | null = inputRef.current
            if (node !== el) {
              return
            }
          }
          const binding: SlashBinding | null = bindingRef.current
          if (binding === null) {
            return
          }
          const text: string = binding.getPlainValue()
          const pos: number = binding.getCaretIndex()
          const slashIndex: number = pos - 1
          if (slashIndex < 0 || text[slashIndex] !== '/') {
            return
          }
          const rect: DOMRect | null = binding.getAnchorRect()
          setMenu({
            slashIndex,
            highlightIndex: 0,
            filterEnd: pos,
            anchorRect: rect ?? fallbackAnchorRect(),
          })
        })
      }

      return false
    },
    [closeMenu, enabled, filteredVariables, inputRef, menu, pickVariable, variables.length]
  )

  const onInput = React.useCallback((): void => {
    if (menu === null) {
      return
    }
    syncMenuOrClose()
  }, [menu, syncMenuOrClose])

  const onSelectCapture = React.useCallback((): void => {
    if (menu === null) {
      return
    }
    syncMenuOrClose()
  }, [menu, syncMenuOrClose])

  const menuPortal: React.ReactNode = React.useMemo((): React.ReactNode => {
    if (menu === null || !enabled || variables.length === 0) {
      return null
    }
    const rect: DOMRect = menu.anchorRect
    const top: number = Math.round(rect.bottom + 4)
    const left: number = Math.round(rect.left)
    const menuMaxW: number = 200

    return createPortal(
      <div
        id={slashMenuDomId}
        role="listbox"
        aria-label="Project variables"
        className={cn(
          'border-border bg-popover text-popover-foreground scrollbar-hide fixed z-[200] max-h-32 overflow-y-auto rounded-md border py-0.5 text-[11px] shadow-md'
        )}
        style={{ top, left, minWidth: Math.min(140, Math.max(120, rect.width)), maxWidth: menuMaxW }}
      >
        {filteredVariables.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1">{emptyListLabel}</div>
        ) : (
          filteredVariables.map((v: ProjectVariable, i: number): React.ReactElement => {
            const active: boolean = i === menu.highlightIndex
            const line: string =
              v.value.length > 0 ? `${v.name}: ${v.value}` : `${v.name}:`
            return (
              <button
                key={v.name}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'hover:bg-muted/80 focus:bg-muted/80 block w-full min-w-0 px-2 py-1 text-left leading-tight outline-none',
                  active && 'bg-muted'
                )}
                onMouseDown={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                  ev.preventDefault()
                  pickVariable(v.name)
                }}
                onMouseEnter={(): void => {
                  setMenu((prev: SlashMenuState | null): SlashMenuState | null =>
                    prev === null ? null : { ...prev, highlightIndex: i }
                  )
                }}
              >
                <span className="block min-w-0 truncate whitespace-nowrap" title={line}>
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="text-muted-foreground font-normal">{v.value}</span>
                </span>
              </button>
            )
          })
        )}
      </div>,
      document.body
    )
  }, [emptyListLabel, enabled, filteredVariables, menu, pickVariable, slashMenuDomId, variables.length])

  return {
    menuOpen,
    onKeyDown,
    onInput,
    onSelectCapture,
    menuPortal,
  }
}
