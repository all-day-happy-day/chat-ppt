import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { useCreateProjectVariable, useDeleteProjectVariable, usePatchProjectVariable } from '@/api/query/project.query'
import type { ProjectVariable } from '@/domain/models/project'
import { cn } from '@/lib/utils'

import { useProjectVariablesScope } from './project-variables-scope-context'

type VariablesPanelState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly name: string }

const POPOVER_ELEMENT_ID: string = 'project-variable-bar-popover'

export function ProjectVariablesBar(): React.ReactElement {
  const { t } = useTranslation()
  const { projectId, variables, colorForName, isLoading } = useProjectVariablesScope()

  const createMut = useCreateProjectVariable()
  const patchMut = usePatchProjectVariable()
  const deleteMut = useDeleteProjectVariable()

  const [panel, setPanel] = React.useState<VariablesPanelState>({ mode: 'closed' })
  const [draftName, setDraftName] = React.useState<string>('')
  const [draftValue, setDraftValue] = React.useState<string>('')
  const [popoverValueDraft, setPopoverValueDraft] = React.useState<string>('')

  const createAnchorRef = React.useRef<HTMLButtonElement | null>(null)
  const editAnchorRef = React.useRef<HTMLButtonElement | null>(null)
  const [popoverCoords, setPopoverCoords] = React.useState<{ top: number; left: number } | null>(null)

  const editVariable: ProjectVariable | undefined = React.useMemo((): ProjectVariable | undefined => {
    if (panel.mode !== 'edit') {
      return undefined
    }
    return variables.find((v: ProjectVariable): boolean => v.name === panel.name)
  }, [panel, variables])

  /* eslint-disable react-hooks/set-state-in-effect -- sync fixed popover position to anchor after layout; refs are ready. */
  React.useLayoutEffect((): void => {
    if (panel.mode === 'closed') {
      setPopoverCoords(null)
      return
    }
    const anchorEl: HTMLButtonElement | null = panel.mode === 'create' ? createAnchorRef.current : editAnchorRef.current
    if (anchorEl === null) {
      setPopoverCoords(null)
      return
    }
    const r: DOMRect = anchorEl.getBoundingClientRect()
    setPopoverCoords({ top: Math.round(r.bottom + 6), left: Math.round(r.left) })
  }, [panel, variables])
  /* eslint-enable react-hooks/set-state-in-effect */

  const showCreatePanel: boolean = panel.mode === 'create'
  const showEditPanel: boolean = panel.mode === 'edit' && editVariable !== undefined

  React.useEffect((): void | (() => void) => {
    if (panel.mode === 'closed') {
      return
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPanel({ mode: 'closed' })
      }
    }
    window.addEventListener('keydown', onKey)
    return (): void => {
      window.removeEventListener('keydown', onKey)
    }
  }, [panel.mode])

  const repositionPopover = React.useCallback((): void => {
    if (panel.mode === 'closed') {
      return
    }
    const anchorEl: HTMLButtonElement | null = panel.mode === 'create' ? createAnchorRef.current : editAnchorRef.current
    if (anchorEl === null) {
      return
    }
    const r: DOMRect = anchorEl.getBoundingClientRect()
    setPopoverCoords({ top: Math.round(r.bottom + 6), left: Math.round(r.left) })
  }, [panel.mode])

  React.useEffect((): void | (() => void) => {
    if (panel.mode === 'closed') {
      return
    }
    window.addEventListener('scroll', repositionPopover, true)
    return (): void => {
      window.removeEventListener('scroll', repositionPopover, true)
    }
  }, [panel.mode, repositionPopover])

  React.useEffect((): void | (() => void) => {
    if (panel.mode === 'closed') {
      return
    }
    const onDoc = (e: MouseEvent): void => {
      const target: Node | null = e.target as Node | null
      const pop: HTMLElement | null = document.getElementById(POPOVER_ELEMENT_ID)
      if (target !== null && pop !== null && pop.contains(target)) {
        return
      }
      if (target !== null && createAnchorRef.current !== null && createAnchorRef.current.contains(target)) {
        return
      }
      if (target !== null && editAnchorRef.current !== null && editAnchorRef.current.contains(target)) {
        return
      }
      setPanel({ mode: 'closed' })
    }
    document.addEventListener('mousedown', onDoc, true)
    return (): void => {
      document.removeEventListener('mousedown', onDoc, true)
    }
  }, [panel.mode])

  const handleCreate = async (): Promise<void> => {
    const name: string = draftName.trim()
    if (name.length === 0) {
      toast.error(t('page.project_view.variables_name_required'))
      return
    }
    try {
      await createMut.mutateAsync({
        projectId,
        requestBody: { name, value: draftValue },
      })
      setDraftName('')
      setDraftValue('')
      setPanel({ mode: 'closed' })
    } catch {
      toast.error(t('page.project_view.variables_create_failed'))
    }
  }

  const handlePopoverBlurSave = async (): Promise<void> => {
    if (editVariable === undefined) {
      return
    }
    if (popoverValueDraft === editVariable.value) {
      return
    }
    try {
      await patchMut.mutateAsync({
        projectId,
        name: editVariable.name,
        requestBody: { value: popoverValueDraft },
      })
    } catch {
      toast.error(t('page.project_view.variables_patch_failed'))
      setPopoverValueDraft(editVariable.value)
    }
  }

  const handleDelete = async (name: string): Promise<void> => {
    try {
      await deleteMut.mutateAsync({ projectId, name })
      setPanel({ mode: 'closed' })
    } catch {
      toast.error(t('page.project_view.variables_delete_failed'))
    }
  }

  const openCreate = (): void => {
    setPanel((prev: VariablesPanelState): VariablesPanelState => {
      if (prev.mode === 'create') {
        return { mode: 'closed' }
      }
      setDraftName('')
      setDraftValue('')
      return { mode: 'create' }
    })
  }

  return (
    <div className="border-border/40 bg-muted/20 shrink-0 border-b">
      <div
        className="scrollbar-hide flex min-w-0 items-center gap-1.5 overflow-x-auto px-1.5 py-1"
        title={t('page.project_view.variables_insert_hint')}
      >
        <span className="text-muted-foreground shrink-0 px-1 text-[10px] font-semibold tracking-[0.08em] uppercase">
          {t('page.project_view.variables_bar_title')}
        </span>
        {isLoading ? (
          <span className="text-muted-foreground shrink-0 px-1 text-[10px]">…</span>
        ) : variables.length === 0 && panel.mode !== 'create' ? (
          <span className="text-muted-foreground shrink-0 px-1 text-[10px]">
            {t('page.project_view.variables_insert_hint')}
          </span>
        ) : null}
        {variables.map((v: ProjectVariable): React.ReactElement => {
          const colors = colorForName(v.name)
          const isEditOpen: boolean = panel.mode === 'edit' && panel.name === v.name
          return (
            <button
              key={v.name}
              type="button"
              ref={isEditOpen ? editAnchorRef : undefined}
              onClick={(): void => {
                setPanel((prev: VariablesPanelState): VariablesPanelState => {
                  if (prev.mode === 'edit' && prev.name === v.name) {
                    return { mode: 'closed' }
                  }
                  setPopoverValueDraft(v.value)
                  return { mode: 'edit', name: v.name }
                })
              }}
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-sm transition',
                'focus-visible:ring-ring border-transparent outline-none focus-visible:ring-2',
                isEditOpen && 'ring-ring ring-offset-background ring-2 ring-offset-1'
              )}
              style={{ backgroundColor: colors.background, color: colors.foreground }}
            >
              {v.name}
            </button>
          )
        })}
        <button
          ref={createAnchorRef}
          type="button"
          aria-label={t('page.project_view.variables_add_aria')}
          title={t('page.project_view.variables_add_aria')}
          onClick={openCreate}
          className={cn(
            'border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:ring-ring flex size-6 shrink-0 items-center justify-center rounded-full border bg-transparent outline-none focus-visible:ring-2',
            panel.mode === 'create' && 'ring-ring ring-offset-background ring-2 ring-offset-1'
          )}
        >
          <PlusIcon aria-hidden className="size-3.5" />
        </button>
      </div>

      {(showCreatePanel || showEditPanel) && popoverCoords !== null ? (
        <div
          id={POPOVER_ELEMENT_ID}
          role="dialog"
          aria-label={
            showCreatePanel ? t('page.project_view.variables_add_aria') : panel.mode === 'edit' ? panel.name : ''
          }
          className="border-border bg-popover text-popover-foreground w-13.5rem fixed z-120 rounded-lg border p-2.5 text-xs shadow-lg"
          style={{ top: popoverCoords.top, left: popoverCoords.left }}
        >
          {showCreatePanel ? (
            <div className="flex flex-col gap-2">
              <label className="block">
                <span className="text-muted-foreground mb-0.5 block text-[10px] font-medium">
                  {t('page.project_view.variables_name_label')}
                </span>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraftName(e.target.value)
                  }}
                  placeholder={t('page.project_view.variables_new_name_placeholder')}
                  autoComplete="off"
                  className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-md border px-2 py-1 text-xs outline-none focus-visible:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-0.5 block text-[10px] font-medium">
                  {t('page.project_view.variables_value_label')}
                </span>
                <input
                  type="text"
                  value={draftValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraftValue(e.target.value)
                  }}
                  placeholder={t('page.project_view.variables_new_value_placeholder')}
                  autoComplete="off"
                  className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-md border px-2 py-1 text-xs outline-none focus-visible:ring-2"
                />
              </label>
              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1 text-[11px] outline-none focus-visible:ring-2"
                  onClick={(): void => {
                    setPanel({ mode: 'closed' })
                  }}
                >
                  {t('page.project_view.variables_cancel_create')}
                </button>
                <button
                  type="button"
                  disabled={createMut.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring rounded-md px-2.5 py-1 text-[11px] font-medium outline-none focus-visible:ring-2 disabled:opacity-50"
                  onClick={(): void => {
                    void handleCreate()
                  }}
                >
                  {createMut.isPending ? '…' : t('page.project_view.variables_create')}
                </button>
              </div>
            </div>
          ) : showEditPanel && editVariable !== undefined ? (
            <div className="flex flex-col gap-2">
              <p
                className="text-muted-foreground font-mono text-[11px] leading-tight font-semibold tracking-tight"
                title={editVariable.name}
              >
                {editVariable.name}
              </p>
              <label className="block">
                <span className="text-muted-foreground mb-0.5 block text-[10px] font-medium">
                  {t('page.project_view.variables_value_label')}
                </span>
                <input
                  type="text"
                  value={popoverValueDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    setPopoverValueDraft(e.target.value)
                  }}
                  onBlur={(): void => {
                    void handlePopoverBlurSave()
                  }}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 w-full rounded-md border px-2 py-1 text-xs outline-none focus-visible:ring-2"
                />
              </label>
              <div className="border-border/40 flex justify-end border-t pt-1.5">
                <button
                  type="button"
                  aria-label={t('page.project_view.variables_delete_aria')}
                  className="text-muted-foreground hover:text-destructive focus-visible:ring-ring rounded-md p-1 outline-none focus-visible:ring-2"
                  onClick={(): void => {
                    void handleDelete(editVariable.name)
                  }}
                  disabled={deleteMut.isPending}
                >
                  <Trash2Icon aria-hidden className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
