import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type FC,
  type RefObject,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import defaultFaces from '../../../faces.json'
import type { Video } from '@/lib/types/video'
import { useClickOutside } from '@/app/hooks/useClickOutside'
import { useFaceExtraction } from '@/app/hooks/useFaceExtraction'
import { useFilteredFaces } from '@/app/hooks/useFilteredFaces'
import { AUTOCOMPLETE_KEYS, MENTION_TRIGGER, parseMentions } from '@/app/utils/search'

interface SearchInputProps {
  videos: Video[]
  setPrompt: (prompt: string) => void
  prompt: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

type LoadedFaces = Record<string, string[]>

const detectMentionTrigger = (text: string, cursorPosition: number): string | null => {
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = textBeforeCursor.lastIndexOf(MENTION_TRIGGER)

  if (lastAtIndex === -1) return null

  const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

  // Check if it's a valid mention (no spaces or newlines)
  if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
    return textAfterAt
  }

  return null
}

export const SearchInput: FC<SearchInputProps> = ({ videos, setPrompt, prompt, textareaRef }) => {
  const loadedFaces: LoadedFaces = defaultFaces

  const [autocompleteQuery, setAutocompleteQuery] = useState<string>('')
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState<number>(0)
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false)

  const highlightLayerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const faces = useFaceExtraction(videos, loadedFaces)
  const filteredFaces = useFilteredFaces(faces, autocompleteQuery)
  const highlightedText = useMemo(() => parseMentions(prompt), [prompt])

  const syncScroll = useCallback((): void => {
    if (!textareaRef.current || !highlightLayerRef.current) return

    highlightLayerRef.current.scrollTop = textareaRef.current.scrollTop
    highlightLayerRef.current.scrollLeft = textareaRef.current.scrollLeft
  }, [textareaRef])

  const handlePromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart ?? 0

      setPrompt(newValue)

      const mentionQuery = detectMentionTrigger(newValue, cursorPosition)

      if (mentionQuery !== null) {
        setAutocompleteQuery(mentionQuery)
        setShowAutocomplete(true)
        setSelectedAutocompleteIndex(0)
      } else {
        setShowAutocomplete(false)
      }
    },
    [setPrompt]
  )

  const insertFaceName = useCallback(
    (faceName: string): void => {
      if (!textareaRef.current) return

      const cursorPosition = textareaRef.current.selectionStart ?? 0
      const textBeforeCursor = prompt.slice(0, cursorPosition)
      const textAfterCursor = prompt.slice(cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf(MENTION_TRIGGER)

      if (lastAtIndex === -1) return

      const newPrompt = `${prompt.slice(0, lastAtIndex)}@${faceName} ${textAfterCursor}`
      setPrompt(newPrompt)
      setShowAutocomplete(false)

      requestAnimationFrame(() => {
        if (!textareaRef.current) return

        const newCursorPos = lastAtIndex + faceName.length + 2 // @ + name + space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        textareaRef.current.focus()
      })
    },
    [prompt, setPrompt, textareaRef]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (!showAutocomplete || filteredFaces.length === 0) return

      const key = e.key as (typeof AUTOCOMPLETE_KEYS)[number]

      switch (key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedAutocompleteIndex((prev) => Math.min(prev + 1, filteredFaces.length - 1))
          break

        case 'ArrowUp':
          e.preventDefault()
          setSelectedAutocompleteIndex((prev) => Math.max(prev - 1, 0))
          break

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          insertFaceName(filteredFaces[selectedAutocompleteIndex].name)
          break

        case 'Escape':
          e.preventDefault()
          setShowAutocomplete(false)
          break
      }
    },
    [showAutocomplete, filteredFaces, selectedAutocompleteIndex, insertFaceName]
  )

  const handleFaceClick = useCallback(
    (faceName: string) => (): void => {
      insertFaceName(faceName)
    },
    [insertFaceName]
  )

  const handleFaceHover = useCallback(
    (index: number) => (): void => {
      setSelectedAutocompleteIndex(index)
    },
    []
  )

  useEffect(() => {
    if (!showAutocomplete || !autocompleteRef.current) return

    const selectedElement = autocompleteRef.current.querySelector('.autocomplete-item.selected') as HTMLElement | null

    selectedElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedAutocompleteIndex, showAutocomplete])

  useClickOutside([autocompleteRef, textareaRef], () => setShowAutocomplete(false))

  return (
    <div className="chat-input-wrapper">
      <div className="highlight-container">
        <div ref={highlightLayerRef} className="highlight-layer" aria-hidden="true">
          {highlightedText.map((part, index) => (
            <span key={`text-part-${index}`} className={part.isMention ? 'mention-highlight' : ''}>
              {part.text}
            </span>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="chat-prompt-input"
          value={prompt}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          placeholder="Describe your rough cut (e.g., 'scenes with @John and a forest wide shot'). Type @ to mention people."
          rows={3}
          aria-label="Search prompt input"
          aria-autocomplete="list"
          aria-controls={showAutocomplete ? 'autocomplete-list' : undefined}
          aria-expanded={showAutocomplete}
        />
      </div>

      {showAutocomplete && filteredFaces.length > 0 && (
        <div
          ref={autocompleteRef}
          id="autocomplete-list"
          className="autocomplete-dropdown"
          role="listbox"
          aria-label="Face suggestions"
        >
          {filteredFaces.map((face, index) => {
            const isSelected = index === selectedAutocompleteIndex
            const initial = face.name.charAt(0).toUpperCase()

            return (
              <div
                key={face.name}
                role="option"
                aria-selected={isSelected}
                className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                onClick={handleFaceClick(face.name)}
                onMouseEnter={handleFaceHover(index)}
              >
                {face.thumbnail ? (
                  <img
                    src={face.thumbnail}
                    alt={`${face.name}'s face`}
                    className="autocomplete-thumbnail"
                    loading="lazy"
                  />
                ) : (
                  <div className="autocomplete-thumbnail-placeholder" aria-label={`${face.name} placeholder`}>
                    {initial}
                  </div>
                )}

                <div className="autocomplete-info">
                  <span className="autocomplete-name">{face.name}</span>
                  <span className="autocomplete-count">
                    {face.count} scene{face.count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
