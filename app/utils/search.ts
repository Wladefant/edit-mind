export const MENTION_TRIGGER = '@' as const
export const AUTOCOMPLETE_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'] as const
const MENTION_REGEX = /@(\w+)/g

interface TextPart {
  text: string
  isMention: boolean
}

export const parseMentions = (text: string): TextPart[] => {
  const parts: TextPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(MENTION_REGEX)

  while ((match = regex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isMention: false,
      })
    }

    // Add mention
    parts.push({
      text: match[0],
      isMention: true,
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isMention: false,
    })
  }

  return parts
}
