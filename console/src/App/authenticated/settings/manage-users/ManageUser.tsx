import * as React from 'react'
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useGetCurrentUser, useVerifyPassword } from '@/api/query/auth.query'
import { useGetUsers, usePatchUserRole } from '@/api/query/user.query'
import { BASE_LIST_PAGE_SIZE, BaseListFooter, BaseListHeader } from '@/App/layouts/base-list-layout/BaseListLayout'
import { ActionButton } from '@/components/common/action-button/ActionButton'
import { Button } from '@/components/ui/button/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import type { Role, User } from '@/domain/models/user'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { UseMutationResult } from '@tanstack/react-query'

const MIN_BODY_ROW_PX: number = 36

const MIN_PASSWORD_LENGTH_FOR_VERIFY: number = 4
const VERIFY_DEBOUNCE_MS: number = 300

const ROLE_LABEL_CLASS: Record<Role, string> = {
  ADMIN: 'text-admin',
  USER: 'text-user',
}

const getLastSignInDisplay = (lastSignIn: Date | null): string => {
  if (lastSignIn === null) {
    return '—'
  }
  return formatDate(lastSignIn)
}

interface RoleSwitchProps {
  readonly user: User
  readonly currentUserId: string
  readonly isPatchPending: boolean
  readonly onIntentChangeRole: (user: User, nextRole: Role) => void
}

