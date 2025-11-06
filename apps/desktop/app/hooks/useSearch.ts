
import { useState } from 'react';
import { Scene } from '@/lib/types/scene';
import { SearchMetadata } from '@/lib/types/search';

export const useSearch = (prompt: string, setVideoConfig) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Scene[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata>({});

  const handleSearch = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setSearchResults([]);

    try {
      const { results, aspect_ratio, faces } = await window.conveyor.app.searchDocuments(prompt);
      setSearchResults(results);

      if (aspect_ratio && faces) {
        setSearchMetadata({
          aspectRatio: aspect_ratio,
          faces,
        });
      }

      if (aspect_ratio) {
        setVideoConfig((prev) => ({ ...prev, aspectRatio: aspect_ratio }));
      }
    } catch (error) {
      console.error('Error searching scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, searchResults, searchMetadata, handleSearch, setSearchResults };
};
