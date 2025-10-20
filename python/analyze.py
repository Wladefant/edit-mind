import sys
import os
import json
import importlib
import inspect
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Any, Iterator
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import cv2
import numpy as np
from tqdm import tqdm
import gc
import warnings
import logging

warnings.filterwarnings('ignore', category=FutureWarning, module='ultralytics')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    logger.warning("psutil not installed. Memory tracking disabled.")

from plugins.base import AnalyzerPlugin


# ============================================================================ 
# Configuration - OPTIMIZED FOR M1 MAX + ZERO DISK I/O
# ============================================================================ 

@dataclass
class AnalysisConfig:
    """Configuration for video analysis - Optimized for M1 Max with in-memory processing"""
    sample_interval_seconds: float = 2.0
    max_workers: int = 4  # Reduced for M1 - works better with fewer workers
    batch_size: int = 16  # Not used in streaming mode
    yolo_confidence: float = 0.35
    yolo_iou: float = 0.45
    resize_to_720p: bool = True
    known_faces_file: str = 'known_faces.json'
    yolo_model: str = 'yolov8n.pt'  # Nano model for speed
    output_dir: str = 'analysis_results'
    unknown_faces_dir: str = 'unknown_faces'
    enable_streaming: bool = True  # ALWAYS true
    enable_performance_report: bool = True
    enable_aggressive_gc: bool = True  # Force garbage collection after each batch
    frame_buffer_limit: int = 8  # Maximum frames in memory at once
    plugin_timeout_seconds: int = 60  # Timeout for plugin processing
    batch_timeout_seconds: int = 300  # Maximum time for batch processing
    memory_cleanup_interval: int = 50  # Force cleanup every N frames

    def __post_init__(self):
        settings_path = Path(__file__).parent.parent / 'settings.json'
        if settings_path.exists():
            try:
                with open(settings_path, 'r') as f:
                    settings = json.load(f)
                    for key, value in settings.items():
                        if hasattr(self, key):
                            setattr(self, key, value)
            except Exception as e:
                logger.warning(f"Failed to load settings.json: {e}")
        
        # Force streaming mode on M1
        self.enable_streaming = True
        
        # Auto-adjust workers based on available memory
        if HAS_PSUTIL:
            available_gb = psutil.virtual_memory().available / (1024**3)
            if available_gb < 8:
                self.max_workers = 2
                self.frame_buffer_limit = 4
                logger.warning(f"Low memory detected ({available_gb:.1f}GB). Reducing workers to {self.max_workers}")

    @property
    def device(self) -> str:
        """Get optimal device for M1 Max"""
        try:
            import torch
            # M1 uses MPS (Metal Performance Shaders)
            if torch.backends.mps.is_available():
                return 'mps'
            elif torch.cuda.is_available():
                return 'cuda'
        except ImportError:
            pass
        return 'cpu'


# ============================================================================ 
# Memory Monitor - ENHANCED
# ============================================================================ 

class MemoryMonitor:
    """Monitor and manage memory usage with aggressive cleanup"""
    
    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory = 0
        self.cleanup_count = 0
        
    def get_memory_mb(self) -> float:
        """Get current memory usage in MB"""
        if self.process:
            mem = self.process.memory_info().rss / 1024 / 1024
            self.peak_memory = max(self.peak_memory, mem)
            return mem
        return 0.0
    
    def force_cleanup(self):
        """
        CRITICAL: Aggressive memory cleanup after each batch.
        This is the key to preventing memory buildup.
        """
        if self.config.enable_aggressive_gc:
            # Force Python garbage collection multiple times
            collected = gc.collect()
            gc.collect()
            gc.collect()
            
            self.cleanup_count += 1
            
            # M1-specific: Clear MPS cache if using PyTorch
            try:
                import torch
                if torch.backends.mps.is_available():
                    torch.mps.empty_cache()
            except:
                pass
            
            # Log cleanup every 10 times
            if self.cleanup_count % 10 == 0:
                current_mem = self.get_memory_mb()
                logger.debug(f"Memory cleanup #{self.cleanup_count}: {current_mem:.0f}MB (peak: {self.peak_memory:.0f}MB)")
    
    def check_memory_warning(self) -> bool:
        """Check if memory usage is critical"""
        if not self.process:
            return False
        
        available = psutil.virtual_memory().available / (1024**3)
        if available < 2:  # Less than 2GB available
            logger.warning(f"⚠ MEMORY WARNING: Only {available:.1f}GB available!")
            return True
        return False
    
    def get_memory_stats(self) -> Dict[str, float]:
        """Get detailed memory statistics"""
        if not self.process:
            return {}
        
        mem_info = self.process.memory_info()
        vm = psutil.virtual_memory()
        
        return {
            'current_mb': mem_info.rss / 1024 / 1024,
            'peak_mb': self.peak_memory,
            'available_mb': vm.available / 1024 / 1024,
            'percent_used': vm.percent
        }


