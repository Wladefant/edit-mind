interface AuthHeaderProps {
  title: string
  subtitle: string
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <>
      <h1 className="text-4xl font-semibold text-black dark:text-white tracking-tight mb-3">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">{subtitle}</p>
    </>
  )
}
