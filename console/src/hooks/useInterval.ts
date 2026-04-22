import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null = null): void {
  const savedCallback = useRef<() => void>(callback)

  useEffect((): void => {
    savedCallback.current = callback
  }, [callback])

  useEffect((): (() => void) | void => {
    if (delay === null) {
      return
    }

    const id: number = window.setInterval((): void => {
      savedCallback.current()
    }, delay)

    return (): void => {
      window.clearInterval(id)
    }
  }, [delay])
}
