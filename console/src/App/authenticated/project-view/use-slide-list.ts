import * as React from 'react'

import type { Project, ProjectContainer } from '@/domain/models/project'
import { generatePartUlid } from '@/lib/generate-ulid'
import type { LocalSlide, PartKind, PartsRecord } from '@/lib/workspace'
import {
  createSyntheticPartForInsert,
  defaultContainerIdForInsert,
  insertSlideAt,
  partsToLocalSlides,
  reorderSlides,
} from '@/lib/workspace'

import type { DragEvent } from 'react'

interface UseSlideListParams {
  readonly workspaceKind: 'project' | 'container'
  readonly project: Project
  readonly container: ProjectContainer | undefined
  readonly setPartsRecord: React.Dispatch<React.SetStateAction<PartsRecord>>
  readonly setBibleBlockingUiByPartId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

interface UseSlideListResult {
  readonly localSlides: LocalSlide[]
  readonly setLocalSlides: React.Dispatch<React.SetStateAction<LocalSlide[]>>
  readonly selectedId: string | null
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  readonly draggingId: string | null
  readonly dragOverThumbIndex: number | null
  readonly hoverInsertIndex: number | null
  readonly setHoverInsertIndex: React.Dispatch<React.SetStateAction<number | null>>
  readonly skipNextClickSelectRef: React.RefObject<boolean>
  readonly handleInsertAt: (insertIndex: number, partType: PartKind) => void
  readonly handleRemoveSlideById: (slideId: string) => void
  readonly handleDragStart: (slideId: string) => (e: DragEvent) => void
  readonly handleDragEnd: () => void
  readonly handleDragOverThumb: (e: DragEvent, thumbIndex: number) => void
  readonly handleDragLeaveThumb: () => void
  readonly handleDropOnThumb: (e: DragEvent<HTMLDivElement>, toIndex: number) => void
}

export function useSlideList(params: UseSlideListParams): UseSlideListResult {
  const { workspaceKind, project, container, setPartsRecord, setBibleBlockingUiByPartId } = params

  const [localSlides, setLocalSlides] = React.useState<LocalSlide[]>((): LocalSlide[] =>
    partsToLocalSlides(project.parts)
  )
  const [selectedId, setSelectedId] = React.useState<string | null>((): string | null => {
    const slides: LocalSlide[] = partsToLocalSlides(project.parts)
    return slides[0]?.id ?? null
  })
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dragOverThumbIndex, setDragOverThumbIndex] = React.useState<number | null>(null)
  const [hoverInsertIndex, setHoverInsertIndex] = React.useState<number | null>(null)
  const skipNextClickSelectRef = React.useRef<boolean>(false)

  const handleRemoveSlideById = React.useCallback(
    (slideId: string): void => {
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
    },
    [setBibleBlockingUiByPartId, setPartsRecord]
  )

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
    [container, project, workspaceKind, setPartsRecord]
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

  return {
    localSlides,
    setLocalSlides,
    selectedId,
    setSelectedId,
    draggingId,
    dragOverThumbIndex,
    hoverInsertIndex,
    setHoverInsertIndex,
    skipNextClickSelectRef,
    handleInsertAt,
    handleRemoveSlideById,
    handleDragStart,
    handleDragEnd,
    handleDragOverThumb,
    handleDragLeaveThumb,
    handleDropOnThumb,
  }
}
