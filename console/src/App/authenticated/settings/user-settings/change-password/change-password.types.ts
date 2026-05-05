export interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface ChangePasswordProps {
  onOpenChange: (next: boolean) => void
  principal: string
  onSubmitPasswordChange: (newPassword: string) => Promise<void> | void
}
