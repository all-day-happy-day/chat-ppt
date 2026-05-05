import type { CSSProperties, PropsWithChildren } from 'react'

export function CenteredLayout({ children }: PropsWithChildren) {
  return (
    <main
      className="bg-background relative flex h-screen min-h-0 w-screen flex-col items-stretch overflow-hidden"
      style={{ '--header-height': '48px' } as CSSProperties}
    >
      {children}
    </main>
  )
}
