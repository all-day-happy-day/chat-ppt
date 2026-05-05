import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  getSerializedCaretIndex,
  needsVariableChipDomRepair,
  normalizeVariableTokenInner,
  normalizeVariableTokensInSerialized,
  rebuildVariableChipFieldDom,
  refreshVariableChipDomValues,
  serializeVariableChipField,
  setSerializedCaretIndex,
} from '@/App/authenticated/project-view/variable-chip-field-dom'
import { variableTagColors } from '@/App/authenticated/project-view/variable-color'
import type { ProjectVariable } from '@/domain/models/project'
import { cn } from '@/lib/utils'

import { useOptionalProjectVariablesScope } from './project-variables-scope-context'
import { useVariableSlash,type VariableSlashEditorHost } from './use-variable-slash'

const EMPTY_PROJECT_VARIABLES: readonly ProjectVariable[] = []

function assignRef<T>(instance: T | null, ref: React.Ref<T> | null | undefined): void {
  if (ref == null) {
    return
  }
  if (typeof ref === 'function') {
    ref(instance)
  } else {
    ;(ref as React.MutableRefObject<T | null>).current = instance
  }
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | null | undefined>): React.RefCallback<T> {
  return (instance: T | null): void => {
    for (const r of refs) {
      assignRef(instance, r)
    }
  }
}

export type VariableSlashTextInputProps = Omit<
  React.ComponentPropsWithoutRef<'input'>,
  'onChange' | 'value'
> & {
  readonly value: string
  readonly onValueChange: (next: string) => void
}

export const VariableSlashTextInput = React.forwardRef<HTMLInputElement, VariableSlashTextInputProps>(
  function VariableSlashTextInput(
    { value, onValueChange, onKeyDown, onInput, onSelect, disabled, ...rest },
    forwardedRef
  ): React.ReactElement {
    const { t } = useTranslation()
    const scope = useOptionalProjectVariablesScope()
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const variables = scope?.variables ?? []
    const slash = useVariableSlash({
      value,
      onValueChange,
      variables,
      inputRef: innerRef,
      emptyListLabel: t('page.project_view.variables_slash_empty'),
      enabled: scope !== null && variables.length > 0 && !disabled,
    })
    const mergedRef = React.useMemo(
      (): React.RefCallback<HTMLInputElement> => mergeRefs(innerRef, forwardedRef),
      [forwardedRef]
    )

    return (
      <>
        <input
          {...rest}
          ref={mergedRef}
          value={value}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            onValueChange(e.target.value)
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
            const consumed: boolean = slash.onKeyDown(e)
            if (!consumed) {
              onKeyDown?.(e)
            }
          }}
          onInput={(e: React.FormEvent<HTMLInputElement>): void => {
            slash.onInput()
            onInput?.(e)
          }}
          onSelect={(e: React.SyntheticEvent<HTMLInputElement>): void => {
            slash.onSelectCapture()
            onSelect?.(e)
          }}
        />
        {slash.menuPortal}
      </>
    )
  }
)

VariableSlashTextInput.displayName = 'VariableSlashTextInput'

function tryDeleteVariableTokenBeforeCaret(
  serialized: string,
  caret: number
): { readonly next: string; readonly caret: number } | null {
  if (caret <= 0) {
    return null
  }
  const openIdx: number = serialized.lastIndexOf('{', caret - 1)
  if (openIdx < 0) {
    return null
  }
  const closeIdx: number = serialized.indexOf('}', openIdx)
  if (closeIdx < 0 || closeIdx !== caret - 1) {
    return null
  }
  const inner: string = serialized.slice(openIdx + 1, closeIdx)
  const name: string = normalizeVariableTokenInner(inner)
  if (name.length === 0) {
    return null
  }
  const next: string = serialized.slice(0, openIdx) + serialized.slice(caret)
  return { next, caret: openIdx }
}

/** After removing a chip, contenteditable sometimes leaves exactly `{` as a text run. */
function tryDeleteLoneOpenBrace(
  serialized: string,
  caret: number
): { readonly next: string; readonly caret: number } | null {
  if (serialized === '{' && caret === 1) {
    return { next: '', caret: 0 }
  }
  return null
}

export type VariableChipTextFieldProps = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  | 'onChange'
  | 'onInput'
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'contentEditable'
  | 'onBlur'
  | 'onFocus'
  | 'onPaste'
> & {
  readonly value: string
  readonly onValueChange: (next: string) => void
  readonly onBlur?: React.FocusEventHandler<HTMLDivElement>
  readonly onFocus?: React.FocusEventHandler<HTMLDivElement>
  readonly onPaste?: React.ClipboardEventHandler<HTMLDivElement>
}