# ============================================================================ 
# Data Models
# ============================================================================ 

@dataclass
class PerformanceMetrics:
    """Track performance metrics for each stage"""
    stage: str
    duration_seconds: float
    frames_processed: int = 0
    fps: float = 0.0
    memory_mb: Optional[float] = None
    peak_memory_mb: Optional[float] = None


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result"""
    video_file: str
    scene_analysis: Dict
    detected_activities: List[Dict]
    face_recognition_summary: Dict
    frame_analysis: List[Dict]
    summary: Dict
    performance_metrics: Optional[List[Dict]] = None
    error: Optional[str] = None

    def to_dict(self):
        # Convert dataclass to a dictionary
        data_dict = asdict(self)
        
        # Recursively convert NumPy types to Python native types
        def convert_numpy_types(obj):
            if isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(elem) for elem in obj]
            elif isinstance(obj, (np.bool_, np.int_, np.float_)):
                return obj.item()
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            else:
                return obj
        
        return convert_numpy_types(data_dict)


# ============================================================================ 
# Performance Tracking
# ============================================================================ 

class StageTracker:
    """Context manager for tracking stage performance"""
    
    def __init__(self, analyzer: 'VideoAnalyzer', stage_name: str):
        self.analyzer = analyzer
        self.stage_name = stage_name
        self.start_time = None
        self.start_memory = None
        self.frames_processed = 0
        self.memory_monitor = analyzer.memory_monitor
    
    def __enter__(self):
        self.start_time = time.time()
        self.start_memory = self.memory_monitor.get_memory_mb()
        logger.info(f"Starting stage: {self.stage_name}")
        return self
    
    def __exit__(self, *args):
        duration = time.time() - self.start_time
        end_memory = self.memory_monitor.get_memory_mb()
        memory_delta = end_memory - self.start_memory if self.start_memory else None
        
        fps = self.frames_processed / duration if duration > 0 and self.frames_processed > 0 else 0.0
        
        metric = PerformanceMetrics(
            stage=self.stage_name,
            duration_seconds=duration,
            frames_processed=self.frames_processed,
            fps=fps,
            memory_mb=memory_delta,
            peak_memory_mb=self.memory_monitor.peak_memory
        )
        
        self.analyzer.metrics.append(metric)
        
        # Real-time progress update
        if self.frames_processed > 0:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s ({fps:.1f} fps) | Mem: {end_memory:.0f}MB")
        else:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s | Mem: {end_memory:.0f}MB")


# ============================================================================ 
# Frame Processor - ZERO DISK I/O
# ============================================================================ 

class FrameProcessor:
    """Handles frame extraction and preprocessing - ALL IN MEMORY"""

    def __init__(self, config: AnalysisConfig):
        self.config = config

    def extract_frames_streaming_generator(self, video_path: str) -> Iterator[Tuple[Dict, float, int]]:
        """
        OPTIMIZED: Zero-disk-IO streaming generator.
        Yields frames directly in memory as NumPy arrays.
        No cv2.imwrite() calls - everything stays in RAM.
        """
        cap = cv2.VideoCapture(video_path)
        
        try:
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps is None or fps <= 0:
                logger.warning("Invalid FPS detected, defaulting to 30")
                fps = 30.0
            
            total_frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames_count <= 0:
                logger.error("Could not determine total frame count")
                raise ValueError("Invalid video file: cannot determine frame count")
            
            sample_interval = max(1, int(fps * self.config.sample_interval_seconds))
            
            logger.info(f"Video info: {total_frames_count} frames @ {fps:.2f} fps")
            logger.info(f"Sampling every {sample_interval} frames ({self.config.sample_interval_seconds}s)")
            logger.info(f"✓ IN-MEMORY MODE: Zero disk I/O")
            
            for current_frame_idx in range(0, total_frames_count, sample_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
                ret, frame = cap.read()

                if not ret:
                    logger.warning(f"Failed to read frame at index {current_frame_idx}")
                    break

                # Preprocess frame (creates new array, original can be GC'd)
                processed_frame = self._preprocess_frame(frame)

                timestamp_ms = round((current_frame_idx / fps) * 1000)
                next_frame_idx = min(current_frame_idx + sample_interval, total_frames_count)
                end_timestamp_ms = round((next_frame_idx / fps) * 1000)

                frame_data = {
                    'frame': processed_frame,  # NumPy array in memory
                    'timestamp_ms': timestamp_ms,
                    'end_timestamp_ms': end_timestamp_ms,
                    'frame_idx': current_frame_idx
                }
                
                yield frame_data, fps, total_frames_count
                
                # CRITICAL: Immediately delete original frame
                del frame
                # Note: processed_frame stays alive in frame_data until batch cleanup
        
        except Exception as e:
            logger.error(f"Error in frame extraction: {e}")
            raise
        
        finally:
            # CRITICAL: Always release the video capture
            if cap is not None:
                cap.release()
                logger.debug("Video capture released")

    def _preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Resize frame for optimal processing speed.
        Returns a NEW array, allowing original to be garbage collected.
        """
        if frame is None:
            raise ValueError("Received None frame")
        
        if self.config.resize_to_720p and frame.shape[0] > 720:
            h, w = frame.shape[:2]
            target_h = 720
            target_w = int(w * (target_h / h))
            # cv2.resize creates a NEW array - original 'frame' can be deleted
            return cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        
        # Return a copy to ensure memory safety
        return frame.copy()


