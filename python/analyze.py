import sys
import json
import importlib
import inspect
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Iterator, Callable
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time
import warnings
import logging
import math

import cv2
import numpy as np
from tqdm import tqdm
import gc

warnings.filterwarnings('ignore', category=FutureWarning, module='ultralytics')

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


@dataclass
class AnalysisConfig:
    """Video analysis configuration with environment-based overrides."""
    sample_interval_seconds: float = 2.0
    max_workers: int = 4
    batch_size: int = 16
    yolo_confidence: float = 0.35
    yolo_iou: float = 0.45
    resize_to_720p: bool = True
    known_faces_file: str = 'known_faces.json'
    yolo_model: str = 'yolov8n.pt'
    output_dir: str = 'analysis_results'
    unknown_faces_dir: str = 'unknown_faces'
    enable_streaming: bool = True
    enable_performance_report: bool = True
    enable_aggressive_gc: bool = True
    frame_buffer_limit: int = 8
    plugin_timeout_seconds: int = 60
    batch_timeout_seconds: int = 300
    memory_cleanup_interval: int = 50
    lazy_plugin_init: bool = True

    def __post_init__(self):
        self._load_settings()
        self._adjust_for_memory()
        self.enable_streaming = True

    def _load_settings(self) -> None:
        """Load settings from external JSON file if available."""
        settings_path = Path(__file__).parent.parent / 'settings.json'
        if not settings_path.exists():
            return
            
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                for key, value in settings.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
        except Exception as e:
            logger.warning(f"Failed to load settings.json: {e}")

    def _adjust_for_memory(self) -> None:
        """Auto-adjust workers based on available system memory."""
        if not HAS_PSUTIL:
            return
            
        available_gb = psutil.virtual_memory().available / (1024**3)
        if available_gb < 8:
            self.max_workers = 2
            self.frame_buffer_limit = 4
            logger.warning(
                f"Low memory detected ({available_gb:.1f}GB). "
                f"Reducing workers to {self.max_workers}"
            )

    @property
    def device(self) -> str:
        """Return processing device (CPU-only for stability)."""
        return 'cpu'


