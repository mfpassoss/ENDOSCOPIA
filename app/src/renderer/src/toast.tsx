import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; msg: string; err: boolean }
const Ctx = createContext<(msg: string, err?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((msg: string, err = false) => {
    const id = ++seq.current
    setItems((s) => [...s, { id, msg, err }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), err ? 6000 : 3000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100 }}>
        {items.map((t) => (
          <div key={t.id} className={'toast' + (t.err ? ' err' : '')} style={{ position: 'static' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): (msg: string, err?: boolean) => void {
  return useContext(Ctx)
}