# ============================================================================ 
# Plugin Loader
# ============================================================================ 

def load_plugins(config: AnalysisConfig) -> List[AnalyzerPlugin]:
    plugins = []
    plugin_dir = Path(__file__).parent / "plugins"
    config_dict = asdict(config)
    config_dict['device'] = config.device

    logger.info(f"Loading plugins from {plugin_dir}...")
    logger.info(f"Using device: {config.device}")

    # Optimized plugin loading order
    enabled_plugins = [
        "ObjectDetectionPlugin",    # Run first
        "FaceRecognitionPlugin",     # Run second
        "ShotTypePlugin",            # Depends on faces
        "EnvironmentPlugin",         # Depends on objects
        "DominantColorPlugin",
        "TextDetectionPlugin",
        # "EmotionDetectionPlugin", 
        # "ActivityPlugin",
    ]

    for f in plugin_dir.glob("*.py"):
        if f.name.startswith("__") or f.name == "base.py":
            continue
        module_name = f"plugins.{f.stem}"
        try:
            module = importlib.import_module(module_name)
            for name, cls in inspect.getmembers(module, inspect.isclass):
                if issubclass(cls, AnalyzerPlugin) and cls is not AnalyzerPlugin:
                    if name in enabled_plugins:
                        plugin_instance = cls(config_dict)
                        plugins.append(plugin_instance)
                        logger.info(f"  ✓ Loaded: {name}")
                    else:
                        logger.debug(f"  - Skipped: {name}")
        except Exception as e:
            logger.error(f"  ✗ Error loading plugin {module_name}: {e}")
    
    logger.info(f"Total plugins loaded: {len(plugins)}\n")
    return plugins


