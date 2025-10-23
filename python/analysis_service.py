import sys
import os
import json
import argparse
import asyncio
import logging
from pathlib import Path
from typing import Optional, Callable, Dict, Union, Set
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol

from transcribe import TranscriptionService
from analyze import AnalysisConfig, OutputManager, VideoAnalysisResult, VideoAnalyzer
from batch_add_faces  import batch_add_faces_from_folder


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Service operational states."""
    LOADING = "loading"
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


class MessageType(Enum):
    """WebSocket message types."""
    # Requests
    ANALYZE = "analyze"
    TRANSCRIBE = "transcribe"
    REINDEX_FACES = "reindex_faces"
    HEALTH = "health"
    
    # Responses
    STATUS = "status"
    ERROR = "error"
    ANALYSIS_PROGRESS = "analysis_progress"
    ANALYSIS_RESULT = "analysis_result"
    ANALYSIS_ERROR = "analysis_error"
    TRANSCRIPTION_PROGRESS = "transcription_progress"
    TRANSCRIPTION_COMPLETE = "transcription_complete"
    TRANSCRIPTION_ERROR = "transcription_error"
    REINDEX_PROGRESS = "reindex_progress"
    REINDEX_COMPLETE = "reindex_complete"
    REINDEX_ERROR = "reindex_error"


JsonDict = Dict[str, Union[str, int, float, bool, None, Dict, list]]


@dataclass
class ServiceMetrics:
    """Service performance metrics."""
    total_analyses: int = 0
    total_transcriptions: int = 0
    failed_analyses: int = 0
    failed_transcriptions: int = 0
    
    def record_analysis(self, success: bool) -> None:
        """Record an analysis completion."""
        self.total_analyses += 1
        if not success:
            self.failed_analyses += 1
    
    def record_transcription(self, success: bool) -> None:
        """Record a transcription completion."""
        self.total_transcriptions += 1
        if not success:
            self.failed_transcriptions += 1
    
    def to_dict(self) -> JsonDict:
        """Convert metrics to dictionary."""
        return {
            "total_analyses": self.total_analyses,
            "total_transcriptions": self.total_transcriptions,
            "failed_analyses": self.failed_analyses,
            "failed_transcriptions": self.failed_transcriptions,
            "success_rate_analyses": (
                (self.total_analyses - self.failed_analyses) / self.total_analyses * 100
                if self.total_analyses > 0 else 100.0
            ),
            "success_rate_transcriptions": (
                (self.total_transcriptions - self.failed_transcriptions) / self.total_transcriptions * 100
                if self.total_transcriptions > 0 else 100.0
            )
        }


@dataclass
class ServiceState:
    """Centralized service state management with concurrent request tracking."""
    status: ServiceStatus = ServiceStatus.READY
    active_analyses: Set[str] = None
    active_transcriptions: Set[str] = None
    metrics: ServiceMetrics = None
    
    def __post_init__(self) -> None:
        """Initialize mutable default values."""
        if self.active_analyses is None:
            self.active_analyses = set()
        if self.active_transcriptions is None:
            self.active_transcriptions = set()
        if self.metrics is None:
            self.metrics = ServiceMetrics()
    
    def is_ready(self) -> bool:
        """Check if service is ready to accept requests."""
        return self.status == ServiceStatus.READY
    
    def is_processing_video(self, video_path: str) -> bool:
        """Check if a specific video is currently being processed."""
        return video_path in self.active_analyses
    
    def start_analysis(self, video_path: str) -> None:
        """Mark a video as being analyzed."""
        self.active_analyses.add(video_path)
        logger.info(f"Active analyses: {len(self.active_analyses)}")
    
    def finish_analysis(self, video_path: str, success: bool = True) -> None:
        """Mark a video analysis as complete."""
        self.active_analyses.discard(video_path)
        self.metrics.record_analysis(success)
        logger.info(f"Active analyses: {len(self.active_analyses)}")
    
    def start_transcription(self, video_path: str) -> None:
        """Mark a video as being transcribed."""
        self.active_transcriptions.add(video_path)
        logger.info(f"Active transcriptions: {len(self.active_transcriptions)}")
    
    def finish_transcription(self, video_path: str, success: bool = True) -> None:
        """Mark a video transcription as complete."""
        self.active_transcriptions.discard(video_path)
        self.metrics.record_transcription(success)
        logger.info(f"Active transcriptions: {len(self.active_transcriptions)}")


class WebSocketHandler:
    """Handles WebSocket connections and message routing."""
    
    def __init__(self, service_state: ServiceState, max_concurrent_analyses: int = 3):
        self.state = service_state
        self.max_concurrent_analyses = max_concurrent_analyses
        self.analysis_semaphore = asyncio.Semaphore(max_concurrent_analyses)
        self.transcription_service = TranscriptionService()
        self.active_connections = 0
        self.reindex_lock = asyncio.Lock()

    async def handle_connection(self, websocket: WebSocketServerProtocol) -> None:
        """Handle incoming WebSocket connection lifecycle."""
        self.active_connections += 1
        client_addr = websocket.remote_address
        connection_id = f"{client_addr}_{datetime.now().strftime('%H%M%S%f')}"
        logger.info(f"Client connected: {connection_id} (total: {self.active_connections})")
        
        try:
            async for message in websocket:
                await self._process_message(websocket, message)
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Client disconnected: {connection_id} - {e.code}")
        except Exception as e:
            logger.exception(f"Unhandled exception in WebSocket handler for {connection_id}")
        finally:
            self.active_connections -= 1
            logger.info(f"Connection closed: {connection_id} (remaining: {self.active_connections})")
    
    async def _process_message(self, websocket: WebSocketServerProtocol, message: str) -> None:
        """Process and route incoming messages."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            payload = data.get("payload", {})
            
            if not isinstance(payload, dict):
                await self._send_error(websocket, MessageType.ERROR, "Payload must be an object")
                return
            
            # Route message to appropriate handler
            handlers: Dict[str, Callable] = {
                MessageType.ANALYZE.value: self._handle_analyze,
                MessageType.TRANSCRIBE.value: self._handle_transcribe,
                MessageType.REINDEX_FACES.value: self._handle_reindex_faces,
                MessageType.HEALTH.value: self._handle_health,
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(websocket, payload)
            else:
                await self._send_error(
                    websocket,
                    MessageType.ERROR,
                    f"Unknown message type: {message_type}"
                )
        
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self._send_error(websocket, MessageType.ERROR, "Invalid JSON format")
        except Exception as e:
            logger.exception("Error processing message")
            await self._send_error(
                websocket,
                MessageType.ERROR,
                f"Internal error: {str(e)}"
            )
    
    async def _send_message(
        self,
        websocket: WebSocketServerProtocol,
        msg_type: MessageType,
        payload: JsonDict
    ) -> None:
        """Send a message to the client."""
        try:
            message = json.dumps({"type": msg_type.value, "payload": payload})
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Cannot send {msg_type.value}: connection closed")
        except Exception as e:
            logger.error(f"Failed to send message {msg_type.value}: {e}")
    
    async def _send_error(
        self,
        websocket: WebSocketServerProtocol,
        msg_type: MessageType,
        error_msg: str
    ) -> None:
        """Send an error message to the client."""
        await self._send_message(websocket, msg_type, {"message": error_msg})
    
    async def _handle_health(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle health check request."""
        health_data: JsonDict = {
            "status": self.state.status.value,
            "active_connections": self.active_connections,
            "active_analyses": len(self.state.active_analyses),
            "active_transcriptions": len(self.state.active_transcriptions),
            "max_concurrent_analyses": self.max_concurrent_analyses,
            "metrics": self.state.metrics.to_dict()
        }
        await self._send_message(websocket, MessageType.STATUS, health_data)
        
    async def _handle_analyze(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle video analysis request with concurrency control."""
        # Validate payload first
        video_path_str = payload.get("video_path")
        if not isinstance(video_path_str, str):
            await self._send_error(
                websocket,
                MessageType.ANALYSIS_ERROR,
                "Missing or invalid 'video_path' in payload"
            )
            return
        
        video_path = Path(video_path_str)
        if not video_path.exists():
            await self._send_error(
                websocket,
                MessageType.ANALYSIS_ERROR,
                f"Video file not found: {video_path}"
            )
            return
        
        video_path_normalized = str(video_path.resolve())
        
        # Check if this specific video is already being processed
        if self.state.is_processing_video(video_path_normalized):
            await self._send_error(
                websocket,
                MessageType.ANALYSIS_ERROR,
                f"Video is already being analyzed: {video_path.name}"
            )
            return
        
        # BUILD CONFIG BEFORE USING IT
        settings = payload.get("settings")
        settings_dict = settings if isinstance(settings, dict) else {}
        config = self._build_analysis_config(settings_dict)
        
        success = False
        # Use semaphore to limit concurrent analyses
        async with self.analysis_semaphore:
            self.state.start_analysis(video_path_normalized)
            logger.info(f"Starting analysis for: {video_path.name}")
            
            # Create analyzer for this request
            analyzer: Optional[VideoAnalyzer] = None
            
            try:
                # Initialize analyzer with config
                analyzer = VideoAnalyzer(video_path_normalized, config)
                
                # Run analysis
                result = await self._run_analysis(websocket, analyzer, video_path, payload)
                
                if result.error:
                    logger.error(f"Analysis failed: {result.error}")
                    await self._send_error(
                        websocket,
                        MessageType.ANALYSIS_ERROR,
                        f"Analysis failed: {result.error}"
                    )
                else:
                    output_path = OutputManager.get_output_path(
                        video_path_normalized,
                        config.output_dir
                    )
                    OutputManager.save_result(result, output_path)
                    logger.info(f"Analysis complete. Results at: {output_path}")
                    await self._send_message(
                        websocket,
                        MessageType.ANALYSIS_RESULT,
                        result.to_dict()
                    )
                    success = True
            
            except Exception as e:
                logger.exception(f"Unhandled exception during analysis: {e}")
                await self._send_error(
                    websocket,
                    MessageType.ANALYSIS_ERROR,
                    f"Internal error: {str(e)}"
                )
            
            finally:
                # Clean up
                self.state.finish_analysis(video_path_normalized, success)
                if analyzer:
                    analyzer.progress_callback = None
                    # Explicitly delete to free memory
                    del analyzer
    async def _run_analysis(
        self,
        websocket: WebSocketServerProtocol,
        analyzer: VideoAnalyzer,
        video_path: Path,
        payload: JsonDict
    ) -> VideoAnalysisResult:
        """Execute video analysis with progress updates."""
        settings = payload.get("settings")
        settings_dict = settings if isinstance(settings, dict) else {}
        config = self._build_analysis_config(settings_dict)
        
        analyzer.config = config
        analyzer.video_path = str(video_path)
        analyzer.video_base_name = video_path.stem
        
        def progress_callback(progress: float, elapsed: float, frames_analyzed: float, total_frames: float) -> None:
            """Thread-safe progress callback for analyzer."""
            async def send():
                await self._send_message(
                    websocket,
                    MessageType.ANALYSIS_PROGRESS,
                    {
                        "progress": progress,
                        "frames_analyzed": frames_analyzed,
                        "elapsed": elapsed,
                        "total_frames": total_frames
                    },
                )

            try:
                loop = asyncio.get_running_loop()
                loop.create_task(send())
            except RuntimeError:
                asyncio.run(send())
        analyzer.progress_callback = progress_callback
        
        # Run analysis in executor to avoid blocking
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, analyzer.analyze)
        
        return result
    
    def _build_analysis_config(self, settings: Dict[str, Union[str, int, float, bool]]) -> AnalysisConfig:
        """Build analysis configuration from settings."""
        config = AnalysisConfig()
        for key, value in settings.items():
            if hasattr(config, key):
                setattr(config, key, value)
        return config
    
    async def _handle_transcribe(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle transcription request with live progress."""
        video_path = payload.get("video_path")
        json_file_path = payload.get("json_file_path")
        
        if not isinstance(video_path, str) or not isinstance(json_file_path, str):
            await self._send_error(
                websocket,
                MessageType.TRANSCRIPTION_ERROR,
                "Missing or invalid 'video_path' or 'json_file_path' in payload"
            )
            return
        
        video_path_normalized = str(Path(video_path).resolve())
        self.state.start_transcription(video_path_normalized)
        
        loop = asyncio.get_running_loop()
        
            
        def progress_callback(progress: int, elapsed: str) -> None:
            """Progress callback for transcription."""
            future = asyncio.run_coroutine_threadsafe(
                self._send_message(
                    websocket,
                    MessageType.TRANSCRIPTION_PROGRESS,
                    {
                        "progress": progress,
                        "elapsed": elapsed,
                    }
                ),
                loop
            )
            try:
                future.result(timeout=1.0)
            except Exception as e:
                logger.warning(f"Failed to send transcription progress: {e}")
        
        try:
            result = await loop.run_in_executor(
                None,
                lambda: self.transcription_service.transcribe(
                    video_path,
                    json_file_path,
                    progress_callback
                )
            )
            
            await self._send_message(
                websocket,
                MessageType.TRANSCRIPTION_COMPLETE,
                {
                    "json_file_path": json_file_path,
                    "language": result.language,
                }
            )
            logger.info(f"Transcription complete for {video_path}")
        
        except Exception as e:
            logger.exception("Transcription failed")
            await self._send_error(
                websocket,
                MessageType.TRANSCRIPTION_ERROR,
                f"Transcription failed: {str(e)}"
            )
        
        finally:
            self.state.finish_transcription(video_path_normalized)
    
    async def _handle_reindex_faces(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """
        Handle face reindexing request by calling the integrated function directly.
        Ensures only one reindexing operation runs at a time.
        """
        if self.reindex_lock.locked():
            logger.warning("Reindex request received while another reindex is active.")
            await self._send_error(
                websocket,
                MessageType.REINDEX_ERROR,
                "Face reindexing is already in progress. Please wait."
            )
            return

        async with self.reindex_lock:
            logger.info("Starting face reindexing..")
            
            faces_dir = payload.get("faces_directory", ".faces")
            known_faces_f = payload.get("known_faces_file", "known_faces.json")
            output_json_f = payload.get("output_json_path", "faces.json") 
            
            async def reindex_progress_callback(data: dict) -> None:
                await self._send_message(
                    websocket,
                    MessageType.REINDEX_PROGRESS,
                    {"elapsed": data["elapsed"],"progress": data["progress"]} 
                )

            try:
                success = await batch_add_faces_from_folder(
                    faces_directory=faces_dir,
                    known_faces_file=known_faces_f,
                    output_json_path=output_json_f,
                    progress_callback=reindex_progress_callback
                )
                
                if success:
                    logger.info("Face reindexing completed successfully (integrated).")
                    await self._send_message(
                        websocket,
                        MessageType.REINDEX_COMPLETE,
                        {"status": "done", "message": "Face reindexing completed successfully."}
                    )
                else:
                    logger.error("Face reindexing failed (integrated). Check logs for details.")
                    await self._send_error(
                        websocket,
                        MessageType.REINDEX_ERROR,
                        "Face reindexing failed. Check service logs."
                    )
            
            except Exception as e:
                logger.debug(e)
                logger.exception("Face reindexing exception (integrated)")
                await self._send_error(
                    websocket,
                    MessageType.REINDEX_ERROR,
                    f"Reindexing failed: {str(e)}"
                )
    

class AnalysisService:
    """Main service coordinator."""
    
    def __init__(self, max_concurrent_analyses: int = 3):
        self.state = ServiceState()
        self.handler = WebSocketHandler(self.state, max_concurrent_analyses)
        logger.info(f"Service initialized (max concurrent analyses: {max_concurrent_analyses})")
            
    async def start(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        socket_path: Optional[str] = None
    ) -> None:
        """Start the WebSocket server."""
        if socket_path:
            path = Path(socket_path)
            if path.exists():
                logger.warning(f"Removing stale socket file: {path}")
                path.unlink()
            
            logger.info(f"Starting service on Unix Domain Socket: {socket_path}")
            async with websockets.unix_serve(self.handler.handle_connection, socket_path):
                logger.info(f"Server listening on {socket_path}")
                await asyncio.Future()  # Run forever
        
        elif host and port:
            logger.info(f"Starting service on {host}:{port}")
            async with websockets.serve(self.handler.handle_connection, host, port):
                logger.info(f"Server listening on {host}:{port}")
                await asyncio.Future()  # Run forever
        
        else:
            raise ValueError("Either socket_path or (host and port) must be provided")


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Edit Mind Analysis Service - WebSocket-based video analysis"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--port",
        type=int,
        help="TCP port to listen on (binds to 127.0.0.1)"
    )
    group.add_argument(
        "--socket",
        type=str,
        help="Path to the Unix Domain Socket"
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=3,
        help="Maximum number of concurrent video analyses (default: 3)"
    )
    
    return parser.parse_args()


async def main() -> None:
    """Application entry point."""
    args = parse_arguments()
    
    service = AnalysisService(max_concurrent_analyses=args.max_concurrent)
    
    try:
        if args.socket:
            await service.start(socket_path=args.socket)
        else:
            await service.start(host="127.0.0.1", port=args.port)
    except Exception as e:
        logger.exception(f"Service failed to start: {e}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)