import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { QUERY_KEY } from '@/api/query/key'
import { useListLayouts, useListTemplates } from '@/api/query/powerpoint.query'
import {
  useCreateProjectContainer,
  useGetProjectContainers,
  useGetProjects,
  usePatchProject,
  usePatchProjectContainer,
} from '@/api/query/project.query'
import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import { Button } from '@/components/ui/button/Button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import { shapePlaceholderApiName } from '@/domain/models/powerpoint'
import type {
  BiblePart,
  LyricsPart,
  Part,
  PartRequestBody,
  PlainPart,
  Project,
  ProjectContainer,
  ValuePart,
} from '@/domain/models/project'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import type { Size } from '@/domain/valueobjects/powerpoint'
import { generatePartUlid } from '@/lib/generate-ulid'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import {
  buildProjectPartsPatchPayload,
  isPartIncompleteForPptExport,
  normalizeBiblePartForStore,
  normalizeLyricsPartForStore,
  workspaceHasIncompletePartsForPptExport,
  workspaceSignature,
} from './build-project-parts-patch-payload'
import { ProjectBibleEditor } from './ProjectBibleEditor'
import { ProjectLyricsEditor } from './ProjectLyricsEditor'
import { ProjectValuePlainEditor } from './ProjectValuePlainEditor'

import type { TFunction } from 'i18next'
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'

type PartKind = Part['type']

interface LocalSlide {
  readonly id: string
  readonly partType: PartKind
}

/** Client-side mirror of server parts for PATCH + editor; keyed by part id (ULID). */
type PartsRecord = Record<string, Part>

function partsRecordFromParts(parts: readonly Part[]): PartsRecord {
  const out: PartsRecord = {}
  for (const p of parts) {
    if (p.type === 'LYRICS') {
      out[p.id] = normalizeLyricsPartForStore(p)
      continue
    }
    if (p.type === 'BIBLE') {
      out[p.id] = normalizeBiblePartForStore(p)
      continue
    }
    out[p.id] = p
  }
  return out
}

function partsPatchPayloadFromProject(project: Project): PartRequestBody[] {
  const sorted: Part[] = [...project.parts].sort((a: Part, b: Part): number => a.order - b.order)
  const localSlides: LocalSlide[] = sorted.map(
    (p: Part): LocalSlide => ({ id: p.id, partType: p.type })
  )
  const partsById: Map<string, Part> = new Map(sorted.map((p: Part): readonly [string, Part] => [p.id, p]))
  return buildProjectPartsPatchPayload(localSlides, partsById)
}

