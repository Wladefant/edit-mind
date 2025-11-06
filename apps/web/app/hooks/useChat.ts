import { useState, useRef, useEffect } from 'react';
import { video as mockVideo } from '../constants/mockVideoData';

type Message = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [videoResults, setVideoResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, videoResults]);

  const sendMessage = () => {
    if (!input.trim() || isLoading) return;

    const text = input;
    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'assistant', text: 'Got it. Processing your request…' },
      ]);
    }, 800);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'assistant', text: 'Here are some matching clips I found:' },
      ]);
      setVideoResults(mockVideo);
      setIsLoading(false);
    }, 2000);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return {
    messages,
    input,
    videoResults,
    isLoading,
    messagesEndRef,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
  };
}