@dataclass
class PerformanceMetrics:
    """Performance metrics for analysis stages."""
    stage: str
    duration_seconds: float
    frames_processed: int = 0
    fps: float = 0.0
    memory_mb: Optional[float] = None
    peak_memory_mb: Optional[float] = None


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result container."""
    video_file: str
    scene_analysis: Dict
    detected_activities: List[Dict]
    face_recognition_summary: Dict
    frame_analysis: List[Dict]
    summary: Dict
    performance_metrics: Optional[List[Dict]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to JSON-serializable dictionary."""
        data_dict = asdict(self)
        return self._convert_numpy_types(data_dict)

    @staticmethod
    def _convert_numpy_types(obj):
        """Recursively convert NumPy types to Python native types."""
        if isinstance(obj, dict):
            return {k: VideoAnalysisResult._convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [VideoAnalysisResult._convert_numpy_types(elem) for elem in obj]
        elif isinstance(obj, (np.bool_, np.int_, np.float_)):
            return obj.item()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj


class MemoryMonitor:
    """Aggressive memory management and monitoring."""
    
    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory = 0.0
        self.cleanup_count = 0

    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        if not self.process:
            return 0.0
        mem = self.process.memory_info().rss / 1024 / 1024
        self.peak_memory = max(self.peak_memory, mem)
        return mem

    def force_cleanup(self) -> None:
        """Force Python garbage collection and clear caches."""
        if not self.config.enable_aggressive_gc:
            return
            
        for _ in range(3):
            gc.collect()
        
        self.cleanup_count += 1
        
        try:
            import torch
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
        except ImportError:
            pass

        if self.cleanup_count % 10 == 0:
            logger.debug(
                f"Memory cleanup #{self.cleanup_count}: "
                f"{self.get_memory_mb():.0f}MB (peak: {self.peak_memory:.0f}MB)"
            )

    def check_memory_warning(self) -> bool:
        """Check if memory usage is critically low."""
        if not self.process:
            return False
        
        available = psutil.virtual_memory().available / (1024**3)
        if available < 2:
            logger.warning(f"⚠ MEMORY WARNING: Only {available:.1f}GB available!")
            return True
        return False

    def get_memory_stats(self) -> Dict[str, float]:
        """Get detailed memory statistics."""
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


class StageTracker:
    """Context manager for performance tracking."""
    
    def __init__(self, analyzer: 'VideoAnalyzer', stage_name: str):
        self.analyzer = analyzer
        self.stage_name = stage_name
        self.start_time = None
        self.start_memory = None
        self.frames_processed = 0

    def __enter__(self):
        self.start_time = time.time()
        self.start_memory = self.analyzer.memory_monitor.get_memory_mb()
        logger.info(f"Starting stage: {self.stage_name}")
        return self

    def __exit__(self, *args):
        duration = time.time() - self.start_time
        end_memory = self.analyzer.memory_monitor.get_memory_mb()
        memory_delta = end_memory - self.start_memory if self.start_memory else None
        fps = self.frames_processed / duration if duration > 0 and self.frames_processed > 0 else 0.0
        
        metric = PerformanceMetrics(
            stage=self.stage_name,
            duration_seconds=duration,
            frames_processed=self.frames_processed,
            fps=fps,
            memory_mb=memory_delta,
            peak_memory_mb=self.analyzer.memory_monitor.peak_memory
        )
        
        self.analyzer.metrics.append(metric)
        
        if self.frames_processed > 0:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s ({fps:.1f} fps) | Mem: {end_memory:.0f}MB")
        else:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s | Mem: {end_memory:.0f}MB")


class FrameProcessor:
    """Zero-disk-IO streaming frame extraction and preprocessing."""

    def __init__(self, config: AnalysisConfig):
        self.config = config

    def extract_frames_streaming_generator(
        self, 
        video_path: str
    ) -> Iterator[Tuple[Dict, float, int]]:
        """
        Memory-efficient streaming generator that yields frames directly.
        No disk writes - everything stays in RAM.
        """
        cap = cv2.VideoCapture(video_path)
        
        try:
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps is None or fps <= 0:
                logger.warning("Invalid FPS detected, defaulting to 30")
                fps = 30.0
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames <= 0:
                raise ValueError("Invalid video file: cannot determine frame count")
            
            sample_interval = max(1, int(fps * self.config.sample_interval_seconds))
            
            for frame_idx in range(0, total_frames, sample_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if not ret:
                    logger.warning(f"Failed to read frame at index {frame_idx}")
                    break

                processed_frame = self._preprocess_frame(frame)
                
                timestamp_ms = round((frame_idx / fps) * 1000)
                next_frame_idx = min(frame_idx + sample_interval, total_frames)
                end_timestamp_ms = round((next_frame_idx / fps) * 1000)

                frame_data = {
                    'frame': processed_frame,
                    'timestamp_ms': timestamp_ms,
                    'end_timestamp_ms': end_timestamp_ms,
                    'frame_idx': frame_idx
                }
                
                yield frame_data, fps, total_frames
                del frame
        
        except Exception as e:
            logger.error(f"Error in frame extraction: {e}")
            raise
        finally:
            if cap is not None:
                cap.release()

    def _preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Resize frame for optimal processing. Returns new array for GC."""
        if frame is None:
            raise ValueError("Received None frame")
        
        if self.config.resize_to_720p and frame.shape[0] > 720:
            h, w = frame.shape[:2]
            target_h = 720
            target_w = int(w * (target_h / h))
            return cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        
        return frame.copy()


def load_plugins(config: AnalysisConfig) -> List[AnalyzerPlugin]:
    """Dynamically load all analyzer plugins from plugins directory."""
    plugins = []
    plugin_dir = Path(__file__).parent / "plugins"
    config_dict = asdict(config)
    config_dict['device'] = 'cpu'

    logger.info(f"Loading plugins from {plugin_dir}...")

    plugin_module_map = {
        "ObjectDetectionPlugin": "object_detection",
        "FaceRecognitionPlugin": "face_recognition",
        "ShotTypePlugin": "shot_type",
        "EnvironmentPlugin": "environment",
        "DominantColorPlugin": "dominant_color",
    }

    for plugin_name, module_stem in plugin_module_map.items():
        module_name = f"plugins.{module_stem}"
        
        try:
            module = importlib.import_module(module_name)
            logger.info(f"  ✓ Imported {module_name}")
            
            for name, cls in inspect.getmembers(module, inspect.isclass):
                if name == plugin_name and issubclass(cls, AnalyzerPlugin) and cls is not AnalyzerPlugin:
                    plugin_instance = cls(config_dict)
                    plugins.append(plugin_instance)
                    logger.info(f"  ✓ Initialized {name}")
                    break
                    
        except Exception as e:
            logger.error(f"  ✗ Error with {module_name}: {e}")
            import traceback
            traceback.print_exc()
    
    logger.info(f"Total plugins loaded: {len(plugins)}\n")
    return plugins


class VideoAnalyzer:
    """Main video analysis coordinator with memory-optimized streaming."""

    def __init__(self, video_path: str, config: Optional[AnalysisConfig] = None):
        self.video_path = video_path
        self.config = config or AnalysisConfig()
        self.video_base_name = Path(self.video_path).stem
        self.metrics: List[PerformanceMetrics] = []
        self.frame_processor = FrameProcessor(self.config)
        self.memory_monitor = MemoryMonitor(self.config)
        self.progress_callback: Optional[Callable] = None
        self.start_time = None
        self.frames_analyzed = 0
        
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)
        
        self.plugin_definitions = load_plugins(self.config)
        self.plugins = []

    def _track_stage(self, stage_name: str) -> StageTracker:
        """Create performance tracking context manager."""
        return StageTracker(self, stage_name)

    def analyze(self) -> VideoAnalysisResult:
        """Execute complete video analysis pipeline."""
        start_time = time.time()
        self.start_time = start_time
        
        # Call progress callback at the start (0% progress)
        if self.progress_callback:
            self.progress_callback(0, 0.0, 0, 0)

        try:
            if not Path(self.video_path).exists():
                raise FileNotFoundError(f"Video file not found: {self.video_path}")

            with self._track_stage("plugin_setup"):
                self._setup_plugins()

            frame_analyses = self._analyze_streaming_optimized()

            with self._track_stage("post_processing"):
                scene_analysis, activities, face_summary = self._run_post_processing(frame_analyses)

            total_time = time.time() - start_time

            if self.config.enable_performance_report:
                self._print_performance_report(total_time)

            return VideoAnalysisResult(
                video_file=self.video_path,
                scene_analysis=scene_analysis,
                detected_activities=activities,
                face_recognition_summary=face_summary,
                frame_analysis=frame_analyses,
                summary={
                    "total_frames_analyzed": len(frame_analyses),
                    "primary_activity": activities[0]['activity'] if activities else "unknown",
                    "confidence": activities[0]['confidence'] if activities else 0.0,
                    "total_analysis_time_seconds": total_time,
                    "peak_memory_mb": self.memory_monitor.peak_memory,
                    "memory_cleanups": self.memory_monitor.cleanup_count
                },
                performance_metrics=[asdict(m) for m in self.metrics]
            )

        except Exception as e:
            logger.error(f"\n{'='*70}")
            logger.error(f"✗ FAILED Analysis for {Path(self.video_path).name}")
            logger.error(f"  Error: {str(e)}")
            logger.error(f"{'='*70}\n")
            
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            return self._create_error_result(str(e))
    def _setup_plugins(self) -> None:
        """Initialize all plugins sequentially."""
        if self.config.lazy_plugin_init and self.plugin_definitions:
            if isinstance(self.plugin_definitions[0], tuple):
                logger.info("Initializing plugins sequentially...")
                for name, cls, config_dict in self.plugin_definitions:
                    try:
                        plugin = cls(config_dict)
                        plugin.setup()
                        self.plugins.append(plugin)
                    except Exception as e:
                        logger.error(f"  ✗ Failed to setup {name}: {e}")
            else:
                self.plugins = self.plugin_definitions
                for plugin in self.plugins:
                    try:
                        plugin.setup()
                    except Exception as e:
                        logger.error(f"Failed to setup {plugin.__class__.__name__}: {e}")
        else:
            self.plugins = self.plugin_definitions
            for plugin in self.plugins:
                try:
                    plugin.setup()
                except Exception as e:
                    logger.error(f"Failed to setup {plugin.__class__.__name__}: {e}")

        logger.info(f"Successfully loaded {len(self.plugins)} plugins\n")

    def _analyze_streaming_optimized(self) -> List[Dict]:
        """
        Stream-process video frames with aggressive memory cleanup.
        Batches are immediately cleared after processing.
        """
        frame_analyses = []
        batch = []
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = int(fps * self.config.sample_interval_seconds)
        total_sampled = (total_frames // sample_interval) + 1
        cap.release()
        
        with self._track_stage("streaming_analysis") as stage:
            # Custom progress bar class that calls our callback
            class CallbackTqdm(tqdm):
                def __init__(self, *args, callback=None, **kwargs):
                    self.callback = callback
                    self.start_time = time.time()
                    super().__init__(*args, **kwargs)
                
                def update(self, n=1):
                    result = super().update(n)
                    if self.callback and self.total:
                        try:
                            elapsed = time.time() - self.start_time
                            progress_percent = min(100.0, (self.n / self.total) * 100.0)
                            self.callback(
                                progress_percent,
                                elapsed,
                                float(self.n),
                                float(self.total)
                            )
                        except Exception as e:
                            logger.debug(f"Progress callback error: {e}")
                    return result
            
            with CallbackTqdm(
                total=total_sampled, 
                desc="  Processing", 
                unit="frame", 
                file=sys.stderr,
                callback=self.progress_callback
            ) as pbar:
                try:
                    frame_generator = self.frame_processor.extract_frames_streaming_generator(
                        self.video_path
                    )
                    
                    for frame_idx, (frame_data, fps, total_frames) in enumerate(frame_generator):
                        batch.append(frame_data)
                        
                        if len(batch) >= self.config.frame_buffer_limit:
                            batch_results = self._process_and_cleanup_batch(
                                batch, frame_idx, pbar
                            )
                            frame_analyses.extend(batch_results)
                            batch.clear()
                            
                            if self.memory_monitor.check_memory_warning():
                                logger.warning("Memory pressure detected, pausing...")
                                time.sleep(0.5)
                        
                        if frame_idx > 0 and frame_idx % self.config.memory_cleanup_interval == 0:
                            self.memory_monitor.force_cleanup()
                            mem_stats = self.memory_monitor.get_memory_stats()
                            logger.info(
                                f"Checkpoint: {self.frames_analyzed} frames | "
                                f"Mem: {mem_stats.get('current_mb', 0):.0f}MB / "
                                f"Peak: {mem_stats.get('peak_mb', 0):.0f}MB"
                            )
                    
                    if batch:
                        batch_results = self._process_and_cleanup_batch(
                            batch, frame_idx, pbar, is_final=True
                        )
                        frame_analyses.extend(batch_results)
                        batch.clear()
                
                except Exception as e:
                    logger.error(f"Fatal error in streaming analysis: {e}")
                    raise
            
            stage.frames_processed = len(frame_analyses)
        
        self.memory_monitor.force_cleanup()
        logger.info(f"\n✓ Analysis complete: {len(frame_analyses)} frames")
        
        return frame_analyses

    def _process_and_cleanup_batch(
        self, 
        batch: List[Dict], 
        frame_idx: int, 
        pbar, 
        is_final: bool = False
    ) -> List[Dict]:
        """Process batch and aggressively clean up memory."""
        batch_results = []
        
        try:
            batch_results = self._process_micro_batch(batch)
            pbar.update(len(batch_results))
            self.frames_analyzed += len(batch_results)
            # Progress callback is handled by pbar.update() now
                
        except Exception as e:
            logger.error(f"Error processing batch at frame {frame_idx}: {e}")
        finally:
            self._cleanup_batch_frames(batch)
            self.memory_monitor.force_cleanup()
            
            if is_final:
                logger.debug("Final batch processed and cleaned up")
        
        return batch_results
    
    def _cleanup_batch_frames(self, batch: List[Dict]) -> None:
        """Delete all frame arrays from memory."""
        for frame_data in batch:
            frame_data.pop('frame', None)

    def _process_micro_batch(self, batch: List[Dict]) -> List[Dict]:
        """Process batch through all plugins with limited parallelism."""
        results = [
            {
                'start_time_ms': b['timestamp_ms'],
                'end_time_ms': b['end_timestamp_ms'],
                'duration_ms': b['end_timestamp_ms'] - b['timestamp_ms']
            }
            for b in batch
        ]
        
        for plugin in self.plugins:
            executor = None
            
            try:
                executor = ThreadPoolExecutor(
                    max_workers=min(self.config.max_workers, len(batch))
                )
                
                futures = [
                    executor.submit(
                        self._safe_plugin_call,
                        plugin,
                        batch[i]['frame'],
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
                        logger.warning(
                            f"Timeout: Frame {i} in {plugin.__class__.__name__} took too long"
                        )
                    except Exception as e:
                        logger.warning(f"Frame {i} failed in {plugin.__class__.__name__}: {e}")

            except Exception as e:
                logger.error(f"Error in {plugin.__class__.__name__} batch processing: {e}")
            finally:
                if executor is not None:
                    try:
                        executor.shutdown(wait=False, cancel_futures=True)
                    except TypeError:
                        executor.shutdown(wait=False)
        
        return results

    def _safe_plugin_call(
        self, 
        plugin: AnalyzerPlugin, 
        frame: np.ndarray, 
        frame_analysis: Dict
    ) -> Dict:
        """Safely call plugin with error handling."""
        try:
            return plugin.analyze_frame(frame, frame_analysis, self.video_path)
        except Exception as e:
            logger.warning(f"Error in {plugin.__class__.__name__}: {e}")
            return frame_analysis

    def _run_post_processing(
        self, 
        frame_analyses: List[Dict]
    ) -> Tuple[Dict, List[Dict], Dict]:
        """Execute post-processing plugins."""
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
                        scene_analysis.update(
                            asdict(results) if hasattr(results, '__dataclass_fields__') else results
                        )
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.analyze_scene: {e}")

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_activities'):
                try:
                    activities = plugin.analyze_activities(frame_analyses, scene_analysis)
                    if activities:
                        detected_activities = [
                            asdict(a) if hasattr(a, '__dataclass_fields__') else a 
                            for a in activities
                        ]
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

    def _print_performance_report(self, total_time: float) -> None:
        """Print detailed performance breakdown."""
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

    def _create_error_result(self, error: str) -> VideoAnalysisResult:
        """Create error result object."""
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


class OutputManager:
    """Manages analysis result serialization."""
    
    @staticmethod
    def get_output_path(video_path: str, output_dir: str) -> Path:
        """Generate output JSON path for video file."""
        video_name = Path(video_path).stem
        return Path(output_dir) / f"{video_name}_analysis.json"
    
    @staticmethod
    def save_result(result: VideoAnalysisResult, output_path: Path) -> bool:
        """Save analysis result to JSON file."""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.info(f"\n✓ Results saved to: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"\n✗ Failed to save results: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def print_success_message(output_path: Path) -> None:
        """Print success message with output path."""
        print(str(output_path.absolute()))


def analyze_and_save(video_path: str, output_path: Path, config: AnalysisConfig) -> None:
    """Analyze video and save results to JSON."""
    try:
        analyzer = VideoAnalyzer(video_path, config)
        result = analyzer.analyze()
        
        if result.error:
            logger.error(f"Analysis completed with error: {result.error}")
            OutputManager.save_result(result, output_path)
            sys.exit(1)
        
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


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Production video analysis with AI-powered frame processing"
    )
    parser.add_argument("video_file", help="Path to video file")
    parser.add_argument("--output", type=Path, help="Custom output file path")
    parser.add_argument("--workers", type=int, help="Number of worker threads")
    parser.add_argument("--buffer", type=int, help="Frame buffer limit")
    parser.add_argument("--interval", type=float, help="Sample interval in seconds")
    parser.add_argument("--cleanup", type=int, help="Force cleanup every N frames")
    parser.add_argument("--no-resize", action="store_true", help="Disable 720p resize")
    parser.add_argument("--no-report", action="store_true", help="Disable performance report")
    parser.add_argument("--no-aggressive-gc", action="store_true", help="Disable aggressive GC")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    if not Path(args.video_file).exists():
        logger.error(f"Video file not found: {args.video_file}")
        sys.exit(1)
    
    config = AnalysisConfig()
    
    if args.workers:
        config.max_workers = args.workers
    if args.buffer:
        config.frame_buffer_limit = args.buffer
    if args.interval:
        config.sample_interval_seconds = args.interval
    if args.cleanup:
        config.memory_cleanup_interval = args.cleanup
    if args.no_resize:
        config.resize_to_720p = False
    if args.no_report:
        config.enable_performance_report = False
    if args.no_aggressive_gc:
        config.enable_aggressive_gc = False
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    output_path = args.output or OutputManager.get_output_path(
        args.video_file, 
        config.output_dir
    )
    

    try:
        analyze_and_save(args.video_file, output_path, config)
    except KeyboardInterrupt:
        logger.error("\n\nAnalysis interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()