import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/api/query/key'
import { usePatchProject, usePatchProjectContainer } from '@/api/query/project.query'
import type { Part, PartRequestBody, Project, ProjectContainer } from '@/domain/models/project'
import type { LocalSlide, PartsRecord } from '@/lib/workspace'
import { mergeServerPartsWithLocalFallback, partsRecordFromParts, partsToLocalSlides } from '@/lib/workspace'

import { buildProjectPartsPatchPayload, workspaceSignature } from './build-project-parts-patch-payload'

import type { QueryClient } from '@tanstack/react-query'

type PatchProjectMutation = ReturnType<typeof usePatchProject>
type PatchContainerMutation = ReturnType<typeof usePatchProjectContainer>

interface UseWorkspaceAutosaveParams {
  readonly workspaceKind: 'project' | 'container'
  readonly projectId: string
  readonly userId: string
  readonly container: ProjectContainer | undefined
  readonly localSlides: LocalSlide[]
  readonly partsRecord: PartsRecord
  readonly localSlidesRef: React.RefObject<LocalSlide[]>
  readonly partsRecordRef: React.RefObject<PartsRecord>
  readonly setLocalSlides: React.Dispatch<React.SetStateAction<LocalSlide[]>>
  readonly setPartsRecord: React.Dispatch<React.SetStateAction<PartsRecord>>
  readonly patchProject: PatchProjectMutation
  readonly patchContainer: PatchContainerMutation
  readonly queryClient: QueryClient
}

interface UseWorkspaceAutosaveResult {
  readonly lastSavedSignatureRef: React.RefObject<string | null>
  readonly pendingSaveSignatureRef: React.RefObject<string | null>
  readonly partsSnapshotRef: React.RefObject<Map<string, Part>>
  readonly persistWorkspaceNowAsync: () => Promise<void>
  readonly flushWorkspaceToServer: () => void
}

export function useWorkspaceAutosave(params: UseWorkspaceAutosaveParams): UseWorkspaceAutosaveResult {
  const { t } = useTranslation()
  const {
    workspaceKind,
    projectId,
    userId,
    container,
    localSlides,
    partsRecord,
    localSlidesRef,
    partsRecordRef,
    setLocalSlides,
    setPartsRecord,
    patchProject,
    patchContainer,
    queryClient,
  } = params

  const lastSavedSignatureRef = React.useRef<string | null>(null)
  const pendingSaveSignatureRef = React.useRef<string | null>(null)
  const partsSnapshotRef = React.useRef<Map<string, Part>>(new Map())

  const patchProjectRef = React.useRef<PatchProjectMutation>(patchProject)
  const patchContainerRef = React.useRef<PatchContainerMutation>(patchContainer)
  const queryClientRef = React.useRef<QueryClient>(queryClient)

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
    partsSnapshotRef.current = new Map(Object.entries(partsRecord))
  }, [partsRecord])

  const finalizePatchSuccess = React.useCallback(
    (updatedParts: Part[], onFullSync?: (() => void) | undefined): void => {
      const localRecord: PartsRecord = partsRecordRef.current
      const mergedUpdatedParts: Part[] = mergeServerPartsWithLocalFallback(updatedParts, localRecord)
      const mergedMap: Map<string, Part> = new Map(Object.entries(localRecord))
      const currentSignature: string = workspaceSignature(localSlidesRef.current, mergedMap)
      const nextRecord: PartsRecord = partsRecordFromParts(mergedUpdatedParts)
      if (pendingSaveSignatureRef.current !== currentSignature) {
        setPartsRecord(nextRecord)
        partsSnapshotRef.current = new Map(Object.entries(nextRecord))
        pendingSaveSignatureRef.current = null
        return
      }
      const nextSlides: LocalSlide[] = partsToLocalSlides(mergedUpdatedParts)
      setLocalSlides(nextSlides)
      localSlidesRef.current = nextSlides
      setPartsRecord(nextRecord)
      partsSnapshotRef.current = new Map(Object.entries(nextRecord))
      lastSavedSignatureRef.current = workspaceSignature(nextSlides, new Map(Object.entries(nextRecord)))
      pendingSaveSignatureRef.current = null
      onFullSync?.()
    },
    [localSlidesRef, partsRecordRef, setLocalSlides, setPartsRecord]
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
          projectId,
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
  }, [workspaceKind, container, projectId, userId, finalizePatchSuccess, localSlidesRef, partsRecordRef, t])

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
          projectId,
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
  }, [
    workspaceKind,
    container,
    projectId,
    userId,
    finalizePatchSuccess,
    localSlidesRef,
    partsRecordRef,
    patchProject,
    patchContainer,
    queryClient,
  ])

  // Debounce autosave: fire 500ms after the last local change
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
  }, [flushWorkspaceToServer, localSlides, partsRecord, localSlidesRef, partsRecordRef])

  return {
    lastSavedSignatureRef,
    pendingSaveSignatureRef,
    partsSnapshotRef,
    persistWorkspaceNowAsync,
    flushWorkspaceToServer,
  }
}