export const VariableChipTextField = React.forwardRef<HTMLDivElement, VariableChipTextFieldProps>(
  function VariableChipTextField(
    {
      value,
      onValueChange,
      onKeyDown,
      onInput,
      onBlur,
      onFocus,
      onPaste,
      disabled,
      className,
      placeholder,
      ...rest
    },
    forwardedRef
  ): React.ReactElement {
    const { t } = useTranslation()
    const scope = useOptionalProjectVariablesScope()
    const variables: readonly ProjectVariable[] =
      scope !== null ? scope.variables : EMPTY_PROJECT_VARIABLES
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const mergedRef = React.useMemo(
      (): React.RefCallback<HTMLDivElement> => mergeRefs(rootRef, forwardedRef),
      [forwardedRef]
    )
    const onValueChangeRef = React.useRef<(next: string) => void>(onValueChange)
    React.useLayoutEffect((): void => {
      onValueChangeRef.current = onValueChange
    }, [onValueChange])

    const lastAppliedValueRef = React.useRef<string>(value)

    const lookupVariable = React.useCallback(
      (name: string): { readonly name: string; readonly value: string } | undefined => {
        return variables.find((v): boolean => v.name === name)
      },
      [variables]
    )

    const lookupVariableRef: React.MutableRefObject<
      (name: string) => { readonly name: string; readonly value: string } | undefined
    > = React.useRef(lookupVariable)

    React.useLayoutEffect((): void => {
      lookupVariableRef.current = lookupVariable
    }, [lookupVariable])

    const editorHost: VariableSlashEditorHost = React.useMemo((): VariableSlashEditorHost => {
      return {
        getPlainValue: (): string => serializeVariableChipField(rootRef.current),
        getCaretIndex: (): number => getSerializedCaretIndex(rootRef.current),
        replaceRange: (start: number, end: number, insert: string): void => {
          const el: HTMLDivElement | null = rootRef.current
          if (el === null) {
            return
          }
          const cur: string = serializeVariableChipField(el)
          const next: string = normalizeVariableTokensInSerialized(cur.slice(0, start) + insert + cur.slice(end))
          rebuildVariableChipFieldDom(el, next, variableTagColors, lookupVariableRef.current)
          setSerializedCaretIndex(el, start + insert.length)
          lastAppliedValueRef.current = next
          onValueChangeRef.current(next)
        },
        focus: (): void => {
          rootRef.current?.focus()
        },
        getAnchorRect: (): DOMRect | null => rootRef.current?.getBoundingClientRect() ?? null,
        getRootElement: (): HTMLElement | null => rootRef.current,
      }
    }, [])

    const slash = useVariableSlash({
      value,
      onValueChange,
      variables,
      editorHost,
      emptyListLabel: t('page.project_view.variables_slash_empty'),
      enabled: scope !== null && variables.length > 0 && !disabled,
    })

    /** Only when the stored string (`value`) changes: rebuild / repair DOM. Variable list updates alone must not re-parse the field or call `onValueChange`. */
    React.useLayoutEffect((): void => {
      const el: HTMLDivElement | null = rootRef.current
      if (el === null) {
        return
      }
      const canon: string = normalizeVariableTokensInSerialized(value)
      if (canon !== value) {
        lastAppliedValueRef.current = canon
        onValueChangeRef.current(canon)
      }
      const lookup = lookupVariableRef.current
      const toBuild: string = canon
      if (el.childNodes.length === 0) {
        rebuildVariableChipFieldDom(el, toBuild, variableTagColors, lookup)
        lastAppliedValueRef.current = toBuild
        return
      }
      const dom: string = serializeVariableChipField(el)
      if (dom !== toBuild) {
        lastAppliedValueRef.current = toBuild
        rebuildVariableChipFieldDom(el, toBuild, variableTagColors, lookup)
        return
      }
      if (needsVariableChipDomRepair(el, dom)) {
        const caret: number = getSerializedCaretIndex(el)
        rebuildVariableChipFieldDom(el, dom, variableTagColors, lookup)
        setSerializedCaretIndex(el, caret)
      }
    }, [value])

    /** Variable definitions changed: update chip tooltips / labels only — keep cards and stored `{name}` tokens as-is. */
    React.useLayoutEffect((): void => {
      const el: HTMLDivElement | null = rootRef.current
      if (el === null) {
        return
      }
      refreshVariableChipDomValues(el, lookupVariable)
    }, [lookupVariable])

    const showPlaceholder: boolean = value.length === 0 && (placeholder ?? '').length > 0

    return (
      <>
        <div className={cn('relative min-w-0', className)}>
          {showPlaceholder ? (
            <span
              className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 max-w-[calc(100%-1rem)] -translate-y-1/2 truncate text-sm select-none"
              aria-hidden
            >
              {placeholder}
            </span>
          ) : null}
          <div
            {...rest}
            ref={mergedRef}
            role="textbox"
            aria-multiline="false"
            contentEditable={disabled ? false : true}
            suppressContentEditableWarning
            tabIndex={disabled ? -1 : 0}
            className={cn(
              'relative w-full min-w-0 min-h-[1.5rem] bg-transparent py-0.5 text-sm leading-normal outline-none empty:before:invisible',
              disabled && 'pointer-events-none opacity-60'
            )}
            onFocus={(e: React.FocusEvent<HTMLDivElement>): void => {
              onFocus?.(e)
            }}
            onBlur={(e: React.FocusEvent<HTMLDivElement>): void => {
              onBlur?.(e)
            }}
            onPaste={(e: React.ClipboardEvent<HTMLDivElement>): void => {
              e.preventDefault()
              const text: string = e.clipboardData.getData('text/plain')
              const el: HTMLDivElement | null = rootRef.current
              if (el === null) {
                onPaste?.(e)
                return
              }
              document.execCommand('insertText', false, text)
              onPaste?.(e)
            }}
            onInput={(e: React.FormEvent<HTMLDivElement>): void => {
              const el: HTMLDivElement | null = rootRef.current
              if (el === null) {
                return
              }
              let s: string = serializeVariableChipField(el)
              if (s === '' && (el.textContent ?? '') === '\u200B') {
                s = ''
              }
              s = normalizeVariableTokensInSerialized(s)
              lastAppliedValueRef.current = s
              onValueChange(s)
              slash.onInput()
              onInput?.(e)
              if (needsVariableChipDomRepair(el, s)) {
                const caret: number = getSerializedCaretIndex(el)
                rebuildVariableChipFieldDom(el, s, variableTagColors, lookupVariableRef.current)
                setSerializedCaretIndex(el, caret)
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
              if (!disabled && e.key === 'Backspace' && !e.nativeEvent.isComposing) {
                const sel: Selection | null = window.getSelection()
                if (
                  sel !== null &&
                  sel.rangeCount > 0 &&
                  sel.anchorNode !== null &&
                  sel.focusNode !== null &&
                  sel.anchorNode === sel.focusNode &&
                  sel.anchorOffset === sel.focusOffset
                ) {
                  const el: HTMLDivElement | null = rootRef.current
                  if (el !== null) {
                    const serialized: string = serializeVariableChipField(el)
                    const caret: number = getSerializedCaretIndex(el)
                    const hit: { readonly next: string; readonly caret: number } | null =
                      tryDeleteVariableTokenBeforeCaret(serialized, caret) ??
                      tryDeleteLoneOpenBrace(serialized, caret)
                    if (hit !== null) {
                      e.preventDefault()
                      const nextNorm: string = normalizeVariableTokensInSerialized(hit.next)
                      rebuildVariableChipFieldDom(el, nextNorm, variableTagColors, lookupVariableRef.current)
                      setSerializedCaretIndex(el, hit.caret)
                      lastAppliedValueRef.current = nextNorm
                      onValueChange(nextNorm)
                      return
                    }
                  }
                }
              }
              const consumed: boolean = slash.onKeyDown(e)
              if (!consumed) {
                onKeyDown?.(e)
              }
            }}
            onSelectCapture={(): void => {
              slash.onSelectCapture()
            }}
          />
        </div>
        {slash.menuPortal}
      </>
    )
  }
)

VariableChipTextField.displayName = 'VariableChipTextField'

export type VariableSlashTextareaProps = Omit<
  React.ComponentPropsWithoutRef<'textarea'>,
  'onChange' | 'value'
> & {
  readonly value: string
  readonly onValueChange: (next: string) => void
}

export const VariableSlashTextarea = React.forwardRef<HTMLTextAreaElement, VariableSlashTextareaProps>(
  function VariableSlashTextarea(
    { value, onValueChange, onKeyDown, onInput, onSelect, disabled, ...rest },
    forwardedRef
  ): React.ReactElement {
    const { t } = useTranslation()
    const scope = useOptionalProjectVariablesScope()
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)
    const variables = scope?.variables ?? []
    const slash = useVariableSlash({
      value,
      onValueChange,
      variables,
      inputRef: innerRef,
      emptyListLabel: t('page.project_view.variables_slash_empty'),
      enabled: scope !== null && variables.length > 0 && !disabled,
    })
    const mergedRef = React.useMemo(
      (): React.RefCallback<HTMLTextAreaElement> => mergeRefs(innerRef, forwardedRef),
      [forwardedRef]
    )

    return (
      <>
        <textarea
          {...rest}
          ref={mergedRef}
          value={value}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => {
            onValueChange(e.target.value)
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
            const consumed: boolean = slash.onKeyDown(e)
            if (!consumed) {
              onKeyDown?.(e)
            }
          }}
          onInput={(e: React.FormEvent<HTMLTextAreaElement>): void => {
            slash.onInput()
            onInput?.(e)
          }}
          onSelect={(e: React.SyntheticEvent<HTMLTextAreaElement>): void => {
            slash.onSelectCapture()
            onSelect?.(e)
          }}
        />
        {slash.menuPortal}
      </>
    )
  }
)

VariableSlashTextarea.displayName = 'VariableSlashTextarea'