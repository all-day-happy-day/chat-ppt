import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-2 transition-all duration-300"
      title="To Home"
      aria-label="To Home"
    >
      <div className="overflow-hidden">
        <span className="text-xl font-semibold">ChatPPT</span>
      </div>
    </Link>
  )
}
