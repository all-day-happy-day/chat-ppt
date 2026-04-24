import { Logo } from './logo/Logo'
import { SettingsMenu } from './settings-menu/SettingsMenu'

export function Header() {
  return (
    <header className="bg-header shadow-accent/80 flex h-(--header-height) min-h-(--header-height) w-full items-center justify-between border-b border-none px-4 shadow-lg">
      <div className="flex items-center">
        <Logo />
      </div>
      <div className="flex items-center">
        <SettingsMenu />
      </div>
    </header>
  )
}
