/* eslint-disable react-refresh/only-export-components -- hooks are intentionally exported with the provider. */
import * as React from 'react'

import { useGetProjectVariables } from '@/api/query/project.query'
import type { ProjectVariable } from '@/domain/models/project'

import { type VariableTagColorPair,variableTagColors } from './variable-color'

export interface ProjectVariablesScopeValue {
  readonly projectId: string
  readonly variables: readonly ProjectVariable[]
  readonly isLoading: boolean
  readonly colorForName: (name: string) => VariableTagColorPair
}

const ProjectVariablesScopeContext = React.createContext<ProjectVariablesScopeValue | null>(null)

export interface ProjectVariablesScopeProviderProps {
  readonly projectId: string
  readonly children: React.ReactNode
}

export function ProjectVariablesScopeProvider({
  projectId,
  children,
}: ProjectVariablesScopeProviderProps): React.ReactElement {
  const query = useGetProjectVariables(projectId)

  const colorForName = React.useCallback((name: string): VariableTagColorPair => variableTagColors(name), [])

  const value = React.useMemo((): ProjectVariablesScopeValue => {
    const variables: ProjectVariable[] = query.data ?? []
    return {
      projectId,
      variables,
      isLoading: query.isLoading,
      colorForName,
    }
  }, [colorForName, projectId, query.data, query.isLoading])

  return <ProjectVariablesScopeContext.Provider value={value}>{children}</ProjectVariablesScopeContext.Provider>
}

export function useProjectVariablesScope(): ProjectVariablesScopeValue {
  const ctx = React.useContext(ProjectVariablesScopeContext)
  if (ctx === null) {
    throw new Error('useProjectVariablesScope must be used within ProjectVariablesScopeProvider')
  }
  return ctx
}

export function useOptionalProjectVariablesScope(): ProjectVariablesScopeValue | null {
  return React.useContext(ProjectVariablesScopeContext)
}