# ============================================================================ 
# Video Analyzer (Main Class) - ZERO DISK I/O + AGGRESSIVE CLEANUP
# ============================================================================ 

class VideoAnalyzer:
    """Main video analysis coordinator - Optimized for M1 Max with in-memory processing"""

    def __init__(self, video_path: str, config: Optional[AnalysisConfig] = None):
        self.video_path = video_path
        self.config = config or AnalysisConfig()
        self.video_base_name = Path(self.video_path).stem
        self.metrics: List[PerformanceMetrics] = []
        self.frame_processor = FrameProcessor(self.config)
        self.memory_monitor = MemoryMonitor(self.config)
        self.progress_callback = None
        
        # Create output directory
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Load plugins
        self.plugins = load_plugins(self.config)
        
        # Track progress
        self.frames_analyzed = 0

    def _track_stage(self, stage_name: str) -> StageTracker:
        """Create a context manager for tracking stage performance"""
        return StageTracker(self, stage_name)

    def analyze(self) -> VideoAnalysisResult:
        """Perform complete video analysis with memory optimization"""
        start_video_analysis_time = time.time()
        logger.info(f"\n{'='*70}")
        logger.info(f"Starting analysis: {Path(self.video_path).name}")
        logger.info(f"Mode: IN-MEMORY (Zero Disk I/O)")
        logger.info(f"Platform: M1 Max Optimized")
        logger.info(f"{'='*70}\n")

        try:
            # Validate video file
            if not Path(self.video_path).exists():
                raise FileNotFoundError(f"Video file not found: {self.video_path}")
            
            # Setup plugins
            with self._track_stage("plugin_setup") as stage:
                for plugin in self.plugins:
                    try:
                        plugin.setup()
                    except Exception as e:
                        logger.error(f"Failed to setup plugin {plugin.__class__.__name__}: {e}")

            # Always use streaming with in-memory processing
            frame_analyses = self._analyze_streaming_optimized()

            # Post-processing
            with self._track_stage("post_processing"):
                scene_analysis, detected_activities, face_summary = self._run_post_processing(frame_analyses)

            total_video_analysis_time = time.time() - start_video_analysis_time

            # Print performance report
            if self.config.enable_performance_report:
                self._print_performance_report(total_video_analysis_time)

            return VideoAnalysisResult(
                video_file=self.video_path,
                scene_analysis=scene_analysis,
                detected_activities=detected_activities,
                face_recognition_summary=face_summary,
                frame_analysis=frame_analyses,
                summary={
                    "total_frames_analyzed": len(frame_analyses),
                    "primary_activity": detected_activities[0]['activity'] if detected_activities else "unknown",
                    "confidence": detected_activities[0]['confidence'] if detected_activities else 0.0,
                    "total_analysis_time_seconds": total_video_analysis_time,
                    "peak_memory_mb": self.memory_monitor.peak_memory,
                    "memory_cleanups": self.memory_monitor.cleanup_count
                },
                performance_metrics=[asdict(m) for m in self.metrics]
            )

        except Exception as e:
            total_video_analysis_time = time.time() - start_video_analysis_time
            logger.error(f"\n{'='*70}")
            logger.error(f"✗ FAILED Analysis for {Path(self.video_path).name}")
            logger.error(f"  Error: {str(e)}")
            logger.error(f"  Time elapsed: {total_video_analysis_time:.2f}s")
            logger.error(f"{'='*70}\n")
            
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            return self._create_error_result(str(e))

    def _analyze_streaming_optimized(self) -> List[Dict]:
        """
        CRITICAL OPTIMIZATION: Process frames in micro-batches with AGGRESSIVE cleanup.
        After each batch is processed, ALL frames are deleted from memory before continuing.
        This prevents memory buildup over long videos.
        """
        frame_analyses = []
        batch = []
        
        # Get total frame count for progress bar
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = int(fps * self.config.sample_interval_seconds)
        total_sampled = (total_frames // sample_interval) + 1
        cap.release()
        
        logger.info(f"Expected to process ~{total_sampled} frames (IN-MEMORY)")
        logger.info(f"Frame buffer limit: {self.config.frame_buffer_limit} frames")
        logger.info(f"Memory cleanup after each batch\n")
        
        with self._track_stage("streaming_analysis") as stage:
            with tqdm(total=total_sampled, desc="  Processing", unit="frame", file=sys.stderr) as pbar:
                try:
                    frame_generator = self.frame_processor.extract_frames_streaming_generator(self.video_path)
                    
                    for frame_idx, (frame_data, fps, total_frames) in enumerate(frame_generator):
                        batch.append(frame_data)
                        
                        # Process micro-batch when buffer limit is reached
                        if len(batch) >= self.config.frame_buffer_limit:
                            batch_results = self._process_and_cleanup_batch(batch, frame_idx, pbar)
                            frame_analyses.extend(batch_results)
                            
                            # CRITICAL: Clear batch list and force cleanup
                            batch.clear()
                            
                            # Check memory status
                            if self.memory_monitor.check_memory_warning():
                                logger.warning("Memory pressure detected, pausing briefly...")
                                time.sleep(0.5)
                        
                        # Periodic deep cleanup
                        if frame_idx > 0 and frame_idx % self.config.memory_cleanup_interval == 0:
                            self.memory_monitor.force_cleanup()
                            mem_stats = self.memory_monitor.get_memory_stats()
                            logger.info(f"Checkpoint: {self.frames_analyzed} frames | "
                                      f"Mem: {mem_stats.get('current_mb', 0):.0f}MB / "
                                      f"Peak: {mem_stats.get('peak_mb', 0):.0f}MB")
                    
                    # Process remaining frames
                    if batch:
                        batch_results = self._process_and_cleanup_batch(batch, frame_idx, pbar, is_final=True)
                        frame_analyses.extend(batch_results)
                        batch.clear()
                
                except Exception as e:
                    logger.error(f"Fatal error in streaming analysis: {e}")
                    raise
            
            stage.frames_processed = len(frame_analyses)
        
        # Final aggressive cleanup
        self.memory_monitor.force_cleanup()
        mem_stats = self.memory_monitor.get_memory_stats()
        logger.info(f"\n✓ Analysis complete: {len(frame_analyses)} frames")
        logger.info(f"  Peak memory: {mem_stats.get('peak_mb', 0):.0f}MB")
        logger.info(f"  Total cleanups: {self.memory_monitor.cleanup_count}")
        
        return frame_analyses

    def _process_and_cleanup_batch(self, batch: List[Dict], frame_idx: int, pbar, is_final: bool = False) -> List[Dict]:
        """
        CRITICAL METHOD: Process a batch and immediately clean up ALL frames from memory.
        This is called after every micro-batch to prevent memory accumulation.
        
        Steps:
        1. Process batch through all plugins
        2. Collect results
        3. DELETE all frame arrays from memory
        4. Force garbage collection
        5. Return results (without frames)
        """
        batch_results = []
        
        try:
            # Step 1: Process the batch
            batch_results = self._process_micro_batch(batch)
            
            # Step 2: Update progress
            pbar.update(len(batch_results))
            self.frames_analyzed += len(batch_results)
            if self.progress_callback:
                self.progress_callback("frame_analysis", self.frames_analyzed / pbar.total, f"Processed {self.frames_analyzed} of {pbar.total} frames.")

        except Exception as e:
            logger.error(f"Error processing batch at frame {frame_idx}: {e}")
            # Continue despite error
        
        finally:
            # Step 3: CRITICAL - Delete all frames from memory
            self._cleanup_batch_frames(batch)
            
            # Step 4: Force garbage collection after each batch
            self.memory_monitor.force_cleanup()
            
            if is_final:
                logger.debug(f"Final batch processed and cleaned up")
        
        return batch_results

    def _cleanup_batch_frames(self, batch: List[Dict]) -> None:
        """
        CRITICAL: Aggressively delete frame arrays from memory.
        This is called after EVERY batch is processed.
        
        Without this, frames accumulate in memory and cause OOM errors.
        """
        frames_deleted = 0
        
        for frame_data in batch:
            if 'frame' in frame_data:
                # Delete the NumPy array reference
                del frame_data['frame']
                frames_deleted += 1
        
        # Additional cleanup: Remove the 'frame' key entirely
        for frame_data in batch:
            frame_data.pop('frame', None)
        
        logger.debug(f"Cleaned up {frames_deleted} frames from memory")

    def _process_micro_batch(self, batch: List[Dict]) -> List[Dict]:
        """
        Process a micro-batch of frames through all plugins.
        Frames are passed as NumPy arrays (in-memory), never written to disk.
        """
        results = [
            {
                'start_time_ms': b['timestamp_ms'],
                'end_time_ms': b['end_timestamp_ms'],
                'duration_ms': b['end_timestamp_ms'] - b['timestamp_ms']
            }
            for b in batch
        ]
        
        # Process plugins sequentially to reduce memory pressure
        for plugin in self.plugins:
            plugin_name = plugin.__class__.__name__
            executor = None
            
            try:
                # Use limited parallelism
                executor = ThreadPoolExecutor(max_workers=min(self.config.max_workers, len(batch)))
                
                futures = [
                    executor.submit(
                        self._safe_plugin_call, 
                        plugin, 
                        batch[i]['frame'],  # Pass NumPy array directly (in-memory)
                        results[i].copy()
                    )
                    for i in range(len(batch))
                ]
                
                for i, future in enumerate(futures):
                    try:
                        plugin_result = future.result(timeout=self.config.plugin_timeout_seconds)
                        if plugin_result and isinstance(plugin_result, dict):
                            results[i].update(plugin_result)
                    except TimeoutError:
                        logger.warning(f"Timeout: Frame {i} in {plugin_name} took too long")
                    except Exception as e:
                        logger.warning(f"Frame {i} failed in {plugin_name}: {e}")
                
                if self.progress_callback:
                    self.progress_callback(plugin_name, 1, f"{plugin_name} processing complete.")

            except Exception as e:
                logger.error(f"Error in {plugin_name} batch processing: {e}")
            
            finally:
                # CRITICAL: Force executor shutdown
                if executor is not None:
                    try:
                        # Python 3.9+
                        executor.shutdown(wait=False, cancel_futures=True)
                    except TypeError:
                        # Python < 3.9
                        executor.shutdown(wait=False)
        
        return results

    def _safe_plugin_call(self, plugin: AnalyzerPlugin, frame: np.ndarray, frame_analysis: Dict) -> Dict:
        """Safely call plugin with error handling"""
        try:
            return plugin.analyze_frame(frame, frame_analysis, self.video_path)
        except Exception as e:
            logger.warning(f"Error in {plugin.__class__.__name__}: {e}")
            return frame_analysis

    def _run_post_processing(self, frame_analyses: List[Dict]) -> Tuple[Dict, List[Dict], Dict]:
        """Run post-processing plugins that analyze the whole scene."""
        scene_analysis = {}
        detected_activities = []
        face_summary = {}

        logger.info("Running post-processing...")

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_scene'):
                try:
                    plugin.analyze_scene(frame_analyses)
                    results = plugin.get_results()
                    if results:
                        scene_analysis.update(asdict(results) if hasattr(results, '__dataclass_fields__') else results)
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.analyze_scene: {e}")

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_activities'):
                try:
                    activities = plugin.analyze_activities(frame_analyses, scene_analysis)
                    if activities:
                        detected_activities = [asdict(a) if hasattr(a, '__dataclass_fields__') else a for a in activities]
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.analyze_activities: {e}")

        for plugin in self.plugins:
            if hasattr(plugin, 'get_summary'):
                try:
                    summary = plugin.get_summary()
                    if summary and "known_people_identified" in summary:
                        face_summary = summary
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.get_summary: {e}")

        return scene_analysis, detected_activities, face_summary

    def _print_performance_report(self, total_time: float):
        """Print detailed performance breakdown"""
        logger.info(f"\n{'='*70}")
        logger.info("PERFORMANCE REPORT (M1 OPTIMIZED - ZERO DISK I/O)")
        logger.info(f"{'='*70}")
        
        for metric in self.metrics:
            logger.info(f"\n{metric.stage.upper()}")
            logger.info(f"  Duration: {metric.duration_seconds:.2f}s")
            
            if metric.frames_processed > 0:
                logger.info(f"  Frames: {metric.frames_processed}")
                logger.info(f"  FPS: {metric.fps:.2f}")
            
            if metric.memory_mb is not None:
                logger.info(f"  Memory Δ: {metric.memory_mb:+.1f} MB")
            
            if metric.peak_memory_mb is not None:
                logger.info(f"  Peak Memory: {metric.peak_memory_mb:.0f} MB")
        
        logger.info(f"\n{'─'*70}")
        logger.info(f"TOTAL TIME: {total_time:.2f}s")
        logger.info(f"PEAK MEMORY: {self.memory_monitor.peak_memory:.0f} MB")
        logger.info(f"MEMORY CLEANUPS: {self.memory_monitor.cleanup_count}")
        
        # Calculate efficiency metrics
        total_frames = sum(m.frames_processed for m in self.metrics if m.frames_processed > 0)
        if total_frames > 0:
            overall_fps = total_frames / total_time
            logger.info(f"OVERALL FPS: {overall_fps:.2f}")
        
        # Memory efficiency
        mem_stats = self.memory_monitor.get_memory_stats()
        if mem_stats:
            logger.info(f"FINAL MEMORY: {mem_stats.get('current_mb', 0):.0f} MB")
            logger.info(f"AVAILABLE: {mem_stats.get('available_mb', 0):.0f} MB")
            logger.info(f"{'='*70}\n")

    def _create_error_result(self, error: str) -> VideoAnalysisResult:
        """Create error result object"""
        return VideoAnalysisResult(
            video_file=self.video_path,
            scene_analysis={},
            detected_activities=[],
            face_recognition_summary={},
            frame_analysis=[],
            summary={
                "error": error, 
                "peak_memory_mb": self.memory_monitor.peak_memory,
                "memory_cleanups": self.memory_monitor.cleanup_count
            },
            performance_metrics=[asdict(m) for m in self.metrics],
            error=error
        )


# ============================================================================ 
# Output Manager
# ============================================================================ 

class OutputManager:
    """Manages output file creation and writing"""
    
    @staticmethod
    def get_output_path(video_path: str, output_dir: str) -> Path:
        """Generate output JSON path for a video file"""
        video_name = Path(video_path).stem
        output_path = Path(output_dir) / f"{video_name}_analysis.json"
        return output_path
    
    @staticmethod
    def save_result(result: VideoAnalysisResult, output_path: Path) -> bool:
        """Save analysis result to JSON file"""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.info(f"\n✓ Results saved to: {output_path}")
            
            # Print file size
            file_size = output_path.stat().st_size
            if file_size < 1024:
                size_str = f"{file_size} B"
            elif file_size < 1024 * 1024:
                size_str = f"{file_size / 1024:.1f} KB"
            else:
                size_str = f"{file_size / (1024 * 1024):.1f} MB"
            
            logger.info(f"  File size: {size_str}")
            return True
            
        except Exception as e:
            logger.error(f"\n✗ Failed to save results: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def print_success_message(output_path: Path):
        """Print success message with output path"""
        print(str(output_path.absolute()))


# ============================================================================ 
# CLI Interface
# ============================================================================ 

def main():
    """Main entry point for CLI"""
    if len(sys.argv) < 2:
        print("Usage:", file=sys.stderr)
        print("  python analyze.py <video_file> [options]", file=sys.stderr)
        print("\nOptions:", file=sys.stderr)
        print("  --output <path>     Custom output file path", file=sys.stderr)
        print("  --workers <n>       Number of worker threads (default: 4 for M1)", file=sys.stderr)
        print("  --buffer <n>        Frame buffer limit (default: 8)", file=sys.stderr)
        print("  --interval <n>      Sample interval in seconds (default: 2.0)", file=sys.stderr)
        print("  --cleanup <n>       Force cleanup every N frames (default: 50)", file=sys.stderr)
        print("  --no-resize         Disable 720p resize", file=sys.stderr)
        print("  --no-report         Disable performance report", file=sys.stderr)
        print("  --no-aggressive-gc  Disable aggressive garbage collection", file=sys.stderr)
        print("  --debug             Enable debug logging", file=sys.stderr)
        print("\nOptimizations:", file=sys.stderr)
        print("  ✓ Zero disk I/O - all frames processed in memory", file=sys.stderr)
        print("  ✓ Aggressive memory cleanup after each batch", file=sys.stderr)
        print("  ✓ M1 Max optimized with MPS acceleration", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print("  python analyze.py video.mp4", file=sys.stderr)
        print("  python analyze.py video.mp4 --workers 2 --buffer 4", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    
    # Validate video file exists
    if not Path(video_path).exists():
        logger.error(f"Video file not found: {video_path}")
        sys.exit(1)
    
    config = AnalysisConfig()
    output_path = None
    
    # Parse command-line flags
    i = 2
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--output' and i + 1 < len(sys.argv):
            output_path = Path(sys.argv[i + 1])
            i += 2
        elif arg == '--workers' and i + 1 < len(sys.argv):
            config.max_workers = int(sys.argv[i + 1])
            i += 2
        elif arg == '--buffer' and i + 1 < len(sys.argv):
            config.frame_buffer_limit = int(sys.argv[i + 1])
            i += 2
        elif arg == '--interval' and i + 1 < len(sys.argv):
            config.sample_interval_seconds = float(sys.argv[i + 1])
            i += 2
        elif arg == '--cleanup' and i + 1 < len(sys.argv):
            config.memory_cleanup_interval = int(sys.argv[i + 1])
            i += 2
        elif arg == '--no-resize':
            config.resize_to_720p = False
            i += 1
        elif arg == '--no-report':
            config.enable_performance_report = False
            i += 1
        elif arg == '--no-aggressive-gc':
            config.enable_aggressive_gc = False
            i += 1
        elif arg == '--debug':
            logging.getLogger().setLevel(logging.DEBUG)
            i += 1
        else:
            logger.warning(f"Unknown argument: {arg}")
            i += 1
    
    # Determine output path
    if output_path is None:
        output_path = OutputManager.get_output_path(video_path, config.output_dir)
    
    # Print configuration
    logger.info("\n" + "="*70)
    logger.info("CONFIGURATION")
    logger.info("="*70)
    logger.info(f"Video: {video_path}")
    logger.info(f"Output: {output_path}")
    logger.info(f"Workers: {config.max_workers}")
    logger.info(f"Buffer limit: {config.frame_buffer_limit} frames")
    logger.info(f"Sample interval: {config.sample_interval_seconds}s")
    logger.info(f"Cleanup interval: {config.memory_cleanup_interval} frames")
    logger.info(f"Resize to 720p: {config.resize_to_720p}")
    logger.info(f"Aggressive GC: {config.enable_aggressive_gc}")
    logger.info(f"Device: {config.device}")
    logger.info("="*70 + "\n")
    
    # Run analysis
    try:
        analyze_and_save(video_path, output_path, config)
    except KeyboardInterrupt:
        logger.error("\n\nAnalysis interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def analyze_and_save(video_path: str, output_path: Path, config: AnalysisConfig) -> None:
    """Analyze a video and save results to JSON file"""
    try:
        analyzer = VideoAnalyzer(video_path, config)
        result = analyzer.analyze()
        
        # Check if analysis failed
        if result.error:
            logger.error(f"Analysis completed with error: {result.error}")
            # Still try to save the error result
            OutputManager.save_result(result, output_path)
            sys.exit(1)
        
        # Save to file
        success = OutputManager.save_result(result, output_path)
        
        if success:
            OutputManager.print_success_message(output_path)
            sys.exit(0)
        else:
            logger.error("Failed to save analysis results")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()