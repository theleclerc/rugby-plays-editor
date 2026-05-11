import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function useKV<T>(
  key: string,
  initial: T,
): [T | undefined, (next: T | ((current: T | undefined) => T)) => void] {
  const [value, setValueState] = useState<T | undefined>(undefined)
  const valueRef = useRef<T | undefined>(undefined)

  // Hydrate on mount (and whenever `key` changes)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      const next = raw === null ? initial : (JSON.parse(raw) as T)
      valueRef.current = next
      setValueState(next)
    } catch (err) {
      console.warn(`[storage] failed to read key "${key}":`, err)
      valueRef.current = initial
      setValueState(initial)
    }
    // `initial` is intentionally excluded from deps: changing `key` is the
    // only legitimate reason to re-hydrate, and `initial` is often a fresh
    // literal that would re-fire the effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Cross-tab sync
  const initialRef = useRef(initial)
  initialRef.current = initial
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      if (e.newValue === null) {
        // Sibling tab removed the key — reset to initial to mirror hydration.
        valueRef.current = initialRef.current
        setValueState(initialRef.current)
        return
      }
      try {
        const next = JSON.parse(e.newValue) as T
        valueRef.current = next
        setValueState(next)
      } catch (err) {
        console.warn(`[storage] cross-tab parse failed for "${key}":`, err)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const setValue = useCallback(
    (next: T | ((current: T | undefined) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (c: T | undefined) => T)(valueRef.current)
          : next
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved))
        valueRef.current = resolved
        setValueState(resolved)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          toast.error('Storage full — export and delete old projects.')
        } else {
          console.warn(`[storage] failed to write key "${key}":`, err)
        }
        // do NOT update state; in-memory value remains the last persisted one
      }
    },
    [key],
  )

  return [value, setValue]
}
