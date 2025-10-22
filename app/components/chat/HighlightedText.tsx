import React from 'react';
import { parseMentions } from '@/app/utils/search';

interface HighlightedTextProps {
  text: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text }) => {
  const highlightedText = parseMentions(text);

  return (
    <div className="highlight-layer" aria-hidden="true">
      {highlightedText.map((part, index) => (
        <span key={`text-part-${index}`} className={part.isMention ? 'mention-highlight' : ''}>
          {part.text}
        </span>
      ))}
    </div>
  );
};
