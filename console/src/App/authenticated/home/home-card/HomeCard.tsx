import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

import type { HomeCardProps } from './homd-card.types'

export function HomeCard({ title, icon, children }: HomeCardProps & { children?: React.ReactNode }) {
  return (
    <Card className="h-[300px] w-[500px] rounded-xl transition-all duration-300 hover:scale-103">
      <CardHeader className="bg-accent/40 w-full rounded-t-xl p-4">
        {icon && icon}
        <CardTitle className="pl-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-full w-full p-2">
        <Card className="h-full w-full shadow-none">{children && children}</Card>
      </CardContent>
    </Card>
  )
}
