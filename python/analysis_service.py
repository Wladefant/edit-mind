import sys
import os
import json
import argparse
import asyncio
import logging
from pathlib import Path
from typing import Optional
import re
import websockets

sys.path.append(str(Path(__file__).parent.absolute()))

from analyze import VideoAnalyzer, AnalysisConfig, OutputManager, VideoAnalysisResult

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AnalysisService")

class ServiceState:
    def __init__(self):
        self.models_loaded = False
        self.status = "loading"
        self.current_video = None
        self.analyzer: Optional[VideoAnalyzer] = None
        self.lock = asyncio.Lock()

    def is_ready(self):
        return self.models_loaded and self.status == "ready"

    def is_busy(self):
        return self.status == "processing"

service_state = ServiceState()

async def load_models():
    """
    Asynchronously loads all ML models at service startup.
    """
    logger.info("Service starting up...")
    try:
        default_config = AnalysisConfig()
        logger.info(f"Using device: {default_config.device}")
        logger.info("Loading ML models and plugins...")
        
        loop = asyncio.get_running_loop()
        service_state.analyzer = await loop.run_in_executor(
            None, lambda: VideoAnalyzer(video_path="placeholder.mp4", config=default_config)
        )
        
        service_state.models_loaded = True
        service_state.status = "ready"
        logger.info("✓ Models loaded successfully. Service is ready.")
    except Exception as e:
        service_state.status = "error"
        logger.exception(f"✗ Critical error during model loading: {e}")


async def handler(websocket, path=None):
    """
    Handles incoming WebSocket connections and messages.
    """
    logger.info(f"Client connected from {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get("type")

                if message_type == "analyze":
                    await handle_analyze(websocket, data.get("payload", {}))
                elif message_type == "transcribe":
                    await handle_transcribe(websocket, data.get("payload", {}))
                elif message_type == "reindex_faces":
                    await handle_reindex_faces(websocket)
                elif message_type == "health":
                    await websocket.send(json.dumps({
                        "type": "status", 
                        "payload": {"status": "ready" if service_state.is_ready() else "loading"}
                    }))
                else:
                    await websocket.send(json.dumps({
                        "type": "error", 
                        "payload": {"message": f"Unknown message type: {message_type}"}
                    }))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error", 
                    "payload": {"message": "Invalid JSON received."}
                }))
            except Exception as e:
                logger.exception("Error processing message:")
                await websocket.send(json.dumps({
                    "type": "error", 
                    "payload": {"message": f"An error occurred: {str(e)}"}
                }))
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Client disconnected: {e}")
    except Exception as e:
        logger.exception("Unhandled exception in WebSocket handler:")


