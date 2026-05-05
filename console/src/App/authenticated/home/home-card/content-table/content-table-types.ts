import * as React from 'react'

export interface ContentTableProps {
  contents: (React.ReactNode | null)[]
  icons?: (React.ReactNode | null)[]
}

export interface TableRowProps {
  content: React.ReactNode
  icon?: React.ReactNode
  borderTop?: boolean
}