function createSyntheticPartForInsert(id: string, kind: PartKind, projectId: string, containerId: string): Part {
  const base: Pick<Part, 'id' | 'projectId' | 'containerId' | 'order'> = {
    id,
    projectId,
    containerId,
    order: 0,
  }
  switch (kind) {
    case 'PLAIN':
      return { ...base, type: 'PLAIN', contents: { type: 'PLAIN' }, layoutId: null }
    case 'VALUE':
      return {
        ...base,
        type: 'VALUE',
        contents: {
          type: 'VALUE',
          contents: [{ placeholderName: 'value', value: null }],
        },
        layoutId: null,
      }
    case 'LYRICS':
      return {
        ...base,
        type: 'LYRICS',
        contents: {
          type: 'LYRICS',
          contents: [],
          includeTitleForFirstCard: true,
        },
        lyricsLayoutId: null,
        titleLayoutId: null,
      }
    case 'BIBLE':
      return {
        ...base,
        type: 'BIBLE',
        contents: { type: 'BIBLE', contents: [] },
        phraseLayoutId: null,
        titleLayoutId: null,
      }
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unexpected part kind: ${String(_exhaustive)}`)
    }
  }
}

function layoutSlideAspect(layout: Layout, fallbackSlideSize: Size): number {
  const w: number = layout.slideSize.width > 0 ? layout.slideSize.width : fallbackSlideSize.width
  const h: number = layout.slideSize.height > 0 ? layout.slideSize.height : fallbackSlideSize.height
  return Math.max(h, 1) / Math.max(w, 1)
}

/** Merge VALUE placeholder strings into layout shapes for sidebar / thumbnail preview. */
function mergeValuePartIntoLayoutThumb(layout: Layout, part: ValuePart): Layout {
  const prevByShapeId: Map<string, string | null> = new Map<string, string | null>()
  const prevByName: Map<string, string | null> = new Map<string, string | null>()
  for (const row of part.contents.contents) {
    if (row.placeholderShapeId !== undefined && row.placeholderShapeId !== null && row.placeholderShapeId.length > 0) {
      prevByShapeId.set(row.placeholderShapeId, row.value)
    }
    prevByName.set(row.placeholderName, row.value)
  }
  return {
    ...layout,
    shapes: layout.shapes.map((shape: Shape): Shape => {
      if (!shape.placeholder) {
        return shape
      }
      const fromId: string | null | undefined = prevByShapeId.get(shape.id)
      const value: string | null | undefined =
        fromId !== undefined ? fromId : prevByName.get(shapePlaceholderApiName(shape))
      if (value === null || value === undefined) {
        return shape
      }
      return { ...shape, text: value }
    }),
  }
}

/** Resolved layout (+ merged values) for a workspace part, or undefined when no slide preview. */
function thumbLayoutForPart(part: Part | undefined, layouts: readonly Layout[]): Layout | undefined {
  if (part === undefined) {
    return undefined
  }
  if (part.type !== 'VALUE' && part.type !== 'PLAIN') {
    return undefined
  }
  if (part.layoutId === null || part.layoutId.length === 0) {
    return undefined
  }
  const base: Layout | undefined = layouts.find((l: Layout): boolean => l.id === part.layoutId)
  if (base === undefined) {
    return undefined
  }
  if (part.type === 'VALUE') {
    return mergeValuePartIntoLayoutThumb(base, part)
  }
  return base
}

function fitContentBoxPx(
  slotWidthPx: number,
  slotHeightPx: number,
  contentHeightOverWidth: number
): {
  widthPx: number
  heightPx: number
} {
  if (slotWidthPx <= 0 || slotHeightPx <= 0) {
    return { widthPx: 0, heightPx: 0 }
  }
  let widthPx: number = slotWidthPx
  let heightPx: number = widthPx * contentHeightOverWidth
  if (heightPx > slotHeightPx) {
    heightPx = slotHeightPx
    widthPx = heightPx / contentHeightOverWidth
  }
  return { widthPx, heightPx }
}

function fitMainStagePreviewBoxPx(
  slotWidthPx: number,
  slotHeightPx: number,
  contentAspectHW: number,
  topChromePx: number,
  cardPadX: number,
  cardPadTop: number,
  cardPadBottom: number
): { widthPx: number; heightPx: number; slideMaxWidthPx: number } {
  if (slotWidthPx <= 0 || slotHeightPx <= 0) {
    return { widthPx: 0, heightPx: 0, slideMaxWidthPx: 0 }
  }
  const innerW: number = Math.max(0, slotWidthPx - 2 * cardPadX)
  const innerH: number = Math.max(0, slotHeightPx - cardPadTop - cardPadBottom)
  const slideAvailH: number = Math.max(0, innerH - topChromePx)
  if (slideAvailH <= 0 || innerW <= 0) {
    return {
      widthPx: Math.min(slotWidthPx, 2 * cardPadX),
      heightPx: Math.min(slotHeightPx, topChromePx + cardPadTop + cardPadBottom),
      slideMaxWidthPx: 0,
    }
  }
  let slideW: number = Math.min(innerW, slideAvailH / contentAspectHW)
  let slideH: number = slideW * contentAspectHW
  if (slideH > slideAvailH) {
    slideH = slideAvailH
    slideW = slideH / contentAspectHW
  }
  const widthPx: number = slideW + 2 * cardPadX
  const heightPx: number = topChromePx + slideH + cardPadTop + cardPadBottom
  return { widthPx, heightPx, slideMaxWidthPx: Math.max(1, Math.floor(slideW)) }
}

const PART_KINDS: readonly PartKind[] = ['VALUE', 'PLAIN', 'LYRICS', 'BIBLE'] as const

/** Before sidebar list width is measured; also used if ref is missing. */
const SIDEBAR_THUMB_SLIDE_WIDTH_FALLBACK_PX: number = 108
/**
 * Subtract from list inner width for: index column, grid gap, thumbnail column horizontal padding
 * (`px-1.5`), and a little air so ring/border does not clip at the scrollbar edge.
 */
const SIDEBAR_THUMB_LAYOUT_RESERVE_PX: number = 44

function partsToLocalSlides(parts: Part[]): LocalSlide[] {
  return [...parts]
    .sort((a: Part, b: Part): number => a.order - b.order)
    .map(
      (p: Part): LocalSlide => ({
        id: p.id,
        partType: p.type,
      })
    )
}

function reorderSlides(slides: readonly LocalSlide[], fromIndex: number, toIndex: number): LocalSlide[] {
  if (fromIndex === toIndex) {
    return [...slides]
  }
  const next: LocalSlide[] = [...slides]
  const [moved]: LocalSlide[] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function insertSlideAt(slides: readonly LocalSlide[], insertIndex: number, slide: LocalSlide): LocalSlide[] {
  const safeIndex: number = Math.max(0, Math.min(insertIndex, slides.length))
  return [...slides.slice(0, safeIndex), slide, ...slides.slice(safeIndex)]
}

/** Single-line caption row + `gap-1` above slide; keep in sync with `StagePartLayoutCaption` + flex gap. */
const MAIN_STAGE_PREVIEW_TOP_CHROME_PX = 20
/** Card horizontal padding; vertical kept smaller so preview sits higher. */
const MAIN_STAGE_CARD_EDGE_PADDING_PX = 8
const MAIN_STAGE_CARD_PADDING_TOP_PX = 4
const MAIN_STAGE_CARD_PADDING_BOTTOM_PX = 8

/** `height / width` for the main stage when no template layout is selected. */
const DEFAULT_STAGE_ASPECT_HW = 9 / 16

function partKindLabel(t: TFunction, kind: PartKind): string {
  switch (kind) {
    case 'VALUE':
      return t('page.project_view.part_value')
    case 'PLAIN':
      return t('page.project_view.part_plain')
    case 'LYRICS':
      return t('page.project_view.part_lyrics')
    case 'BIBLE':
      return t('page.project_view.part_bible')
    default: {
      const _exhaustive: never = kind
      return String(_exhaustive)
    }
  }
}

/** API / slide caption: `VALUE · LAYOUT NAME` uses the part type code, not the translated label. */
function partKindTypeCode(kind: PartKind): string {
  return kind
}

/** Part kind + optional layout name — uppercase, mono, middle dot · between. */
interface StagePartLayoutCaptionProps {
  readonly partKindText: string
  readonly layoutName: string | null
}

function StagePartLayoutCaption({ partKindText, layoutName }: StagePartLayoutCaptionProps): ReactElement {
  const kindUpper: string = partKindText.toUpperCase()
  const layoutTrimmed: string | null = layoutName !== null && layoutName.trim().length > 0 ? layoutName.trim() : null
  const layoutUpper: string | null = layoutTrimmed !== null ? layoutTrimmed.toUpperCase() : null
  const ariaLabel: string = layoutUpper !== null ? `${kindUpper} · ${layoutUpper}` : kindUpper
  const wordClass: string =
    'font-mono text-[10px] font-semibold leading-none tracking-[0.2em] text-foreground/85 uppercase md:text-[11px]'
  const layoutWordClass: string = cn(wordClass, 'min-w-0 max-w-[min(18rem,78%)] truncate text-foreground/70')
  const dotClass: string =
    'font-mono select-none text-[10px] font-semibold leading-none text-foreground/45 md:text-[11px]'
  return (
    <p
      className="m-0 flex max-w-full min-w-0 shrink-0 flex-row flex-wrap items-center justify-center gap-x-1.5"
      aria-label={ariaLabel}
    >
      <span className={wordClass}>{kindUpper}</span>
      {layoutUpper !== null && layoutTrimmed !== null ? (
        <>
          <span className={dotClass} aria-hidden>
            {'\u00B7'}
          </span>
          <span className={layoutWordClass} title={layoutTrimmed}>
            {layoutUpper}
          </span>
        </>
      ) : null}
    </p>
  )
}

interface ContainerNameDialogProps {
  readonly open: boolean
  readonly title: string
  readonly nameLabel: string
  readonly namePlaceholder: string
  readonly nameValue: string
  readonly onNameChange: (value: string) => void
  readonly cancelLabel: string
  readonly confirmLabel: string
  readonly confirmLoading: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

function ContainerNameDialog({
  open,
  title,
  nameLabel,
  namePlaceholder,
  nameValue,
  onNameChange,
  cancelLabel,
  confirmLabel,
  confirmLoading,
  onCancel,
  onConfirm,
}: ContainerNameDialogProps): React.ReactElement | null {
  React.useEffect((): void | (() => void) => {
    if (!open) {
      return
    }
    const onKeyDown = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="container-name-dialog-title"
        className={cn(
          'border-border bg-popover text-popover-foreground relative z-10 w-full max-w-md rounded-lg border p-6 shadow-lg'
        )}
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation()
        }}
      >
        <h2 id="container-name-dialog-title" className="text-foreground text-lg font-semibold">
          {title}
        </h2>
        <label className="mt-4 block text-left">
          <span className="text-muted-foreground text-xs font-medium">{nameLabel}</span>
          <input
            type="text"
            autoComplete="off"
            value={nameValue}
            disabled={confirmLoading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              onNameChange(e.target.value)
            }}
            placeholder={namePlaceholder}
            className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 mt-1 w-full rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} loading={confirmLoading} loadingLabel={confirmLabel}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface ProjectWorkspaceProps {
  readonly workspaceKind: 'project' | 'container'
  readonly project: Project
  readonly userId: string
  /** Required when `workspaceKind` is `container`. */
  readonly container: ProjectContainer | undefined
  /** Notifies parent when PPT-export readiness changes (slide / Bible UI validation). */
  readonly onWorkspaceExportIncompleteChange?: (incomplete: boolean) => void
}

export type ProjectWorkspaceHandle = {
  readonly persistPendingWorkspace: () => Promise<void>
  readonly isExportIncomplete: () => boolean
}

function defaultContainerIdForInsert(
  workspaceKind: 'project' | 'container',
  project: Project,
  container: ProjectContainer | undefined,
  prevRecord: PartsRecord
): string {
  if (workspaceKind === 'container' && container !== undefined) {
    return container.id
  }
  return Object.values(prevRecord)[0]?.containerId ?? project.parts[0]?.containerId ?? ''
}

const ProjectWorkspace = React.forwardRef<ProjectWorkspaceHandle, ProjectWorkspaceProps>(
  function ProjectWorkspace(
    {
      workspaceKind,
      project,
      userId,
      container,
      onWorkspaceExportIncompleteChange,
    }: ProjectWorkspaceProps,
    ref: React.ForwardedRef<ProjectWorkspaceHandle>
  ): ReactElement {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const patchProject = usePatchProject()
  const patchContainer = usePatchProjectContainer()

  const templatesQuery = useListTemplates(userId)
  const templates: TemplateResponse[] | undefined = getQueryData(templatesQuery)
  const templateRow: TemplateResponse | undefined = templates?.find(
    (row: TemplateResponse): boolean => row.templateId === project.templateId
  )
  const templateDisplayName: string =
    templateRow?.name ?? (project.templateId.length > 0 ? project.templateId : t('page.project_view.template_unknown'))
  const templateSlideSize: Size | undefined = templateRow?.layoutSize
  const templateFallbackSize: Size = React.useMemo((): Size => {
    if (templateSlideSize !== undefined) {
      return templateSlideSize
    }
    return { width: 960, height: 540 }
  }, [templateSlideSize])

  const layoutsQuery = useListLayouts(project.templateId)
  const layouts: Layout[] = React.useMemo((): Layout[] => layoutsQuery.data?.layouts ?? [], [layoutsQuery.data])

  const workspaceBootstrapRef = React.useRef<string>('')
  const [localSlides, setLocalSlides] = React.useState<LocalSlide[]>((): LocalSlide[] =>
    partsToLocalSlides(project.parts)
  )
  const [partsRecord, setPartsRecord] = React.useState<PartsRecord>(
    (): PartsRecord => partsRecordFromParts(project.parts)
  )
  const [selectedId, setSelectedId] = React.useState<string | null>((): string | null => {
    const slides: LocalSlide[] = partsToLocalSlides(project.parts)
    return slides[0]?.id ?? null
  })
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dragOverThumbIndex, setDragOverThumbIndex] = React.useState<number | null>(null)
  const [hoverInsertIndex, setHoverInsertIndex] = React.useState<number | null>(null)
  const skipNextClickSelectRef = React.useRef<boolean>(false)
  const partsSnapshotRef = React.useRef<Map<string, Part>>(new Map())
  const lastSavedSignatureRef = React.useRef<string | null>(null)
  const pendingSaveSignatureRef = React.useRef<string | null>(null)
  const localSlidesRef = React.useRef<LocalSlide[]>([])
  const [isEditPanelOpen, setIsEditPanelOpen] = React.useState<boolean>(false)
  const [deleteConfirmSlideId, setDeleteConfirmSlideId] = React.useState<string | null>(null)
  const [placeholderFocus, setPlaceholderFocus] = React.useState<{
    readonly slideId: string
    readonly shapeId: string
  } | null>(null)
  /** Bible phrase cards: editor-reported errors (probe, invalid verse, books/chapters fetch errors). */
  const [bibleBlockingUiByPartId, setBibleBlockingUiByPartId] = React.useState<Record<string, boolean>>({})

  const handleBibleEditorBlockingUiChange = React.useCallback((partId: string, blocking: boolean): void => {
    setBibleBlockingUiByPartId((prev: Record<string, boolean>): Record<string, boolean> => {
      if (blocking) {
        if (prev[partId] === true) {
          return prev
        }
        return { ...prev, [partId]: true }
      }
      if (prev[partId] !== true) {
        return prev
      }
      const next: Record<string, boolean> = { ...prev }
      delete next[partId]
      return next
    })
  }, [])

  const bibleUiBlockedPartIds: ReadonlySet<string> = React.useMemo((): ReadonlySet<string> => {
    return new Set<string>(
      Object.keys(bibleBlockingUiByPartId).filter((id: string): boolean => bibleBlockingUiByPartId[id] === true)
    )
  }, [bibleBlockingUiByPartId])

  const workspaceExportIncomplete: boolean = workspaceHasIncompletePartsForPptExport(
    localSlides,
    partsRecord,
    bibleUiBlockedPartIds
  )

  React.useEffect((): void => {
    if (onWorkspaceExportIncompleteChange === undefined) {
      return
    }
    onWorkspaceExportIncompleteChange(workspaceExportIncomplete)
  }, [onWorkspaceExportIncompleteChange, workspaceExportIncomplete])

  const slideStageSlotRef = React.useRef<HTMLDivElement | null>(null)
  const slideListInnerRef = React.useRef<HTMLDivElement | null>(null)
  const [sidebarThumbMaxPx, setSidebarThumbMaxPx] = React.useState<number>(SIDEBAR_THUMB_SLIDE_WIDTH_FALLBACK_PX)
  const [stageSlotPx, setStageSlotPx] = React.useState<{ widthPx: number; heightPx: number }>({
    widthPx: 0,
    heightPx: 0,
  })

  const patchProjectRef = React.useRef<ReturnType<typeof usePatchProject>>(patchProject)
  const patchContainerRef = React.useRef<ReturnType<typeof usePatchProjectContainer>>(patchContainer)
  const queryClientRef = React.useRef<ReturnType<typeof useQueryClient>>(queryClient)
  const partsRecordRef = React.useRef<PartsRecord>(partsRecord)

  React.useLayoutEffect((): void => {
    partsRecordRef.current = partsRecord
  }, [partsRecord])

  React.useEffect((): void => {
    patchProjectRef.current = patchProject
  }, [patchProject])

  React.useEffect((): void => {
    patchContainerRef.current = patchContainer
  }, [patchContainer])

  React.useEffect((): void => {
    queryClientRef.current = queryClient
  }, [queryClient])

  React.useLayoutEffect((): void => {
    localSlidesRef.current = localSlides
  }, [localSlides])

  const finalizePatchSuccess = React.useCallback(
    (updatedParts: Part[], onFullSync?: (() => void) | undefined): void => {
      const mergedMap: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
      const currentSignature: string = workspaceSignature(localSlidesRef.current, mergedMap)
      const nextRecord: PartsRecord = partsRecordFromParts(updatedParts)
      if (pendingSaveSignatureRef.current !== currentSignature) {
        setPartsRecord(nextRecord)
        partsSnapshotRef.current = new Map(Object.entries(nextRecord))
        pendingSaveSignatureRef.current = null
        return
      }
      const nextSlides: LocalSlide[] = partsToLocalSlides(updatedParts)
      setLocalSlides(nextSlides)
      localSlidesRef.current = nextSlides
      setPartsRecord(nextRecord)
      partsSnapshotRef.current = new Map(Object.entries(nextRecord))
      lastSavedSignatureRef.current = workspaceSignature(nextSlides, new Map(Object.entries(nextRecord)))
      pendingSaveSignatureRef.current = null
      onFullSync?.()
    },
    []
  )

  const flushWorkspaceToServer = React.useCallback((): void => {
    if (lastSavedSignatureRef.current === null) {
      return
    }
    const latestSlides: LocalSlide[] = localSlidesRef.current
    const latestParts: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
    const payloadSignature: string = workspaceSignature(latestSlides, latestParts)
    if (payloadSignature === lastSavedSignatureRef.current) {
      return
    }

    pendingSaveSignatureRef.current = payloadSignature
    const partsPayload: PartRequestBody[] = buildProjectPartsPatchPayload(latestSlides, latestParts)

    if (workspaceKind === 'project') {
      patchProjectRef.current.mutate(
        {
          projectId: project.id,
          userId,
          requestBody: { name: null, templateId: null, parts: partsPayload },
        },
        {
          onSuccess: (updated: Project): void => {
            finalizePatchSuccess(updated.parts, (): void => {
              queryClientRef.current.setQueryData(
                QUERY_KEY.PROJECT.GET_ALL(userId),
                (previous: Project[] | undefined): Project[] | undefined => {
                  if (previous === undefined) {
                    return previous
                  }
                  return previous.map((row: Project): Project => (row.id === updated.id ? updated : row))
                }
              )
            })
          },
          onError: (error: unknown): void => {
            pendingSaveSignatureRef.current = null
            const detail: string = error instanceof Error ? error.message : ''
            toast.error(
              detail.length > 0
                ? `${t('page.project_view.autosave_failed')} (${detail})`
                : t('page.project_view.autosave_failed')
            )
          },
        }
      )
      return
    }

    if (container === undefined) {
      pendingSaveSignatureRef.current = null
      return
    }

    patchContainerRef.current.mutate(
      {
        projectContainerId: container.id,
        requestBody: { containerName: null, completed: null, parts: partsPayload },
      },
      {
        onSuccess: (updated: ProjectContainer): void => {
          finalizePatchSuccess(updated.parts, (): void => {
            queryClientRef.current.setQueryData(
              QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(updated.projectId),
              (previous: ProjectContainer[] | undefined): ProjectContainer[] | undefined => {
                if (previous === undefined) {
                  return [updated]
                }
                return previous.map(
                  (row: ProjectContainer): ProjectContainer => (row.id === updated.id ? updated : row)
                )
              }
            )
          })
        },
        onError: (error: unknown): void => {
          pendingSaveSignatureRef.current = null
          const detail: string = error instanceof Error ? error.message : ''
          toast.error(
            detail.length > 0
              ? `${t('page.project_view.autosave_container_failed')} (${detail})`
              : t('page.project_view.autosave_container_failed')
          )
        },
      }
    )
  }, [workspaceKind, container, project.id, finalizePatchSuccess, t, userId])

  const persistWorkspaceNowAsync = React.useCallback(async (): Promise<void> => {
    if (lastSavedSignatureRef.current === null) {
      return
    }
    const latestSlides: LocalSlide[] = localSlidesRef.current
    const latestParts: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
    const payloadSignature: string = workspaceSignature(latestSlides, latestParts)
    if (payloadSignature === lastSavedSignatureRef.current) {
      return
    }
    pendingSaveSignatureRef.current = payloadSignature
    const partsPayload: PartRequestBody[] = buildProjectPartsPatchPayload(latestSlides, latestParts)
    try {
      if (workspaceKind === 'project') {
        const updated: Project = await patchProject.mutateAsync({
          projectId: project.id,
          userId,
          requestBody: { name: null, templateId: null, parts: partsPayload },
        })
        finalizePatchSuccess(updated.parts, (): void => {
          queryClient.setQueryData(
            QUERY_KEY.PROJECT.GET_ALL(userId),
            (previous: Project[] | undefined): Project[] | undefined => {
              if (previous === undefined) {
                return previous
              }
              return previous.map((row: Project): Project => (row.id === updated.id ? updated : row))
            }
          )
        })
        return
      }
      if (container === undefined) {
        pendingSaveSignatureRef.current = null
        throw new Error('container_missing')
      }
      const updatedContainer: ProjectContainer = await patchContainer.mutateAsync({
        projectContainerId: container.id,
        requestBody: { containerName: null, completed: null, parts: partsPayload },
      })
      finalizePatchSuccess(updatedContainer.parts, (): void => {
        queryClient.setQueryData(
          QUERY_KEY.PROJECT.GET_ALL_CONTAINERS(updatedContainer.projectId),
          (previous: ProjectContainer[] | undefined): ProjectContainer[] | undefined => {
            if (previous === undefined) {
              return [updatedContainer]
            }
            return previous.map(
              (row: ProjectContainer): ProjectContainer => (row.id === updatedContainer.id ? updatedContainer : row)
            )
          }
        )
      })
    } catch (err: unknown) {
      pendingSaveSignatureRef.current = null
      throw err
    }
  }, [workspaceKind, container, finalizePatchSuccess, patchContainer, patchProject, project.id, queryClient, userId])

  React.useImperativeHandle(
    ref,
    (): ProjectWorkspaceHandle => ({
      persistPendingWorkspace: persistWorkspaceNowAsync,
      isExportIncomplete: (): boolean => workspaceExportIncomplete,
    }),
    [persistWorkspaceNowAsync, workspaceExportIncomplete]
  )

  React.useLayoutEffect((): void | (() => void) => {
    const root: HTMLDivElement | null = slideListInnerRef.current
    if (root === null) {
      return
    }
    const applySidebarThumbWidth = (): void => {
      const innerW: number = root.clientWidth
      setSidebarThumbMaxPx(Math.max(96, Math.floor(innerW - SIDEBAR_THUMB_LAYOUT_RESERVE_PX)))
    }
    applySidebarThumbWidth()
    const observer: ResizeObserver = new ResizeObserver((): void => {
      applySidebarThumbWidth()
    })
    observer.observe(root)
    return (): void => {
      observer.disconnect()
    }
  }, [])

  React.useLayoutEffect((): void | (() => void) => {
    const slotEl: HTMLDivElement | null = slideStageSlotRef.current
    if (slotEl === null) {
      return
    }
    const applySizeFromElement = (el: HTMLDivElement): void => {
      const w: number = el.clientWidth
      const h: number = el.clientHeight
      setStageSlotPx({ widthPx: w, heightPx: h })
    }
    applySizeFromElement(slotEl)
    const observer: ResizeObserver = new ResizeObserver((): void => {
      applySizeFromElement(slotEl)
    })
    observer.observe(slotEl)
    return (): void => {
      observer.disconnect()
    }
  }, [])

  React.useEffect((): void => {
    const bootstrapKey: string = workspaceKind === 'project' ? project.id : `${project.id}:${container?.id ?? ''}`
    if (workspaceBootstrapRef.current === bootstrapKey) {
      return
    }
    workspaceBootstrapRef.current = bootstrapKey
    const seedParts: Part[] = workspaceKind === 'project' ? project.parts : (container?.parts ?? [])
    const initial: LocalSlide[] = partsToLocalSlides(seedParts)
    localSlidesRef.current = initial
    setLocalSlides(initial)
    setSelectedId(initial[0]?.id ?? null)
    const initialRecord: PartsRecord = partsRecordFromParts(seedParts)
    setPartsRecord(initialRecord)
    partsSnapshotRef.current = new Map(Object.entries(initialRecord))
    lastSavedSignatureRef.current = workspaceSignature(initial, new Map(Object.entries(initialRecord)))
    pendingSaveSignatureRef.current = null
    setIsEditPanelOpen(false)
    setDeleteConfirmSlideId(null)
    setPlaceholderFocus(null)
    setBibleBlockingUiByPartId({})
  }, [workspaceKind, project, container])

  const selectedSlide: LocalSlide | undefined = localSlides.find((s: LocalSlide): boolean => s.id === selectedId)
  const selectedPart: Part | undefined =
    selectedId !== null && selectedId.length > 0 ? partsRecord[selectedId] : undefined

  const mainStageLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (selectedPart === undefined) {
      return undefined
    }
    if (selectedPart.type !== 'VALUE' && selectedPart.type !== 'PLAIN') {
      return undefined
    }
    if (selectedPart.layoutId === null || selectedPart.layoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === selectedPart.layoutId)
  }, [layouts, selectedPart])

  const mainStageAspectHW: number = React.useMemo((): number => {
    if (mainStageLayout !== undefined) {
      return layoutSlideAspect(mainStageLayout, templateFallbackSize)
    }
    return DEFAULT_STAGE_ASPECT_HW
  }, [mainStageLayout, templateFallbackSize])

  const showMainLayoutSlidePreview: boolean =
    selectedSlide !== undefined &&
    (selectedSlide.partType === 'PLAIN' || selectedSlide.partType === 'VALUE') &&
    mainStageLayout !== undefined

  const mainStageBoxPx: {
    widthPx: number
    heightPx: number
    layoutSlideMaxWidthPx: number | null
  } = React.useMemo((): {
    widthPx: number
    heightPx: number
    layoutSlideMaxWidthPx: number | null
  } => {
    const sw: number = stageSlotPx.widthPx
    const sh: number = stageSlotPx.heightPx
    if (showMainLayoutSlidePreview) {
      const m: { widthPx: number; heightPx: number; slideMaxWidthPx: number } = fitMainStagePreviewBoxPx(
        sw,
        sh,
        mainStageAspectHW,
        MAIN_STAGE_PREVIEW_TOP_CHROME_PX,
        MAIN_STAGE_CARD_EDGE_PADDING_PX,
        MAIN_STAGE_CARD_PADDING_TOP_PX,
        MAIN_STAGE_CARD_PADDING_BOTTOM_PX
      )
      return {
        widthPx: m.widthPx,
        heightPx: m.heightPx,
        layoutSlideMaxWidthPx: m.slideMaxWidthPx,
      }
    }
    const plain: { widthPx: number; heightPx: number } = fitContentBoxPx(sw, sh, mainStageAspectHW)
    return { widthPx: plain.widthPx, heightPx: plain.heightPx, layoutSlideMaxWidthPx: null }
  }, [stageSlotPx, mainStageAspectHW, showMainLayoutSlidePreview])

  const effectiveHighlightPlaceholderShapeId: string | null =
    selectedId !== null && placeholderFocus !== null && placeholderFocus.slideId === selectedId
      ? placeholderFocus.shapeId
      : null

  React.useLayoutEffect((): void => {
    partsSnapshotRef.current = new Map(Object.entries(partsRecord))
  }, [partsRecord])

  const commitValuePlainPart = React.useCallback(
    (slideId: string, next: ValuePart | PlainPart, nextKind: 'VALUE' | 'PLAIN'): void => {
      setPartsRecord((prev: PartsRecord): PartsRecord => ({ ...prev, [slideId]: next }))
      setLocalSlides((prev: LocalSlide[]): LocalSlide[] =>
        prev.map((s: LocalSlide): LocalSlide => (s.id === slideId ? { ...s, partType: nextKind } : s))
      )
    },
    []
  )

  const commitLyricsPart = React.useCallback((slideId: string, next: LyricsPart): void => {
    setPartsRecord(
      (prev: PartsRecord): PartsRecord => ({
        ...prev,
        [slideId]: normalizeLyricsPartForStore(next),
      })
    )
  }, [])

  const commitBiblePart = React.useCallback((slideId: string, next: BiblePart): void => {
    setPartsRecord(
      (prev: PartsRecord): PartsRecord => ({
        ...prev,
        [slideId]: normalizeBiblePartForStore(next),
      })
    )
  }, [])

  const handleRemoveSlideById = React.useCallback((slideId: string): void => {
    setBibleBlockingUiByPartId((prev: Record<string, boolean>): Record<string, boolean> => {
      if (prev[slideId] !== true) {
        return prev
      }
      const next: Record<string, boolean> = { ...prev }
      delete next[slideId]
      return next
    })
    setPartsRecord((prev: PartsRecord): PartsRecord => {
      if (prev[slideId] === undefined) {
        return prev
      }
      const next: PartsRecord = { ...prev }
      delete next[slideId]
      return next
    })
    setLocalSlides((prev: LocalSlide[]): LocalSlide[] => {
      const idx: number = prev.findIndex((s: LocalSlide): boolean => s.id === slideId)
      if (idx < 0) {
        return prev
      }
      const next: LocalSlide[] = prev.filter((s: LocalSlide): boolean => s.id !== slideId)
      setSelectedId((sel: string | null): string | null => {
        if (sel !== slideId) {
          return sel
        }
        if (next.length === 0) {
          return null
        }
        return next[Math.max(0, idx - 1)]!.id
      })
      return next
    })
  }, [])

  const handleInsertAt = React.useCallback(
    (insertIndex: number, partType: PartKind): void => {
      const newId: string = generatePartUlid()
      const newSlide: LocalSlide = { id: newId, partType }
      setLocalSlides((prev: LocalSlide[]): LocalSlide[] => insertSlideAt(prev, insertIndex, newSlide))
      setSelectedId(newId)
      setPartsRecord((prev: PartsRecord): PartsRecord => {
        const containerId: string = defaultContainerIdForInsert(workspaceKind, project, container, prev)
        return {
          ...prev,
          [newId]: createSyntheticPartForInsert(newId, partType, project.id, containerId),
        }
      })
    },
    [container, project, workspaceKind]
  )

  const handleDragStart = React.useCallback(
    (slideId: string) =>
      (e: DragEvent): void => {
        setDraggingId(slideId)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', slideId)
        skipNextClickSelectRef.current = true
      },
    []
  )

  const handleDragEnd = React.useCallback((): void => {
    setDraggingId(null)
    setDragOverThumbIndex(null)
    window.setTimeout((): void => {
      skipNextClickSelectRef.current = false
    }, 0)
  }, [])

  const handleDragOverThumb = React.useCallback((e: DragEvent, thumbIndex: number): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverThumbIndex(thumbIndex)
  }, [])

  const handleDragLeaveThumb = React.useCallback((): void => {
    setDragOverThumbIndex(null)
  }, [])

  const handleDropOnThumb = React.useCallback((e: DragEvent<HTMLDivElement>, toIndex: number): void => {
    e.preventDefault()
    const fromId: string = e.dataTransfer.getData('text/plain')
    setLocalSlides((prev: LocalSlide[]): LocalSlide[] => {
      const fromIndex: number = prev.findIndex((s: LocalSlide): boolean => s.id === fromId)
      if (fromIndex < 0) {
        return prev
      }
      return reorderSlides(prev, fromIndex, toIndex)
    })
    setDragOverThumbIndex(null)
  }, [])

  React.useEffect((): void | (() => void) => {
    if (lastSavedSignatureRef.current === null) {
      return
    }
    const slides: LocalSlide[] = localSlidesRef.current
    const partsMap: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
    const signature: string = workspaceSignature(slides, partsMap)
    if (signature === lastSavedSignatureRef.current) {
      return
    }

    const timeoutId: ReturnType<typeof setTimeout> = window.setTimeout((): void => {
      flushWorkspaceToServer()
    }, 500)

    return (): void => {
      window.clearTimeout(timeoutId)
    }
  }, [flushWorkspaceToServer, localSlides, partsRecord])

  const slidePendingDelete: LocalSlide | undefined =
    deleteConfirmSlideId === null
      ? undefined
      : localSlides.find((s: LocalSlide): boolean => s.id === deleteConfirmSlideId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
      <header className="mx-auto w-full max-w-full shrink-0 text-center md:w-1/2 md:max-w-[50%]">
        <h1 className="text-muted-foreground/75 mb-2 text-2xl font-semibold tracking-tight md:mb-2 md:text-3xl lg:text-[1.85rem] lg:leading-snug">
          {workspaceKind === 'container' && container !== undefined ? container.containerName : project.name}
        </h1>
        <div className="mx-auto flex w-full justify-center px-2">
          <table className="border-border/40 text-muted-foreground/85 w-full max-w-xl border-collapse border-y text-xs md:text-sm">
            <tbody>
              {workspaceKind === 'container' ? (
                <tr className="border-border/40 border-b">
                  <th
                    scope="row"
                    className="text-muted-foreground/65 py-1.5 pr-5 text-right align-baseline font-normal whitespace-nowrap md:py-2 md:pr-6"
                  >
                    {t('page.project_view.project_name')}
                  </th>
                  <td className="text-muted-foreground/90 min-w-0 py-1.5 pl-0 text-left align-baseline md:py-2">
                    <span className="wrap-break-word">{project.name}</span>
                  </td>
                </tr>
              ) : null}
              <tr className="border-border/40 border-b">
                <th
                  scope="row"
                  className="text-muted-foreground/65 py-1.5 pr-5 text-right align-baseline font-normal whitespace-nowrap md:py-2 md:pr-6"
                >
                  {t('page.project_view.template_name')}
                </th>
                <td className="text-muted-foreground/90 min-w-0 py-1.5 pl-0 text-left align-baseline md:py-2">
                  <span className="wrap-break-word">{templateDisplayName}</span>
                </td>
              </tr>
              <tr className="border-border/40 border-b">
                <th
                  scope="row"
                  className="text-muted-foreground/65 py-1.5 pr-5 text-right align-baseline font-normal whitespace-nowrap md:py-2 md:pr-6"
                >
                  {t('page.project_view.created')}
                </th>
                <td className="text-muted-foreground/90 py-1.5 pl-0 text-left align-baseline tabular-nums md:py-2">
                  {formatDate(
                    workspaceKind === 'container' && container !== undefined ? container.createdAt : project.createdAt
                  )}
                </td>
              </tr>
              <tr>
                <th
                  scope="row"
                  className="text-muted-foreground/65 py-1.5 pr-5 text-right align-baseline font-normal whitespace-nowrap md:py-2 md:pr-6"
                >
                  {t('page.project_view.updated')}
                </th>
                <td className="text-muted-foreground/90 py-1.5 pl-0 text-left align-baseline tabular-nums md:py-2">
                  {formatDate(
                    workspaceKind === 'container' && container !== undefined ? container.updatedAt : project.updatedAt
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <div className="border-border flex min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border">
        <aside
          aria-label={t('page.project_view.slides_heading')}
          className="bg-muted/15 border-border/35 flex w-44 shrink-0 flex-col border-r md:w-52"
        >
          <div
            ref={slideListInnerRef}
            className="scrollbar-hide bg-muted/35 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-0 md:px-2.5"
          >
            <div className="flex flex-col gap-0">
              {(() => {
                const elements: ReactElement[] = []
                const slideCount: number = localSlides.length

                const pushInsertGap = (insertIndex: number): void => {
                  const isHot: boolean = hoverInsertIndex === insertIndex
                  const isFirstWhenEmpty: boolean = insertIndex === 0 && slideCount === 0

                  elements.push(
                    <div
                      key={`insert-${String(insertIndex)}`}
                      className={cn(
                        'relative z-0 m-0 h-0 overflow-visible border-b p-0 leading-none transition-[border-color,border-style]',
                        isHot ? 'border-primary border-solid' : 'border-border/25 border-solid'
                      )}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('page.project_view.insert_slide')}
                            className={cn(
                              'group/insert absolute inset-x-0 m-0 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 leading-none outline-none',
                              'focus-visible:ring-ring rounded-none focus-visible:ring-2',
                              isFirstWhenEmpty ? '-top-6 -bottom-6' : '-top-3 -bottom-3'
                            )}
                            onMouseEnter={(): void => {
                              setHoverInsertIndex(insertIndex)
                            }}
                            onMouseLeave={(): void => {
                              setHoverInsertIndex(null)
                            }}
                            onFocus={(): void => {
                              setHoverInsertIndex(insertIndex)
                            }}
                            onBlur={(): void => {
                              setHoverInsertIndex(null)
                            }}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right" sideOffset={8} className="min-w-36 p-1">
                          {PART_KINDS.map((k: PartKind) => {
                            return (
                              <DropdownMenuItem
                                key={k}
                                className="cursor-pointer rounded-md px-2 py-1.5 text-sm"
                                onSelect={(): void => {
                                  handleInsertAt(insertIndex, k)
                                }}
                              >
                                {partKindLabel(t, k)}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                }

                pushInsertGap(0)
                localSlides.forEach((slide: LocalSlide, index: number): void => {
                  const isSelected: boolean = slide.id === selectedId
                  const isDragOver: boolean = dragOverThumbIndex === index
                  const part: Part | undefined = partsRecord[slide.id]
                  const thumbLayout: Layout | undefined = thumbLayoutForPart(part, layouts)
                  const needsLayouts: boolean = slide.partType === 'PLAIN' || slide.partType === 'VALUE'
                  const showThumbSpinner: boolean = needsLayouts && layoutsQuery.isLoading
                  const showThumbError: boolean = needsLayouts && layoutsQuery.isError
                  const missingLayoutId: boolean =
                    needsLayouts &&
                    part !== undefined &&
                    (part.type === 'PLAIN' || part.type === 'VALUE') &&
                    part.layoutId !== null &&
                    part.layoutId.length > 0 &&
                    thumbLayout === undefined &&
                    !layoutsQuery.isLoading
                  const thumbExportIncomplete: boolean =
                    (part !== undefined && isPartIncompleteForPptExport(part)) ||
                    (slide.partType === 'BIBLE' && bibleBlockingUiByPartId[slide.id] === true)

                  elements.push(
                    <div
                      key={slide.id}
                      className={cn(
                        'group grid grid-cols-[auto_1fr] items-start gap-x-1 gap-y-0 px-0 py-0 pt-3 md:gap-x-1.5',
                        index < slideCount - 1 && 'mb-1',
                        isSelected && 'bg-primary/5 rounded-md'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none col-start-1 row-span-2 row-start-1 shrink-0 self-center text-[9px] leading-none font-semibold tabular-nums select-none md:text-[10px]',
                          isSelected ? 'text-primary' : 'text-muted-foreground/80'
                        )}
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="col-start-2 row-start-1 flex min-w-0 justify-center self-start px-1.5">
                        <div className="relative w-fit max-w-full">
                          <div
                            draggable
                            role="button"
                            tabIndex={0}
                            aria-grabbed={draggingId === slide.id}
                            aria-pressed={isSelected}
                            onKeyDown={(ke: ReactKeyboardEvent<HTMLDivElement>): void => {
                              if (ke.key === 'Enter' || ke.key === ' ') {
                                ke.preventDefault()
                                if (!skipNextClickSelectRef.current) {
                                  setSelectedId(slide.id)
                                }
                              }
                            }}
                            onDragStart={handleDragStart(slide.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(ev: DragEvent<HTMLDivElement>): void => {
                              handleDragOverThumb(ev, index)
                            }}
                            onDragLeave={handleDragLeaveThumb}
                            onDrop={(ev: DragEvent<HTMLDivElement>): void => {
                              handleDropOnThumb(ev, index)
                            }}
                            onClick={(): void => {
                              if (skipNextClickSelectRef.current) {
                                return
                              }
                              setSelectedId(slide.id)
                            }}
                            className={cn(
                              'focus-visible:ring-ring bg-background box-border w-fit max-w-full cursor-grab overflow-hidden rounded-md border-2 shadow-sm outline-none focus-visible:ring-2 active:cursor-grabbing',
                              isDragOver ? 'border-primary/80' : isSelected ? 'border-primary' : 'border-border/40',
                              draggingId === slide.id && 'opacity-50'
                            )}
                          >
                            {showThumbSpinner ? (
                              <div
                                className="bg-muted/35 flex items-center justify-center py-3"
                                style={{ width: sidebarThumbMaxPx, minHeight: 52 }}
                              >
                                <Spinner className="text-foreground" width={22} height={22} />
                              </div>
                            ) : showThumbError ? (
                              <div
                                className="text-destructive flex items-center justify-center px-1.5 py-2 text-center text-[9px] leading-snug md:text-[10px]"
                                style={{ width: sidebarThumbMaxPx, minHeight: 52 }}
                              >
                                {layoutsQuery.error instanceof Error
                                  ? layoutsQuery.error.message
                                  : t('page.project_view.layouts_load_error')}
                              </div>
                            ) : thumbLayout !== undefined ? (
                              <TemplateLayoutSlide
                                layout={thumbLayout}
                                fallbackSlideSize={templateFallbackSize}
                                showLayoutTitle={false}
                                maxContentWidthPx={sidebarThumbMaxPx}
                                fitWidth
                                hideSlideChrome
                                filledPlaceholderTint
                                disableHoverTip
                                highlightPlaceholderShapeId={
                                  slide.id === selectedId ? effectiveHighlightPlaceholderShapeId : null
                                }
                              />
                            ) : missingLayoutId ? (
                              <div
                                className="text-destructive flex items-center justify-center px-1.5 py-2 text-center text-[9px] leading-snug md:text-[10px]"
                                style={{ width: sidebarThumbMaxPx, minHeight: 52 }}
                              >
                                {t('page.project_view.layout_not_found')}
                              </div>
                            ) : needsLayouts && part !== undefined ? (
                              <div
                                className="text-muted-foreground flex items-center justify-center px-1.5 py-2 text-center text-[9px] leading-snug md:text-[10px]"
                                style={{ width: sidebarThumbMaxPx, minHeight: 52 }}
                              >
                                {t('page.project_view.pick_layout_hint')}
                              </div>
                            ) : (
                              <div
                                className="bg-muted/35 flex aspect-video items-center justify-center px-1"
                                style={{ width: sidebarThumbMaxPx }}
                              >
                                <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-[0.15em] md:text-[11px]">
                                  {partKindTypeCode(slide.partType)}
                                </span>
                              </div>
                            )}
                          </div>
                          {thumbExportIncomplete ? (
                            <div
                              className="pointer-events-none absolute inset-x-1 bottom-1 z-8 flex justify-center"
                              aria-hidden
                            >
                              <span className="bg-destructive text-destructive-foreground rounded px-1.5 py-0.5 text-center text-[8px] leading-none font-semibold shadow-sm md:text-[9px]">
                                {t('page.project_view.thumb_export_incomplete')}
                              </span>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            aria-label={t('page.project_view.delete_slide_aria', { index: String(index + 1) })}
                            className={cn(
                              'bg-background/95 border-border/50 text-muted-foreground hover:text-destructive absolute top-1 right-1 z-10 rounded border p-0.5 shadow-sm',
                              'opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100'
                            )}
                            onClick={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                              ev.preventDefault()
                              ev.stopPropagation()
                              setDeleteConfirmSlideId(slide.id)
                            }}
                            onMouseDown={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                              ev.stopPropagation()
                            }}
                          >
                            <Trash2Icon aria-hidden className="size-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                      <span className="text-muted-foreground col-start-2 row-start-2 m-0 line-clamp-1 block min-w-0 self-start p-0 px-1.5 text-center text-[10px] leading-none">
                        {partKindLabel(t, slide.partType)}
                      </span>
                    </div>
                  )
                  pushInsertGap(index + 1)
                })
                return elements
              })()}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <div
            className={cn('bg-muted/15 flex min-h-0 min-w-0 flex-col', isEditPanelOpen ? 'min-w-0 flex-6' : 'flex-1')}
          >
            <div className="border-border/35 flex shrink-0 flex-col gap-1 border-b px-2 py-1">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-24 justify-center gap-1 text-xs"
                  disabled={selectedSlide === undefined}
                  onClick={(): void => {
                    if (selectedId === null) {
                      return
                    }
                    setDeleteConfirmSlideId(selectedId)
                  }}
                >
                  <Trash2Icon aria-hidden className="size-3" />
                  {t('page.project_view.delete')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-24 justify-center gap-1 text-xs"
                  disabled={selectedSlide === undefined}
                  onClick={(): void => {
                    setIsEditPanelOpen(true)
                  }}
                >
                  <PencilIcon aria-hidden className="size-3" />
                  {t('page.project_view.edit')}
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col p-0">
              <div
                ref={slideStageSlotRef}
                className="flex min-h-0 w-full min-w-0 flex-1 items-start justify-center overflow-hidden"
              >
                <div
                  className={cn(
                    'border-border bg-background box-border flex shrink-0 flex-col items-center justify-start gap-1 overflow-hidden rounded-xl border px-2 pt-1 pb-2 text-center shadow-sm'
                  )}
                  style={{
                    width: mainStageBoxPx.widthPx,
                    height: mainStageBoxPx.heightPx,
                  }}
                >
                  {selectedSlide === undefined ? (
                    <p className="text-muted-foreground px-3 text-xs md:text-sm">
                      {t('page.project_view.canvas_empty')}
                    </p>
                  ) : selectedSlide.partType === 'PLAIN' || selectedSlide.partType === 'VALUE' ? (
                    layoutsQuery.isLoading ? (
                      <Spinner className="text-foreground" width={28} height={28} />
                    ) : layoutsQuery.isError ? (
                      <p className="text-destructive px-3 text-xs md:text-sm">
                        {layoutsQuery.error instanceof Error
                          ? layoutsQuery.error.message
                          : t('page.project_view.layouts_load_error')}
                      </p>
                    ) : selectedPart !== undefined &&
                      (selectedPart.type === 'VALUE' || selectedPart.type === 'PLAIN') ? (
                      mainStageLayout !== undefined ? (
                        <div className="flex max-h-full min-h-0 max-w-full min-w-0 flex-col items-center justify-start gap-1 overflow-hidden">
                          <StagePartLayoutCaption
                            partKindText={partKindTypeCode(selectedSlide.partType)}
                            layoutName={mainStageLayout.name}
                          />
                          <TemplateLayoutSlide
                            layout={mainStageLayout}
                            fallbackSlideSize={templateFallbackSize}
                            showLayoutTitle={false}
                            maxContentWidthPx={
                              mainStageBoxPx.layoutSlideMaxWidthPx !== null
                                ? mainStageBoxPx.layoutSlideMaxWidthPx
                                : Math.max(96, Math.floor(mainStageBoxPx.widthPx) - MAIN_STAGE_CARD_EDGE_PADDING_PX * 2)
                            }
                            highlightPlaceholderShapeId={effectiveHighlightPlaceholderShapeId}
                          />
                        </div>
                      ) : selectedPart.layoutId !== null && selectedPart.layoutId.length > 0 ? (
                        <p className="text-destructive px-3 text-xs md:text-sm">
                          {t('page.project_view.layout_not_found')}
                        </p>
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-3">
                          <StagePartLayoutCaption
                            partKindText={partKindTypeCode(selectedSlide.partType)}
                            layoutName={null}
                          />
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {t('page.project_view.pick_layout_hint')}
                          </p>
                        </div>
                      )
                    ) : (
                      <p className="text-muted-foreground px-3 text-xs md:text-sm">
                        {t('page.project_view.part_state_missing')}
                      </p>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 px-3">
                      <StagePartLayoutCaption
                        partKindText={partKindTypeCode(selectedSlide.partType)}
                        layoutName={null}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEditPanelOpen ? (
            <aside
              aria-label={t('page.project_view.edit_panel_title')}
              className="border-border/40 bg-background flex min-h-0 min-w-0 flex-4 flex-col border-l"
            >
              <div className="border-border/35 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
                <h2 className="text-foreground text-sm font-semibold">{t('page.project_view.edit_panel_title')}</h2>
                <button
                  type="button"
                  aria-label={t('page.project_view.close_panel')}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md p-1 outline-none focus-visible:ring-2"
                  onClick={(): void => {
                    setIsEditPanelOpen(false)
                  }}
                >
                  <XIcon aria-hidden className="size-4" />
                </button>
              </div>
              <div className="text-foreground scrollbar-hide min-h-0 flex-1 overflow-y-auto p-3 text-sm">
                {selectedSlide === undefined ? (
                  <p className="text-muted-foreground">{t('page.project_view.canvas_empty')}</p>
                ) : selectedSlide.partType === 'PLAIN' || selectedSlide.partType === 'VALUE' ? (
                  layoutsQuery.isLoading ? (
                    <div className="flex w-full justify-center py-10">
                      <Spinner className="text-foreground" width={28} height={28} />
                    </div>
                  ) : layoutsQuery.isError ? (
                    <p className="text-destructive text-sm">
                      {layoutsQuery.error instanceof Error
                        ? layoutsQuery.error.message
                        : t('page.project_view.layouts_load_error')}
                    </p>
                  ) : selectedPart !== undefined && (selectedPart.type === 'VALUE' || selectedPart.type === 'PLAIN') ? (
                    <ProjectValuePlainEditor
                      layouts={layouts}
                      fallbackSlideSize={templateFallbackSize}
                      part={selectedPart}
                      onCommit={(next: ValuePart | PlainPart, kind: 'VALUE' | 'PLAIN'): void => {
                        if (selectedId === null) {
                          return
                        }
                        commitValuePlainPart(selectedId, next, kind)
                      }}
                      onActivePlaceholderChange={(placeholderShapeId: string | null): void => {
                        if (placeholderShapeId === null) {
                          setPlaceholderFocus(null)
                          return
                        }
                        if (selectedId === null) {
                          return
                        }
                        setPlaceholderFocus({ slideId: selectedId, shapeId: placeholderShapeId })
                      }}
                    />
                  ) : (
                    <p className="text-destructive text-sm">{t('page.project_view.part_state_missing')}</p>
                  )
                ) : selectedSlide.partType === 'LYRICS' ? (
                  layoutsQuery.isLoading ? (
                    <div className="flex w-full justify-center py-10">
                      <Spinner className="text-foreground" width={28} height={28} />
                    </div>
                  ) : layoutsQuery.isError ? (
                    <p className="text-destructive text-sm">
                      {layoutsQuery.error instanceof Error
                        ? layoutsQuery.error.message
                        : t('page.project_view.layouts_load_error')}
                    </p>
                  ) : selectedPart !== undefined && selectedPart.type === 'LYRICS' ? (
                    <ProjectLyricsEditor
                      layouts={layouts}
                      fallbackSlideSize={templateFallbackSize}
                      part={selectedPart}
                      onCommit={(next: LyricsPart): void => {
                        if (selectedId === null) {
                          return
                        }
                        commitLyricsPart(selectedId, next)
                      }}
                      onFlushWorkspace={flushWorkspaceToServer}
                    />
                  ) : (
                    <p className="text-destructive text-sm">{t('page.project_view.part_state_missing')}</p>
                  )
                ) : selectedSlide.partType === 'BIBLE' ? (
                  layoutsQuery.isLoading ? (
                    <div className="flex w-full justify-center py-10">
                      <Spinner className="text-foreground" width={28} height={28} />
                    </div>
                  ) : layoutsQuery.isError ? (
                    <p className="text-destructive text-sm">
                      {layoutsQuery.error instanceof Error
                        ? layoutsQuery.error.message
                        : t('page.project_view.layouts_load_error')}
                    </p>
                  ) : selectedPart !== undefined && selectedPart.type === 'BIBLE' ? (
                    <ProjectBibleEditor
                      layouts={layouts}
                      fallbackSlideSize={templateFallbackSize}
                      part={selectedPart}
                      onBlockingUiChange={(blocking: boolean): void => {
                        handleBibleEditorBlockingUiChange(selectedPart.id, blocking)
                      }}
                      onCommit={(next: BiblePart): void => {
                        if (selectedId === null) {
                          return
                        }
                        commitBiblePart(selectedId, next)
                      }}
                    />
                  ) : (
                    <p className="text-destructive text-sm">{t('page.project_view.part_state_missing')}</p>
                  )
                ) : (
                  <p className="text-muted-foreground">{t('page.project_view.edit_unsupported_part')}</p>
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmSlideId !== null}
        title={t('page.project_view.delete_slide_confirm_title')}
        description={
          slidePendingDelete !== undefined
            ? t('page.project_view.delete_slide_confirm_description', {
                label: partKindLabel(t, slidePendingDelete.partType),
              })
            : ''
        }
        cancelLabel={t('common.global.cancel')}
        confirmLabel={t('common.global.delete')}
        confirmVariant="destructive"
        onCancel={(): void => {
          setDeleteConfirmSlideId(null)
        }}
        onConfirm={(): void => {
          if (deleteConfirmSlideId !== null) {
            handleRemoveSlideById(deleteConfirmSlideId)
          }
          setDeleteConfirmSlideId(null)
        }}
      />
    </div>
  )
})

ProjectWorkspace.displayName = 'ProjectWorkspace'

export function ProjectContainerListPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''
  const projectsQuery = useGetProjects(userId)
  const containersQuery = useGetProjectContainers(projectId)
  const project: Project | undefined = projectsQuery.data?.find((p: Project): boolean => p.id === projectId)
  const projectContainers: ProjectContainer[] = React.useMemo((): ProjectContainer[] => {
    const rows: ProjectContainer[] = containersQuery.data ?? []
    return [...rows].sort((a: ProjectContainer, b: ProjectContainer): number => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [containersQuery.data])

  if (projectId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.project_view.missing_id')}</div>
  }

  if (currentUser === undefined || projectsQuery.isLoading || containersQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (projectsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {projectsQuery.error instanceof Error ? projectsQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  if (containersQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {containersQuery.error instanceof Error ? containersQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  if (project === undefined) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.project_view.not_found')}</div>
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col overflow-hidden px-2 pt-4 pb-0 sm:px-3 md:px-4 lg:px-5 lg:pt-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col gap-2 md:gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={(): void => {
              navigate(`/projects/${projectId}`)
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.project_view.back_to_project')}
          </button>
          <p className="text-muted-foreground text-sm font-medium">{project.name}</p>
        </div>

        <div className="border-border bg-background min-h-0 flex-1 overflow-auto rounded-xl border">
          {projectContainers.length === 0 ? (
            <p className="text-muted-foreground px-4 py-4 text-sm">{t('page.project_view.container_list_empty')}</p>
          ) : (
            <table className="w-full min-w-[720px] table-fixed border-collapse">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[12%]" />
                <col className="w-[21%]" />
                <col className="w-[21%]" />
              </colgroup>
              <thead>
                <tr className="border-border border-y text-left text-sm leading-6">
                  <th className="bg-secondary px-4 py-2.5 align-middle font-medium whitespace-nowrap">
                    {t('list.name')}
                  </th>
                  <th className="bg-secondary px-4 py-2.5 align-middle font-medium whitespace-nowrap">
                    {t('page.project_view.slides_heading')}
                  </th>
                  <th className="bg-secondary px-4 py-2.5 align-middle font-medium whitespace-nowrap">
                    {t('list.created_at')}
                  </th>
                  <th className="bg-secondary px-4 py-2.5 align-middle font-medium whitespace-nowrap">
                    {t('list.updated_at')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm leading-6">
                {projectContainers.map((row: ProjectContainer): React.ReactElement => {
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      onClick={(): void => {
                        navigate(`/projects/${projectId}/containers/${row.id}`)
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>): void => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/projects/${projectId}/containers/${row.id}`)
                        }
                      }}
                      className={cn(
                        'border-border border-b',
                        'hover:bg-border active:bg-secondary focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                      )}
                    >
                      <td className="max-w-0 truncate px-4 py-2.5 align-middle">{row.containerName}</td>
                      <td className="px-4 py-2.5 align-middle tabular-nums whitespace-nowrap">{row.parts.length}</td>
                      <td className="px-4 py-2.5 align-middle tabular-nums whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 align-middle tabular-nums whitespace-nowrap">
                        {formatDate(row.updatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProjectContainerViewPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId = '', containerId = '' } = useParams<{ projectId: string; containerId: string }>()
  const projectWorkspaceRef = React.useRef<ProjectWorkspaceHandle | null>(null)

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''
  const projectsQuery = useGetProjects(userId)
  const containersQuery = useGetProjectContainers(projectId)
  const [workspaceExportIncomplete, setWorkspaceExportIncomplete] = React.useState<boolean>(true)

  const project: Project | undefined = projectsQuery.data?.find((p: Project): boolean => p.id === projectId)
  const container: ProjectContainer | undefined = containersQuery.data?.find(
    (c: ProjectContainer): boolean => c.id === containerId
  )

  if (projectId.length === 0 || containerId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.project_view.missing_id')}</div>
  }

  if (currentUser === undefined || projectsQuery.isLoading || containersQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (projectsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {projectsQuery.error instanceof Error ? projectsQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  if (containersQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {containersQuery.error instanceof Error ? containersQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col overflow-hidden px-2 pt-4 pb-0 sm:px-3 md:px-4 lg:px-5 lg:pt-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col gap-2 md:gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={(): void => {
              navigate(`/projects/${projectId}`)
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.project_view.back_to_project')}
          </button>
          {project !== undefined && container !== undefined ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-28 shrink-0 justify-center gap-1 text-xs"
              disabled={workspaceExportIncomplete}
              title={workspaceExportIncomplete ? t('page.project_view.save_file_disabled_incomplete') : undefined}
              onClick={(): void => {
                /* TODO: export / save file pipeline */
              }}
            >
              {t('page.project_view.save_file')}
            </Button>
          ) : null}
        </div>

        {project === undefined ? (
          <p className="text-muted-foreground text-sm">{t('page.project_view.not_found')}</p>
        ) : container === undefined ? (
          <p className="text-muted-foreground text-sm">{t('page.project_view.container_not_found')}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ProjectWorkspace
              ref={projectWorkspaceRef}
              workspaceKind="container"
              project={project}
              userId={userId}
              container={container}
              onWorkspaceExportIncompleteChange={setWorkspaceExportIncomplete}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function ProjectViewPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { projectId = '' } = useParams<{ projectId: string }>()
  const projectWorkspaceRef = React.useRef<ProjectWorkspaceHandle | null>(null)

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''
  const projectsQuery = useGetProjects(userId)
  const createProjectContainer = useCreateProjectContainer()
  const patchProjectContainer = usePatchProjectContainer()

  const [saveAsContainerOpen, setSaveAsContainerOpen] = React.useState<boolean>(false)
  const [saveAsContainerName, setSaveAsContainerName] = React.useState<string>('')
  const [saveAsContainerBusy, setSaveAsContainerBusy] = React.useState<boolean>(false)

  const project: Project | undefined = projectsQuery.data?.find((p: Project): boolean => p.id === projectId)

  const handleSaveAsContainerConfirm = React.useCallback(async (): Promise<void> => {
    const trimmed: string = saveAsContainerName.trim()
    if (trimmed.length === 0) {
      toast.error(t('page.project_view.container_name_required'))
      return
    }
    if (project === undefined) {
      return
    }
    setSaveAsContainerBusy(true)
    try {
      await projectWorkspaceRef.current?.persistPendingWorkspace()
      const projects: Project[] | undefined = queryClient.getQueryData<Project[]>(QUERY_KEY.PROJECT.GET_ALL(userId))
      const fresh: Project | undefined = projects?.find((p: Project): boolean => p.id === project.id)
      if (fresh === undefined) {
        toast.error(t('page.project_view.create_container_failed'))
        return
      }
      const partsPayload: PartRequestBody[] = partsPatchPayloadFromProject(fresh)
      const newContainer = await createProjectContainer.mutateAsync({
        projectId: project.id,
        userId,
        containerName: trimmed,
      })
      await patchProjectContainer.mutateAsync({
        projectContainerId: newContainer.id,
        requestBody: { containerName: null, completed: null, parts: partsPayload },
      })
      navigate(`/projects/${project.id}/containers/${newContainer.id}`)
      setSaveAsContainerOpen(false)
      setSaveAsContainerName('')
    } catch (err: unknown) {
      const detail: string = err instanceof Error ? err.message : ''
      toast.error(
        detail.length > 0
          ? `${t('page.project_view.create_container_failed')} (${detail})`
          : t('page.project_view.create_container_failed')
      )
    } finally {
      setSaveAsContainerBusy(false)
    }
  }, [
    createProjectContainer,
    patchProjectContainer,
    navigate,
    project,
    queryClient,
    saveAsContainerName,
    t,
    userId,
  ])

  if (projectId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.project_view.missing_id')}</div>
  }

  if (currentUser === undefined || projectsQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (projectsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {projectsQuery.error instanceof Error ? projectsQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col overflow-hidden px-2 pt-4 pb-0 sm:px-3 md:px-4 lg:px-5 lg:pt-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col gap-2 md:gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={(): void => {
              navigate('/projects')
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.project_view.back')}
          </button>
          {project !== undefined ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-32 shrink-0 justify-center gap-1 text-xs"
                onClick={(): void => {
                  navigate(`/projects/${projectId}/containers`)
                }}
              >
                {t('page.project_view.container_list')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-36 shrink-0 justify-center gap-1 text-xs"
                disabled={saveAsContainerBusy}
                onClick={(): void => {
                  setSaveAsContainerName('')
                  setSaveAsContainerOpen(true)
                }}
              >
                {t('page.project_view.save_as_container')}
              </Button>
            </div>
          ) : null}
        </div>

        {project === undefined ? (
          <p className="text-muted-foreground text-sm">{t('page.project_view.not_found')}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ProjectWorkspace
              ref={projectWorkspaceRef}
              workspaceKind="project"
              project={project}
              userId={userId}
              container={undefined}
            />
          </div>
        )}

        <ContainerNameDialog
          open={saveAsContainerOpen}
          title={t('page.project_view.container_name_dialog_title')}
          nameLabel={t('page.project_view.container_name_label')}
          namePlaceholder={t('page.project_view.container_name_placeholder')}
          nameValue={saveAsContainerName}
          onNameChange={setSaveAsContainerName}
          cancelLabel={t('common.global.cancel')}
          confirmLabel={t('page.project_view.save_as_container_confirm')}
          confirmLoading={saveAsContainerBusy}
          onCancel={(): void => {
            if (saveAsContainerBusy) {
              return
            }
            setSaveAsContainerOpen(false)
          }}
          onConfirm={(): void => {
            void handleSaveAsContainerConfirm()
          }}
        />
      </div>
    </div>
  )
}
