import { useEffect, useRef } from 'react'

export type UseEventListenerOptions = Pick<AddEventListenerOptions, 'capture' | 'passive' | 'once' | 'signal'> & {
  /** When false, no listener is attached. */
  enabled?: boolean
  /**
   * Extra values that should re-bind the listener when they change
   * (in addition to event name, options, and enabled).
   */
  deps?: ReadonlyArray<unknown>
}

const EMPTY_DEPS: readonly unknown[] = []

/**
 * Attaches a listener on `window` in the browser and removes it on cleanup.
 * The latest `handler` is always invoked without re-attaching every render.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: UseEventListenerOptions
): void {
  const enabled: boolean = options?.enabled ?? true
  const capture: boolean = options?.capture ?? false
  const passive: boolean | undefined = options?.passive
  const once: boolean | undefined = options?.once
  const signal: AbortSignal | undefined = options?.signal
  const extraDeps: ReadonlyArray<unknown> = options?.deps ?? EMPTY_DEPS

  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    if (typeof window === 'undefined') {
      return undefined
    }

    const listener: EventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K])
    }

    const listenerOptions: AddEventListenerOptions = {
      capture,
      passive,
      once,
      signal,
    }

    window.addEventListener(eventName, listener, listenerOptions)

    return () => {
      window.removeEventListener(eventName, listener, listenerOptions)
    }
  }, [capture, enabled, eventName, once, passive, signal, extraDeps])
}
