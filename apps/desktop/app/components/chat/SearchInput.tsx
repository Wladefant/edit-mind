import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type FC,
  type RefObject,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import defaultFaces from '../../../.faces.json';
import type { Video } from '@shared/types/video';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import { useFaceExtraction } from '@/app/hooks/useFaceExtraction';
import { useFilteredFaces } from '@/app/hooks/useFilteredFaces';
import { AUTOCOMPLETE_KEYS, MENTION_TRIGGER } from '@/app/utils/search';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { HighlightedText } from './HighlightedText';

interface SearchInputProps {
  videos: Video[];
  setPrompt: (prompt: string) => void;
  prompt: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

type LoadedFaces = Record<string, string[]>;

const detectMentionTrigger = (text: string, cursorPosition: number): string | null => {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf(MENTION_TRIGGER);

  if (lastAtIndex === -1) return null;

  const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

  if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
    return textAfterAt;
  }

  return null;
};

export const SearchInput: FC<SearchInputProps> = ({ videos, setPrompt, prompt, textareaRef }) => {
  const loadedFaces: LoadedFaces = defaultFaces;

  const [autocompleteQuery, setAutocompleteQuery] = useState<string>('');
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState<number>(0);
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);

  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const faces = useFaceExtraction(videos, loadedFaces);
  const filteredFaces = useFilteredFaces(faces, autocompleteQuery);

  const syncScroll = useCallback((): void => {
    if (!textareaRef.current || !highlightLayerRef.current) return;

    highlightLayerRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightLayerRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }, [textareaRef]);

  const handlePromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart ?? 0;

      setPrompt(newValue);

      const mentionQuery = detectMentionTrigger(newValue, cursorPosition);

      if (mentionQuery !== null) {
        setAutocompleteQuery(mentionQuery);
        setShowAutocomplete(true);
        setSelectedAutocompleteIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    },
    [setPrompt]
  );

  const insertFaceName = useCallback(
    (faceName: string): void => {
      if (!textareaRef.current) return;

      const cursorPosition = textareaRef.current.selectionStart ?? 0;
      const textBeforeCursor = prompt.slice(0, cursorPosition);
      const textAfterCursor = prompt.slice(cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf(MENTION_TRIGGER);

      if (lastAtIndex === -1) return;

      const newPrompt = `${prompt.slice(0, lastAtIndex)}@${faceName} ${textAfterCursor}`;
      setPrompt(newPrompt);
      setShowAutocomplete(false);

      requestAnimationFrame(() => {
        if (!textareaRef.current) return;

        const newCursorPos = lastAtIndex + faceName.length + 2; // @ + name + space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      });
    },
    [prompt, setPrompt, textareaRef]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (!showAutocomplete || filteredFaces.length === 0) return;

      const key = e.key as (typeof AUTOCOMPLETE_KEYS)[number];

      switch (key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedAutocompleteIndex((prev) => Math.min(prev + 1, filteredFaces.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedAutocompleteIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
        case 'Tab':
          e.preventDefault();
          insertFaceName(filteredFaces[selectedAutocompleteIndex].name);
          break;

        case 'Escape':
          e.preventDefault();
          setShowAutocomplete(false);
          break;
      }
    },
    [showAutocomplete, filteredFaces, selectedAutocompleteIndex, insertFaceName]
  );

  const handleFaceClick = useCallback(
    (faceName: string) => (): void => {
      insertFaceName(faceName);
    },
    [insertFaceName]
  );

  const handleFaceHover = useCallback(
    (index: number) => (): void => {
      setSelectedAutocompleteIndex(index);
    },
    []
  );

  useEffect(() => {
    if (!showAutocomplete || !autocompleteRef.current) return;

    const selectedElement = autocompleteRef.current.querySelector('.autocomplete-item.selected') as HTMLElement | null;

    selectedElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedAutocompleteIndex, showAutocomplete]);

  useClickOutside([autocompleteRef, textareaRef], () => setShowAutocomplete(false));

  return (
    <div className="chat-input-wrapper">
      <div className="highlight-container">
        <div ref={highlightLayerRef} className="highlight-layer-wrapper">
          <HighlightedText text={prompt} />
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
        <AutocompleteDropdown
          filteredFaces={filteredFaces}
          selectedAutocompleteIndex={selectedAutocompleteIndex}
          onFaceClick={handleFaceClick}
          onFaceHover={handleFaceHover}
          autocompleteRef={autocompleteRef}
        />
      )}
    </div>
  );
};