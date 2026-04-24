import { type PropsWithChildren } from 'react'

export function CenteredLayout({ children }: PropsWithChildren) {
  return (
    <main className="bg-background relative flex h-screen w-screen flex-col items-center justify-center gap-3 overflow-hidden">
      <div
        className="to-background/10 pointer-events-none absolute inset-0 z-0 bg-linear-to-tr from-transparent"
        aria-hidden="true"
      />
      <div className="from-background absolute inset-0 z-0 bg-linear-to-t to-transparent" />
      {children}
    </main>
  )
}