async def handle_analyze(websocket, payload):
    """
    Handles the 'analyze' message.
    """
    if not service_state.is_ready():
        await websocket.send(json.dumps({
            "type": "analysis_error", 
            "payload": {"message": "Service is not ready."}
        }))
        return

    if service_state.is_busy():
        await websocket.send(json.dumps({
            "type": "analysis_error", 
            "payload": {"message": f"Service is busy processing: {service_state.current_video}"}
        }))
        return

    video_path_str = payload.get("video_path")
    settings = payload.get("settings")

    if not video_path_str:
        await websocket.send(json.dumps({
            "type": "analysis_error", 
            "payload": {"message": "Missing 'video_path' in payload."}
        }))
        return

    video_path = Path(video_path_str)
    if not video_path.exists():
        await websocket.send(json.dumps({
            "type": "analysis_error", 
            "payload": {"message": f"Video file not found: {video_path}"}
        }))
        return

    async with service_state.lock:
        service_state.status = "processing"
        service_state.current_video = str(video_path)
        logger.info(f"Starting analysis for: {video_path}")

        try:
            # Configure the analyzer
            config = AnalysisConfig()
            if settings:
                for key, value in settings.items():
                    if hasattr(config, key):
                        setattr(config, key, value)
            
            service_state.analyzer.config = config
            service_state.analyzer.video_path = str(video_path)
            service_state.analyzer.video_base_name = video_path.stem

            # Get the event loop to schedule callbacks from the thread
            loop = asyncio.get_running_loop()
            
            # Define a SYNC progress callback that schedules async sends
            def progress_callback(plugin_name: str, progress: float, message: str):
                # Ensure progress is between 0 and 100
                progress = max(0.0, min(100.0, progress))
                
                # Schedule the websocket send in the event loop
                future = asyncio.run_coroutine_threadsafe(
                    websocket.send(json.dumps({
                        "type": "analysis_progress",
                        "payload": {
                            "plugin": plugin_name,
                            "progress": round(progress, 2),
                            "message": message
                        }
                    })),
                    loop
                )
                
                # Wait briefly to ensure message is sent
                try:
                    future.result(timeout=0.1)
                except Exception as e:
                    logger.warning(f"Failed to send progress update: {e}")

            service_state.analyzer.progress_callback = progress_callback

            # Run analysis in executor
            result: VideoAnalysisResult = await loop.run_in_executor(
                None, service_state.analyzer.analyze
            )

            # Send final result
            if result.error:
                logger.error(f"Analysis for {video_path} completed with an error: {result.error}")
                await websocket.send(json.dumps({
                    "type": "analysis_error", 
                    "payload": {"message": f"Analysis failed: {result.error}"}
                }))
            else:
                output_path = OutputManager.get_output_path(str(video_path), config.output_dir)
                OutputManager.save_result(result, output_path)
                logger.info(f"✓ Analysis complete for: {video_path}. Results at: {output_path}")
                await websocket.send(json.dumps({
                    "type": "analysis_result", 
                    "payload": result.to_dict()
                }))

        except Exception as e:
            logger.exception(f"Unhandled exception during analysis of {video_path}: {e}")
            await websocket.send(json.dumps({
                "type": "analysis_error", 
                "payload": {"message": f"An internal error occurred: {str(e)}"}
            }))
        
        finally:
            service_state.status = "ready"
            service_state.current_video = None
            if service_state.analyzer:
                service_state.analyzer.progress_callback = None
                
                
async def handle_transcribe(websocket, payload):
    """
    Handles the 'transcribe' message with improved progress reporting.
    """
    video_path = payload.get("video_path")
    json_file_path = payload.get("json_file_path")

    if not video_path or not json_file_path:
        await websocket.send(json.dumps({
            "type": "transcription_error", 
            "payload": {"message": "Missing 'video_path' or 'json_file_path' in payload."}
        }))
        return

    script_path = Path(__file__).parent / "transcribe.py"
    logger.info(f"Starting transcription: {video_path}")
    
    process = await asyncio.create_subprocess_exec(
        sys.executable, str(script_path), video_path, json_file_path,
        stdout=asyncio.subprocess.PIPE, 
        stderr=asyncio.subprocess.PIPE,
        env={**os.environ, "PYTHONUNBUFFERED": "1", "TQDM_DISABLE": "false", "FORCE_TQDM": "1"}
    )

    async def stream_stderr():
        """Stream Whisper transcription progress (numeric + elapsed time) from stderr."""
        last_progress = -1
        last_sent_time = 0

        # Improved regex patterns for better matching
        progress_pattern = re.compile(r"(\d+)%")  # captures progress like '42%'
        elapsed_pattern = re.compile(r"\[(\d+):(\d+)<")  # captures time from tqdm like '[01:23<'
        # Alternative pattern for different tqdm formats
        alt_elapsed_pattern = re.compile(r"(\d+):(\d+)<")  # without brackets

        while True:
            line = await process.stderr.readline()
            if not line:
                break

            line_str = line.decode(errors="ignore").strip()
            if not line_str:
                continue

            # Extract numeric progress
            progress_match = progress_pattern.search(line_str)
            
            if progress_match:
                progress = int(progress_match.group(1))
                elapsed_time = None

                # Try to extract elapsed time
                elapsed_match = elapsed_pattern.search(line_str) or alt_elapsed_pattern.search(line_str)
                if elapsed_match:
                    minutes = int(elapsed_match.group(1))
                    seconds = int(elapsed_match.group(2))
                    elapsed_time = f"{minutes:02d}:{seconds:02d}:00"

                # Only send if progress changed or 2+ seconds elapsed
                import time
                current_time = time.time()
                
                if progress != last_progress or (current_time - last_sent_time >= 2):
                    last_progress = progress
                    last_sent_time = current_time
                    
                    logger.info(f"Transcribe progress: {progress}% | Elapsed: {elapsed_time or 'N/A'}")

                    await websocket.send(json.dumps({
                        "type": "transcription_progress",
                        "payload": {
                            "progress": progress,
                            "elapsed_time": elapsed_time or "00:00:00"
                        }
                    }))
            else:
                # Non-progress lines (like "Detected language: English")
                if line_str and not line_str.startswith('\r'):
                    logger.info(f"Transcribe info: {line_str}")
                    await websocket.send(json.dumps({
                        "type": "transcription_message",
                        "payload": {"message": line_str}
                    }))

    async def stream_stdout():
        """Stream stdout messages."""
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_str = line.decode(errors="ignore").strip()
            if line_str:
                logger.info(f"Transcribe output: {line_str}")
                await websocket.send(json.dumps({
                    "type": "transcription_message",
                    "payload": {"message": line_str}
                }))

    # Stream both stdout and stderr concurrently
    await asyncio.gather(stream_stdout(), stream_stderr())
    
    # Wait for process to complete
    await process.wait()
    
    if process.returncode == 0:
        logger.info(f"✓ Transcription complete: {json_file_path}")
        await websocket.send(json.dumps({
            "type": "transcription_complete", 
            "payload": {"json_file_path": json_file_path}
        }))
    else:
        error_msg = f"Transcription failed with code {process.returncode}"
        logger.error(error_msg)
        await websocket.send(json.dumps({
            "type": "transcription_error", 
            "payload": {"error": error_msg}
        }))


