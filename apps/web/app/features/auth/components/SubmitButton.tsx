interface SubmitButtonProps {
  loading: boolean
  text: string
  loadingText: string
}

export function SubmitButton({ loading, text, loadingText }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black text-[15px] font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? loadingText : text}
    </button>
  )
}