const RoleSwitch = ({
  user,
  currentUserId,
  isPatchPending,
  onIntentChangeRole,
}: RoleSwitchProps): React.ReactElement => {
  const isAdmin: boolean = user.role === 'ADMIN'
  const isDisabled: boolean = user.id === currentUserId || isPatchPending

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isAdmin}
      aria-label={`Role: ${user.role === 'ADMIN' ? 'Admin' : 'User'}. Toggle to change.`}
      disabled={isDisabled}
      onClick={() => {
        const nextRole: Role = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
        onIntentChangeRole(user, nextRole)
      }}
      className={cn(
        'focus-visible:ring-ring relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDisabled && 'cursor-not-allowed opacity-50',
        !isDisabled && 'cursor-pointer',
        isAdmin ? 'bg-user' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out',
          isAdmin ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

interface AdminPasswordForm {
  password: string
}

interface ConfirmRoleChangeDialogProps {
  readonly pending: { readonly targetUser: User; readonly nextRole: Role } | null
  readonly formInstanceKey: number
  readonly onClose: () => void
  readonly adminPrincipal: string
  readonly patchUserRole: UseMutationResult<User, Error, { id: string; requestBody: { role: Role } }, unknown>
}

interface ConfirmRoleChangeDialogFormProps {
  readonly pending: { readonly targetUser: User; readonly nextRole: Role }
  readonly onClose: () => void
  readonly adminPrincipal: string
  readonly patchUserRole: UseMutationResult<User, Error, { id: string; requestBody: { role: Role } }, unknown>
}

const ConfirmRoleChangeDialogForm = ({
  pending,
  onClose,
  adminPrincipal,
  patchUserRole,
}: ConfirmRoleChangeDialogFormProps): React.ReactElement => {
  const { t } = useTranslation()
  const verifyPassword = useVerifyPassword()

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<AdminPasswordForm>({
    defaultValues: { password: '' },
    mode: 'onChange',
  })

  const password: string = useWatch({ control, name: 'password' })

  const [verifiedSnapshot, setVerifiedSnapshot] = React.useState<string | null>(null)
  const isPasswordVerified: boolean = verifiedSnapshot !== null && verifiedSnapshot === password

  const passwordRef: React.MutableRefObject<string> = React.useRef<string>('')
  const timerRef: React.MutableRefObject<number | null> = React.useRef<number | null>(null)

  React.useEffect((): (() => void) => {
    return (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const verifyPasswordDebounced = (value: string): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    passwordRef.current = value
    if (value.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
      setVerifiedSnapshot(null)
      setError('password', {
        type: 'validate',
        message: t('common.global.password_too_short', { minLength: MIN_PASSWORD_LENGTH_FOR_VERIFY }),
      })
      return
    }

    timerRef.current = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await verifyPassword.mutateAsync({ principal: adminPrincipal, password: value })

          if (passwordRef.current !== value) return

          setVerifiedSnapshot(value)
          clearErrors('password')
        } catch {
          if (passwordRef.current !== value) return

          setVerifiedSnapshot(null)
          setError('password', { type: 'validate', message: t('common.global.wrong_password') })
        }
      })()
    }, VERIFY_DEBOUNCE_MS)
  }

  const onConfirm: SubmitHandler<AdminPasswordForm> = async (): Promise<void> => {
    if (!isPasswordVerified) {
      setError('password', { type: 'validate', message: t('common.global.wrong_password') })
      return
    }
    try {
      await patchUserRole.mutateAsync({
        id: pending.targetUser.id,
        requestBody: { role: pending.nextRole },
      })
      onClose()
    } catch {
      toast.error('Could not update role. Please try again.')
    }
  }

  return (
    <React.Suspense>
      <div className="fixed inset-0 z-100 flex h-full w-full items-center justify-center">
        <div
          className="absolute inset-0 flex h-full w-full justify-center bg-black/90"
          role="presentation"
          onClick={() => onClose()}
        />
        <div className="z-101 flex flex-row items-center justify-center">
          <Card className="w-[400px] p-4 pb-2">
            <CardHeader className="w-full">
              <CardTitle>Confirm role change</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              <p className="text-muted-foreground mb-4 text-sm">
                Enter your password to set{' '}
                <span className="text-foreground font-medium">{pending.targetUser.username}</span> to{' '}
                <span className={cn('font-semibold', ROLE_LABEL_CLASS[pending.nextRole])}>{pending.nextRole}</span>.
              </p>
              <form onSubmit={handleSubmit(onConfirm)} className="flex w-full flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <InputField<AdminPasswordForm>
                    register={register}
                    name="password"
                    label="Your password"
                    placeholder="********"
                    type="password"
                    registerOptions={{
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        verifyPasswordDebounced(e.target.value)
                      },
                      validate: (value: string) => {
                        if (value.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
                          return t('common.global.password_too_short', { minLength: MIN_PASSWORD_LENGTH_FOR_VERIFY })
                        }
                        return true
                      },
                    }}
                  />
                  <div className="min-h-4 text-[11px]">
                    {errors.password && <p className="text-destructive pl-1">{errors.password.message}</p>}
                    {verifiedSnapshot !== null && isPasswordVerified && (
                      <p className="text-user pl-1">{t('common.global.password_verified')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-row justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[30px] w-1/3"
                    onClick={() => onClose()}
                  >
                    Cancel
                  </Button>
                  <ActionButton
                    type="submit"
                    label="Apply"
                    disabled={!isPasswordVerified || patchUserRole.isPending}
                    className="w-1/3"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </React.Suspense>
  )
}

const ConfirmRoleChangeDialog = ({
  pending,
  formInstanceKey,
  onClose,
  adminPrincipal,
  patchUserRole,
}: ConfirmRoleChangeDialogProps): React.ReactElement | null => {
  if (pending === null) {
    return null
  }

  return (
    <ConfirmRoleChangeDialogForm
      key={formInstanceKey}
      pending={pending}
      onClose={onClose}
      adminPrincipal={adminPrincipal}
      patchUserRole={patchUserRole}
    />
  )
}

interface ManageUserListContentProps {
  readonly columnLabels: {
    readonly username: string
    readonly role: string
    readonly email: string
    readonly createdAt: string
    readonly lastSignIn: string
    readonly empty: string
  }
  readonly users: readonly User[]
  readonly currentUserId: string
  readonly patchUserRole: UseMutationResult<User, Error, { id: string; requestBody: { role: Role } }, unknown>
  readonly onRoleChangeIntent: (user: User, nextRole: Role) => void
}

const ManageUserListContent = ({
  columnLabels,
  users,
  currentUserId,
  patchUserRole,
  onRoleChangeIntent,
}: ManageUserListContentProps): React.ReactElement => {
  const tableRef: React.RefObject<HTMLTableElement | null> = React.useRef<HTMLTableElement | null>(null)
  const theadRef: React.RefObject<HTMLTableSectionElement | null> = React.useRef<HTMLTableSectionElement | null>(null)
  const [bodyRowHeightPx, setBodyRowHeightPx] = React.useState<number>(MIN_BODY_ROW_PX)

  React.useLayoutEffect((): void | (() => void) => {
    const tableEl: HTMLTableElement | null = tableRef.current
    const theadEl: HTMLTableSectionElement | null = theadRef.current
    if (tableEl === null || theadEl === null) {
      return
    }

    const compute = (): void => {
      const availablePx: number = Math.max(0, tableEl.clientHeight - theadEl.offsetHeight)
      const perRow: number = Math.floor(availablePx / BASE_LIST_PAGE_SIZE)
      setBodyRowHeightPx(Math.max(MIN_BODY_ROW_PX, perRow))
    }

    compute()
    const ro: ResizeObserver = new ResizeObserver(compute)
    ro.observe(tableEl)
    return (): void => {
      ro.disconnect()
    }
  }, [])

  const trHeightStyle: React.CSSProperties = React.useMemo((): React.CSSProperties => {
    return {
      height: bodyRowHeightPx,
      minHeight: bodyRowHeightPx,
      boxSizing: 'border-box',
    }
  }, [bodyRowHeightPx])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
      {users.length > 0 ? (
        <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
          <thead ref={theadRef} className="text-md">
            <tr>
              <th className="bg-secondary h-fit min-w-[140px] py-4 pl-4 text-left">{columnLabels.username}</th>
              <th className="bg-secondary h-fit w-[28%] min-w-[300px] py-4 pl-4 text-left">{columnLabels.role}</th>
              <th className="bg-secondary h-fit min-w-[180px] py-4 pl-4 text-left">{columnLabels.email}</th>
              <th className="bg-secondary h-fit min-w-[120px] py-4 pl-4 text-left">{columnLabels.createdAt}</th>
              <th className="bg-secondary h-fit min-w-[120px] py-4 pl-4 text-left">{columnLabels.lastSignIn}</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground text-[14px]">
            {Array.from({ length: BASE_LIST_PAGE_SIZE }, (_: unknown, rowIndex: number) => {
              const user: User | undefined = users[rowIndex]
              const rowKey: string = user !== undefined ? user.id : `placeholder-${String(rowIndex)}`
              return (
                <tr
                  key={rowKey}
                  style={trHeightStyle}
                  className="border-border hover:bg-border active:bg-secondary border-y align-middle"
                >
                  {user === undefined ? (
                    <td colSpan={5} className="align-middle" />
                  ) : (
                    <>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserInitialAvatar username={user.username} className="size-8 shrink-0 text-xs" />
                          <span className="text-foreground min-w-0 truncate font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="min-w-[300px] px-4 py-1 align-middle">
                        <div className="flex min-w-0 items-center justify-start gap-3">
                          <span
                            className={cn(
                              'w-11 shrink-0 text-center text-xs font-semibold uppercase',
                              user.role === 'USER' ? ROLE_LABEL_CLASS.USER : 'text-muted-foreground'
                            )}
                          >
                            User
                          </span>
                          <RoleSwitch
                            user={user}
                            currentUserId={currentUserId}
                            isPatchPending={patchUserRole.isPending}
                            onIntentChangeRole={onRoleChangeIntent}
                          />
                          <span
                            className={cn(
                              'w-14 shrink-0 text-center text-xs font-semibold uppercase',
                              user.role === 'ADMIN' ? ROLE_LABEL_CLASS.ADMIN : 'text-muted-foreground'
                            )}
                          >
                            Admin
                          </span>
                        </div>
                      </td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{user.email}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(user.createdAt)}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">
                        {getLastSignInDisplay(user.lastSignIn)}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="text-muted-foreground text-center text-sm">{columnLabels.empty}</div>
        </div>
      )}
    </div>
  )
}

export function ManageUser(): React.ReactElement | null {
  const { t } = useTranslation()

  const currentUser: User | undefined = getQueryData(useGetCurrentUser())
  const users: User[] | undefined = getQueryData(useGetUsers())
  const patchUserRole: ReturnType<typeof usePatchUserRole> = usePatchUserRole()

  const [roleConfirmPending, setRoleConfirmPending] = React.useState<{
    targetUser: User
    nextRole: Role
  } | null>(null)
  const [roleConfirmFormKey, setRoleConfirmFormKey] = React.useState<number>(0)

  const [userListPage, setUserListPage] = React.useState<number>(1)

  const sortedUsers: User[] = React.useMemo((): User[] => {
    if (users === undefined) {
      return []
    }
    return [...users].sort((a: User, b: User) => a.username.localeCompare(b.username))
  }, [users])

  const userTotalPages: number = Math.max(1, Math.ceil(sortedUsers.length / BASE_LIST_PAGE_SIZE))
  const safeUserListPage: number = Math.min(userListPage, userTotalPages)

  const pagedUsers: User[] = React.useMemo((): User[] => {
    const start: number = (safeUserListPage - 1) * BASE_LIST_PAGE_SIZE
    return sortedUsers.slice(start, start + BASE_LIST_PAGE_SIZE)
  }, [sortedUsers, safeUserListPage])

  if (currentUser === undefined || users === undefined) {
    return null
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
        <BaseListHeader title={t('header.settings.manage_users')} />
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-4 text-center text-sm">
          Administrator access is required to manage users.
        </div>
        <BaseListFooter />
      </div>
    )
  }

  const columnLabels = {
    username: t('list.username'),
    role: 'Role',
    email: t('common.user.email'),
    createdAt: t('list.created_at'),
    lastSignIn: t('list.last_signin'),
    empty: t('common.global.no_content'),
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={t('header.settings.manage_users')} />
      <div className="min-h-0 flex-1">
        <ManageUserListContent
          columnLabels={columnLabels}
          users={pagedUsers}
          currentUserId={currentUser.id}
          patchUserRole={patchUserRole}
          onRoleChangeIntent={(user: User, nextRole: Role): void => {
            setRoleConfirmFormKey((k: number) => k + 1)
            setRoleConfirmPending({ targetUser: user, nextRole })
          }}
        />
      </div>
      <BaseListFooter
        pagination={{ page: userListPage, pageSize: BASE_LIST_PAGE_SIZE, total: sortedUsers.length }}
        onPageChange={setUserListPage}
      />
      <ConfirmRoleChangeDialog
        pending={roleConfirmPending}
        formInstanceKey={roleConfirmFormKey}
        onClose={() => setRoleConfirmPending(null)}
        adminPrincipal={currentUser.username}
        patchUserRole={patchUserRole}
      />
    </div>
  )
}