async def handle_reindex_faces(websocket):
    """
    Handles the 'reindex_faces' message.
    """
    script_path = Path(__file__).parent / "batch_add_faces.py"
    logger.info("Starting face reindexing...")
    
    process = await asyncio.create_subprocess_exec(
        sys.executable, str(script_path),
        stdout=asyncio.subprocess.PIPE, 
        stderr=asyncio.subprocess.PIPE
    )

    await stream_subprocess_output(websocket, process, "reindex")


async def stream_subprocess_output(websocket, process, process_name):
    """
    Streams the stdout and stderr of a subprocess to the client.
    """
    async def stream_stdout():
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_str = line.decode(errors="ignore").strip()
            if line_str:
                logger.info(f"{process_name} output: {line_str}")
                await websocket.send(json.dumps({
                    "type": f"{process_name}_progress", 
                    "payload": {"output": line_str}
                }))

    async def stream_stderr():
        while True:
            line = await process.stderr.readline()
            if not line:
                break
            line_str = line.decode(errors="ignore").strip()
            if line_str:
                logger.warning(f"{process_name} error: {line_str}")
                await websocket.send(json.dumps({
                    "type": f"{process_name}_error", 
                    "payload": {"error": line_str}
                }))

    await asyncio.gather(stream_stdout(), stream_stderr())

    await process.wait()
    
    if process.returncode == 0:
        logger.info(f"✓ {process_name} completed successfully")
        await websocket.send(json.dumps({
            "type": f"{process_name}_complete", 
            "payload": {"status": "done"}
        }))
    else:
        logger.error(f"✗ {process_name} failed with code {process.returncode}")
        await websocket.send(json.dumps({
            "type": f"{process_name}_error", 
            "payload": {"error": f"Process failed with code {process.returncode}"}
        }))


 
async def main():
    """
    Parses command-line arguments and starts the WebSocket server.
    """
    parser = argparse.ArgumentParser(description="Edit Mind Analysis Service")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--port", type=int, help="TCP port to listen on.")
    group.add_argument("--socket", type=str, help="Path to the Unix Domain Socket.")
    
    args = parser.parse_args()

    # Load models before starting the server
    await load_models()

    if args.socket:
        socket_path = Path(args.socket)
        if socket_path.exists():
            logger.warning(f"Stale socket file found at {socket_path}. Removing it.")
            socket_path.unlink()
        
        logger.info(f"Starting service on Unix Domain Socket: {args.socket}")
        start_server = websockets.unix_serve(handler, args.socket)
    else:  # port
        logger.info(f"Starting service on 127.0.0.1:{args.port}")
        start_server = websockets.serve(handler, "127.0.0.1", args.port)

    async with start_server:
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())