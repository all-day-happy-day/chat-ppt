import type { CSSProperties, PropsWithChildren } from 'react'

export function CenteredLayout({ children }: PropsWithChildren) {
  return (
    <main
      className="bg-background relative flex h-screen w-screen flex-col items-center justify-center gap-3"
      style={{ '--header-height': '48px' } as CSSProperties}
    >
      {children}
    </main>
  )
}
