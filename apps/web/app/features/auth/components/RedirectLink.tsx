import { Link } from 'react-router-dom'

interface RedirectLinkProps {
  to: string
  text: string
  linkText: string
}

export function RedirectLink({ to, text, linkText }: RedirectLinkProps) {
  return (
    <p className="mt-8 text-center text-[14px] text-gray-500 dark:text-gray-400">
      {text}{' '}
      <Link to={to} className="text-black dark:text-white hover:opacity-70 transition-opacity font-medium">
        {linkText}
      </Link>
    </p>
  )
}
