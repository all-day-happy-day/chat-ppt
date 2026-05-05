export interface HomeCardProps {
  title: string
  icon?: React.ReactNode
  onClick?: () => void | Promise<void>
  header?: boolean
}
