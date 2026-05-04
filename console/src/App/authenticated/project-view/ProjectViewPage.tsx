import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { QUERY_KEY } from '@/api/query/key'
import { useListLayouts, useListTemplates } from '@/api/query/powerpoint.query'
import { useGetProjects, usePatchProject } from '@/api/query/project.query'
import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import { Button } from '@/components/ui/button/Button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { Layout } from '@/domain/models/powerpoint'
import type { Part, PlainPart, Project, ValuePart } from '@/domain/models/project'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import type { Size } from '@/domain/valueobjects/powerpoint'
import { generatePartUlid } from '@/lib/generate-ulid'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import {
  buildProjectPartsPatchPayload,
  workspaceSignature,
} from './build-project-parts-patch-payload'
import { ProjectValuePlainEditor } from './ProjectValuePlainEditor'

import type { TFunction } from 'i18next'
import type { DragEvent, KeyboardEvent, ReactElement } from 'react'

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
    out[p.id] = p
  }
  return out
}

function createSyntheticPartForInsert(
  id: string,
  kind: PartKind,
  projectId: string,
  containerId: string,
): Part {
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
        content: {
          type: 'LYRICS',
          contents: [
            {
              title: '',
              artist: null,
              lyrics: [{ part: 'blank', lyrics: '' }],
              lyricsPartSequence: [],
              lyricsPartsConfigured: false,
            },
          ],
        },
        lyricsLayoutId: null,
        titleLayoutId: null,
      }
    case 'BIBLE':
      return {
        ...base,
        type: 'BIBLE',
        content: { type: 'BIBLE', contents: [] },
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

function fitContentBoxPx(slotWidthPx: number, slotHeightPx: number, contentHeightOverWidth: number): {
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
  cardPadBottom: number,
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

function partsToLocalSlides(parts: Part[]): LocalSlide[] {
  return [...parts]
    .sort((a: Part, b: Part): number => a.order - b.order)
    .map(
      (p: Part): LocalSlide => ({
        id: p.id,
        partType: p.type,
      }),
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
  const layoutTrimmed: string | null =
    layoutName !== null && layoutName.trim().length > 0 ? layoutName.trim() : null
  const layoutUpper: string | null = layoutTrimmed !== null ? layoutTrimmed.toUpperCase() : null
  const ariaLabel: string = layoutUpper !== null ? `${kindUpper} · ${layoutUpper}` : kindUpper
  const wordClass: string =
    'font-mono text-[10px] font-semibold leading-none tracking-[0.2em] text-foreground/85 uppercase md:text-[11px]'
  const layoutWordClass: string = cn(
    wordClass,
    'min-w-0 max-w-[min(18rem,78%)] truncate text-foreground/70',
  )
  const dotClass: string =
    'font-mono select-none text-[10px] font-semibold leading-none text-foreground/45 md:text-[11px]'
  return (
    <p
      className="m-0 flex min-w-0 max-w-full shrink-0 flex-row flex-wrap items-center justify-center gap-x-1.5"
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

interface ProjectWorkspaceProps {
  readonly project: Project
  readonly userId: string
}

function ProjectWorkspace({ project, userId }: ProjectWorkspaceProps): ReactElement {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const patchProject = usePatchProject()

  const templatesQuery = useListTemplates(userId)
  const templates: TemplateResponse[] | undefined = getQueryData(templatesQuery)
  const templateRow: TemplateResponse | undefined = templates?.find(
    (row: TemplateResponse): boolean => row.templateId === project.templateId,
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

  const projectIdRef = React.useRef<string>('')
  const [localSlides, setLocalSlides] = React.useState<LocalSlide[]>((): LocalSlide[] =>
    partsToLocalSlides(project.parts),
  )
  const [partsRecord, setPartsRecord] = React.useState<PartsRecord>((): PartsRecord =>
    partsRecordFromParts(project.parts),
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

  const slideStageSlotRef = React.useRef<HTMLDivElement | null>(null)
  const [stageSlotPx, setStageSlotPx] = React.useState<{ widthPx: number; heightPx: number }>({
    widthPx: 0,
    heightPx: 0,
  })

  const patchProjectRef = React.useRef<ReturnType<typeof usePatchProject>>(patchProject)
  const queryClientRef = React.useRef<ReturnType<typeof useQueryClient>>(queryClient)
  const partsRecordRef = React.useRef<PartsRecord>(partsRecord)

  React.useLayoutEffect((): void => {
    partsRecordRef.current = partsRecord
  }, [partsRecord])

  React.useEffect((): void => {
    patchProjectRef.current = patchProject
  }, [patchProject])

  React.useEffect((): void => {
    queryClientRef.current = queryClient
  }, [queryClient])

  React.useLayoutEffect((): void => {
    localSlidesRef.current = localSlides
  }, [localSlides])

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
    if (projectIdRef.current === project.id) {
      return
    }
    projectIdRef.current = project.id
    const initial: LocalSlide[] = partsToLocalSlides(project.parts)
    localSlidesRef.current = initial
    setLocalSlides(initial)
    setSelectedId(initial[0]?.id ?? null)
    const initialRecord: PartsRecord = partsRecordFromParts(project.parts)
    setPartsRecord(initialRecord)
    partsSnapshotRef.current = new Map(Object.entries(initialRecord))
    lastSavedSignatureRef.current = workspaceSignature(initial, new Map(Object.entries(initialRecord)))
    pendingSaveSignatureRef.current = null
    setIsEditPanelOpen(false)
    setDeleteConfirmSlideId(null)
    setPlaceholderFocus(null)
  }, [project])

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
        MAIN_STAGE_CARD_PADDING_BOTTOM_PX,
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

  const commitValuePlainPart = React.useCallback((slideId: string, next: ValuePart | PlainPart, nextKind: 'VALUE' | 'PLAIN'): void => {
    setPartsRecord((prev: PartsRecord): PartsRecord => ({ ...prev, [slideId]: next }))
    setLocalSlides((prev: LocalSlide[]): LocalSlide[] =>
      prev.map((s: LocalSlide): LocalSlide => (s.id === slideId ? { ...s, partType: nextKind } : s)),
    )
  }, [])

  const handleRemoveSlideById = React.useCallback((slideId: string): void => {
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
        const containerId: string =
          Object.values(prev)[0]?.containerId ?? project.parts[0]?.containerId ?? ''
        return {
          ...prev,
          [newId]: createSyntheticPartForInsert(newId, partType, project.id, containerId),
        }
      })
    },
    [project.id, project.parts],
  )

  const handleDragStart = React.useCallback((slideId: string) => (e: DragEvent): void => {
    setDraggingId(slideId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', slideId)
    skipNextClickSelectRef.current = true
  }, [])

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
      const latestSlides: LocalSlide[] = localSlidesRef.current
      const latestParts: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
      const payloadSignature: string = workspaceSignature(latestSlides, latestParts)
      if (payloadSignature === lastSavedSignatureRef.current) {
        return
      }

      pendingSaveSignatureRef.current = payloadSignature
      const partsPayload = buildProjectPartsPatchPayload(latestSlides, latestParts)

      patchProjectRef.current.mutate(
        {
          projectId: project.id,
          userId,
          requestBody: { name: null, templateId: null, parts: partsPayload },
        },
        {
          onSuccess: (updated: Project): void => {
            const mergedMap: Map<string, Part> = new Map(Object.entries(partsRecordRef.current))
            const currentSignature: string = workspaceSignature(localSlidesRef.current, mergedMap)
            const nextRecord: PartsRecord = partsRecordFromParts(updated.parts)
            if (pendingSaveSignatureRef.current !== currentSignature) {
              setPartsRecord(nextRecord)
              partsSnapshotRef.current = new Map(Object.entries(nextRecord))
              pendingSaveSignatureRef.current = null
              return
            }
            const nextSlides: LocalSlide[] = partsToLocalSlides(updated.parts)
            setLocalSlides(nextSlides)
            localSlidesRef.current = nextSlides
            setPartsRecord(nextRecord)
            partsSnapshotRef.current = new Map(Object.entries(nextRecord))
            lastSavedSignatureRef.current = workspaceSignature(
              nextSlides,
              new Map(Object.entries(nextRecord)),
            )
            pendingSaveSignatureRef.current = null
            queryClientRef.current.setQueryData(
              QUERY_KEY.PROJECT.GET_ALL(userId),
              (previous: Project[] | undefined): Project[] | undefined => {
                if (previous === undefined) {
                  return previous
                }
                return previous.map((row: Project): Project => (row.id === updated.id ? updated : row))
              },
            )
          },
          onError: (): void => {
            pendingSaveSignatureRef.current = null
          },
        },
      )
    }, 500)

    return (): void => {
      window.clearTimeout(timeoutId)
    }
  }, [localSlides, partsRecord, project.id, userId])

  const slidePendingDelete: LocalSlide | undefined =
    deleteConfirmSlideId === null
      ? undefined
      : localSlides.find((s: LocalSlide): boolean => s.id === deleteConfirmSlideId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
      <header className="mx-auto w-full max-w-full shrink-0 text-center md:w-1/2 md:max-w-[50%]">
        <h1 className="text-muted-foreground/75 mb-2 text-2xl font-semibold tracking-tight md:mb-2 md:text-3xl lg:text-[1.85rem] lg:leading-snug">
          {project.name}
        </h1>
        <dl className="border-border/40 text-muted-foreground/85 divide-border/40 divide-y border-y text-xs md:text-sm">
          <div className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:justify-center sm:gap-3 md:py-1.5">
            <dt className="text-muted-foreground/65 shrink-0">{t('page.project_view.template_name')}</dt>
            <dd className="text-muted-foreground/90 min-w-0 wrap-break-word">{templateDisplayName}</dd>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:justify-center sm:gap-3 md:py-1.5">
            <dt className="text-muted-foreground/65 shrink-0">{t('page.project_view.created')}</dt>
            <dd className="text-muted-foreground/90 min-w-0 tabular-nums">{formatDate(project.createdAt)}</dd>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-1.5 sm:flex-row sm:justify-center sm:gap-3 md:py-1.5">
            <dt className="text-muted-foreground/65 shrink-0">{t('page.project_view.updated')}</dt>
            <dd className="text-muted-foreground/90 min-w-0 tabular-nums">{formatDate(project.updatedAt)}</dd>
          </div>
        </dl>
      </header>

      <div className="border-border flex min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border">
        <aside
          aria-label={t('page.project_view.slides_heading')}
          className="bg-muted/15 flex w-44 shrink-0 flex-col border-r border-border/35 md:w-52"
        >
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 md:px-2.5">
            <div className="flex flex-col gap-0">
              {(() => {
                const elements: ReactElement[] = []
                const slideCount: number = localSlides.length

                const pushGap = (insertIndex: number): void => {
                  const isHot: boolean = hoverInsertIndex === insertIndex
                  const isFirstWhenEmpty: boolean = insertIndex === 0 && slideCount === 0

                  elements.push(
                    <DropdownMenu key={`gap-${String(insertIndex)}`}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('page.project_view.insert_slide')}
                          className={cn(
                            'group relative flex w-full shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent outline-none',
                            'rounded-md focus-visible:ring-2 focus-visible:ring-ring',
                            isFirstWhenEmpty ? 'min-h-10 py-2' : 'min-h-3 py-1',
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
                        >
                          <span
                            className={cn(
                              'h-px w-[92%] max-w-full rounded-full transition-[background-color,opacity]',
                              isHot
                                ? 'bg-muted-foreground/35'
                                : 'bg-transparent opacity-0 group-hover:bg-border/55 group-hover:opacity-100 group-focus-visible:bg-border/55 group-focus-visible:opacity-100',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="right"
                        sideOffset={8}
                        className="min-w-36 p-1"
                      >
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
                    </DropdownMenu>,
                  )
                }

                pushGap(0)
                localSlides.forEach((slide: LocalSlide, index: number): void => {
                  const isSelected: boolean = slide.id === selectedId
                  const isDragOver: boolean = dragOverThumbIndex === index
                  elements.push(
                    <div
                      key={slide.id}
                      className="group relative flex flex-col gap-1.5 border-b border-dotted border-border/25 pb-2.5 last:border-b-0"
                    >
                      <div className="relative">
                        <div
                          draggable
                          role="button"
                          tabIndex={0}
                          aria-grabbed={draggingId === slide.id}
                          aria-pressed={isSelected}
                          onKeyDown={(ke: KeyboardEvent<HTMLDivElement>): void => {
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
                            'border-border/40 focus-visible:ring-ring aspect-video w-full max-w-full cursor-grab overflow-hidden rounded-md border bg-background shadow-sm outline-none focus-visible:ring-2 active:cursor-grabbing',
                            isSelected && 'ring-primary ring-2',
                            isDragOver && 'ring-primary/80 ring-2',
                            draggingId === slide.id && 'opacity-50',
                          )}
                        >
                          <div className="bg-muted/35 flex aspect-video h-full w-full items-center justify-center">
                            <span className="text-muted-foreground text-[11px] font-medium tabular-nums">{index + 1}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={t('page.project_view.delete_slide_aria', { index: String(index + 1) })}
                          className={cn(
                            'bg-background/95 border-border/50 text-muted-foreground hover:text-destructive absolute right-1 top-1 z-10 rounded border p-0.5 shadow-sm',
                            'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
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
                      <span className="text-muted-foreground line-clamp-1 text-center text-[10px] leading-tight">
                        {partKindLabel(t, slide.partType)}
                      </span>
                    </div>,
                  )
                  pushGap(index + 1)
                })
                return elements
              })()}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <div
            className={cn(
              'bg-muted/15 flex min-h-0 min-w-0 flex-col',
              isEditPanelOpen ? 'min-w-0 flex-6' : 'flex-1',
            )}
          >
            <div className="border-border/35 flex shrink-0 justify-end gap-2 border-b px-2 py-1">
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
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col p-0">
              <div
                ref={slideStageSlotRef}
                className="flex min-h-0 min-w-0 w-full flex-1 items-start justify-center overflow-hidden"
              >
                <div
                  className={cn(
                    'border-border bg-background box-border flex shrink-0 flex-col items-center justify-start gap-1 overflow-hidden rounded-xl border text-center shadow-sm px-2 pt-1 pb-2',
                  )}
                  style={{
                    width: mainStageBoxPx.widthPx,
                    height: mainStageBoxPx.heightPx,
                  }}
                >
                  {selectedSlide === undefined ? (
                    <p className="text-muted-foreground px-3 text-xs md:text-sm">{t('page.project_view.canvas_empty')}</p>
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
                        <div className="flex min-h-0 min-w-0 max-h-full max-w-full flex-col items-center justify-start gap-1 overflow-hidden">
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
                          <p className="text-muted-foreground text-xs md:text-sm">{t('page.project_view.pick_layout_hint')}</p>
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
}

export function ProjectViewPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''
  const projectsQuery = useGetProjects(userId)

  const project: Project | undefined = projectsQuery.data?.find((p: Project): boolean => p.id === projectId)

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

        {project === undefined ? (
          <p className="text-muted-foreground text-sm">{t('page.project_view.not_found')}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ProjectWorkspace project={project} userId={userId} />
          </div>
        )}
      </div>
    </div>
  )
}
