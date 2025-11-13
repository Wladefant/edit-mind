import sys
import io
import json
import logging
import re
import time
from pathlib import Path
from typing import Optional, Callable, Dict, List, TextIO
from dataclasses import dataclass
from faster_whisper import WhisperModel
import os
import torch

logger = logging.getLogger(__name__)
@dataclass
class TranscriptionResult:
    text: str
    segments: List[Dict[str, object]]
    language: Optional[str]

    def to_dict(self) -> Dict[str, object]:
        return {
            "text": self.text,
            "segments": self.segments,
            "language": self.language
        }


class StderrInterceptor(io.TextIOBase):
    def __init__(self, original_stderr: TextIO, line_callback: Optional[Callable[[str], None]] = None):
        self.original_stderr = original_stderr
        self.line_callback = line_callback
        self._buffer = ""

        outer_self = self

        class BufferProxy(io.RawIOBase):
            def write(_, b):
                text = b.decode("utf-8", errors="ignore")
                outer_self._handle_text(text)
                return outer_self.original_stderr.buffer.write(b)

        self.buffer = BufferProxy()

    def _handle_text(self, data: str):
        self._buffer += data

        # Split by carriage return first, then newline.
        parts = self._buffer.split('\r')
        if len(parts) > 1:
            for part in parts[:-1]:
                if part.strip() and self.line_callback:
                    self.line_callback(part.strip())
            self._buffer = parts[-1]

        lines = self._buffer.split('\n')
        if len(lines) > 1:
            for line in lines[:-1]:
                if line.strip() and self.line_callback:
                    self.line_callback(line.strip())
            self._buffer = lines[-1]

    def write(self, data: str):
        self._handle_text(data)
        return self.original_stderr.write(data)

    def flush(self):
        if self._buffer.strip() and self.line_callback:
            self.line_callback(self._buffer.strip())
            self._buffer = ""
        self.original_stderr.flush()

class ProgressTracker:
    PROGRESS_PATTERN = re.compile(r"(\d+)%")
    ELAPSED_PATTERN = re.compile(r"\[(\d+):(\d+)<(\d+):(\d+),")

    def __init__(self, callback: Optional[Callable[[int, str], None]] = None):
        self.callback = callback
        self.last_progress = -1

    def parse_line(self, line: str) -> None:

        match = self.PROGRESS_PATTERN.search(line)
        if not match:
            return

        progress = int(match.group(1))

        if progress == self.last_progress:
            return

        self.last_progress = progress
        elapsed_time = self._extract_elapsed_time(line)


        if self.callback:
            self.callback(progress, elapsed_time)

    def _extract_elapsed_time(self, line: str) -> str:
        match = self.ELAPSED_PATTERN.search(line)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return f"{minutes:02d}:{seconds:02d}"
        return "00:00"

class TranscriptionService:
    def __init__(self, model_name: str = "large-v3", device: str = "auto", compute_type: str = "float16"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.compute_type = "float16" if self.device == "cuda" else "float32"
        self._model: Optional[WhisperModel] = None

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            os.environ["HF_HUB_VERBOSITY"] = "info"
            os.environ["HF_HUB_DISABLE_TELEMETRY"] = "0"
            os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
            logging.getLogger("httpx").setLevel(logging.INFO)
            logging.getLogger("huggingface_hub").setLevel(logging.INFO)
            logger.info(f"Loading Faster-Whisper model: {self.model_name}")
            self._model = WhisperModel(self.model_name, device=self.device, compute_type=self.compute_type)
            logger.info("Model loaded successfully")
        return self._model

    def transcribe(
        self,
        video_path: str,
        output_path: str,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> TranscriptionResult:
        video_file = Path(video_path)
        if not video_file.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        logger.info(f"Starting transcription: {video_path}")
        start_transcription_time = time.time()

        if progress_callback:
            progress_callback(1, "00:00")
        progress_tracker = ProgressTracker(progress_callback)
        original_stderr = sys.stderr
        sys.stderr = StderrInterceptor(original_stderr, progress_tracker.parse_line)

        try:
            segments, info = self.model.transcribe(
                str(video_path),
                beam_size=5,
                word_timestamps=True,
                vad_filter=True,
                log_progress=True  
            )
            total_duration = round(info.duration, 2) if info else 0.0
            processed_duration = 0.0
        
            result_segments = []
            full_text = ""

            for seg in segments:
                segment_data = {
                    "id": seg.id,
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                    "words": [
                        {
                            "start": w.start,
                            "end": w.end,
                            "word": w.word
                        } for w in (seg.words or [])
                    ]
                }
                result_segments.append(segment_data)
                full_text += seg.text + " "
                processed_duration += seg.end - seg.start
                percent_done = (processed_duration / total_duration) * 100 if total_duration > 0 else 100
                elapsed_str = f"{int(processed_duration // 60):02d}:{int(processed_duration % 60):02d}"

                if progress_callback:
                    progress_callback(int(percent_done), elapsed_str)

        except RuntimeError as e:
            # Handle known "no audio" errors
            if "no audio streams" in str(e).lower() or "failed to load audio" in str(e).lower():
                logger.warning(f"No audio stream found in {video_path}. Returning empty transcription.")
                result = TranscriptionResult(text='', segments=[], language='N/A')
                self._save_result(result.to_dict(), output_path)
                if progress_callback:
                    progress_callback(100, "00:00")
                return result
            raise

        except IndexError as e:
            # Handle PyAV stream access errors
            if "tuple index out of range" in str(e).lower():
                logger.warning(f"No valid audio streams found in {video_path} (tuple index out of range). Returning empty transcription.")
                result = TranscriptionResult(text='', segments=[], language='N/A')
                self._save_result(result.to_dict(), output_path)
                if progress_callback:
                    progress_callback(100, "00:00")
                return result
            raise
        finally:
            sys.stderr = original_stderr
            
        total_transcription_time = int(time.time() - start_transcription_time)
        if progress_callback:
            progress_callback(100, f"{total_transcription_time // 60:02d}:{total_transcription_time % 60:02d}")

        result = TranscriptionResult(
            text=full_text.strip(),
            segments=result_segments,
            language=info.language
        )

        self._save_result(result.to_dict(), output_path)
        return result

    def _save_result(self, result: Dict[str, object], output_path: str) -> None:
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=4, ensure_ascii=False)
            logger.info(f"Transcription saved: {output_path}")
        except IOError as e:
            logger.error(f"Failed to write transcription file: {e}")
            raise


def run_transcription(
    video_path: str,
    json_file_path: str,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict[str, object]:
    service = TranscriptionService()
    result = service.transcribe(video_path, json_file_path, progress_callback)
    return result.to_dict()
