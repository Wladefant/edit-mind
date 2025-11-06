import React from 'react';
import { FaceData } from '@/lib/types/search';

interface AutocompleteDropdownProps {
  filteredFaces: FaceData[];
  selectedAutocompleteIndex: number;
  onFaceClick: (faceName: string) => () => void;
  onFaceHover: (index: number) => () => void;
  autocompleteRef: React.RefObject<HTMLDivElement>;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  filteredFaces,
  selectedAutocompleteIndex,
  onFaceClick,
  onFaceHover,
  autocompleteRef,
}) => {
  return (
    <div
      ref={autocompleteRef}
      id="autocomplete-list"
      className="autocomplete-dropdown"
      role="listbox"
      aria-label="Face suggestions"
    >
      {filteredFaces.map((face, index) => {
        const isSelected = index === selectedAutocompleteIndex;
        const initial = face.name.charAt(0).toUpperCase();

        return (
          <div
            key={face.name}
            role="option"
            aria-selected={isSelected}
            className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
            onClick={onFaceClick(face.name)}
            onMouseEnter={onFaceHover(index)}
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
        );
      })}
    </div>
  );
};
