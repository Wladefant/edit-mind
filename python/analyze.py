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

warnings.filterwarnings('ignore', category=FutureWarning, module='ultralytics')

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("Warning: psutil not installed. Memory tracking disabled.", file=sys.stderr)

from plugins.base import AnalyzerPlugin


# ============================================================================ 
# Configuration - OPTIMIZED FOR M1 MAX
# ============================================================================ 

@dataclass
class AnalysisConfig:
    """Configuration for video analysis - Optimized for M1 Max"""
    sample_interval_seconds: float = 2.0
    max_workers: int = 4  # Reduced from 24 - M1 works better with fewer workers
    batch_size: int = 16  # Reduced from 64 - critical for memory
    yolo_confidence: float = 0.35
    yolo_iou: float = 0.45
    resize_to_720p: bool = True
    known_faces_file: str = '../known_faces.json'
    yolo_model: str = 'yolov8n.pt'  # Use nano model instead of small
    output_dir: str = 'analysis_results'
    unknown_faces_dir: str = 'unknown_faces'
    enable_streaming: bool = True  # ALWAYS use streaming on M1
    enable_performance_report: bool = True
    enable_aggressive_gc: bool = True  # New: Force garbage collection
    frame_buffer_limit: int = 8  # New: Maximum frames in memory at once

    def __post_init__(self):
        settings_path = Path(__file__).parent.parent / 'settings.json'
        if settings_path.exists():
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                for key, value in settings.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
        
        # Force streaming mode on M1
        self.enable_streaming = True
        
        # Auto-adjust workers based on available memory
        if HAS_PSUTIL:
            available_gb = psutil.virtual_memory().available / (1024**3)
            if available_gb < 8:
                self.max_workers = 2
                self.batch_size = 8
                print(f"⚠️  Low memory detected ({available_gb:.1f}GB). Reducing workers to {self.max_workers}", file=sys.stderr)

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
# Memory Monitor - NEW
# ============================================================================ 

class MemoryMonitor:
    """Monitor and manage memory usage"""
    
    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory = 0
        
    def get_memory_mb(self) -> float:
        """Get current memory usage in MB"""
        if self.process:
            mem = self.process.memory_info().rss / 1024 / 1024
            self.peak_memory = max(self.peak_memory, mem)
            return mem
        return 0.0
    
    def force_cleanup(self):
        """Aggressive memory cleanup"""
        if self.config.enable_aggressive_gc:
            gc.collect()
            
            # M1-specific: Clear MPS cache if using PyTorch
            try:
                import torch
                if torch.backends.mps.is_available():
                    torch.mps.empty_cache()
            except:
                pass
    
    def check_memory_warning(self) -> bool:
        """Check if memory usage is critical"""
        if not self.process:
            return False
        
        available = psutil.virtual_memory().available / (1024**3)
        if available < 2:  # Less than 2GB available
            print(f"⚠️  MEMORY WARNING: Only {available:.1f}GB available!", file=sys.stderr)
            return True
        return False


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
            print(f"✓ {self.stage_name}: {duration:.2f}s ({fps:.1f} fps) | Mem: {end_memory:.0f}MB", file=sys.stderr)
        else:
            print(f"✓ {self.stage_name}: {duration:.2f}s | Mem: {end_memory:.0f}MB", file=sys.stderr)


# ============================================================================ 
# Frame Processor - OPTIMIZED
# ============================================================================ 

class FrameProcessor:
    """Handles frame extraction and preprocessing with memory optimization"""

    def __init__(self, config: AnalysisConfig):
        self.config = config

    def extract_frames_streaming_generator(self, video_path: str) -> Iterator[Tuple[Dict, float, int]]:
        """
        Memory-efficient streaming generator that yields one frame at a time.
        This is the KEY optimization for M1 Max.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = int(fps * self.config.sample_interval_seconds)
        
        frame_count = 0
        
        for current_frame_idx in range(0, total_frames_count, sample_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
            ret, frame = cap.read()

            if not ret:
                break

            processed_frame = self._preprocess_frame(frame)

            timestamp_ms = round((current_frame_idx / fps) * 1000)
            next_frame_idx = min(current_frame_idx + sample_interval, total_frames_count)
            end_timestamp_ms = round((next_frame_idx / fps) * 1000)

            frame_data = {
                'frame': processed_frame,
                'timestamp_ms': timestamp_ms,
                'end_timestamp_ms': end_timestamp_ms,
                'frame_idx': current_frame_idx
            }
            
            frame_count += 1
            yield frame_data, fps, total_frames_count
            
            # Aggressive cleanup after each frame
            del frame, processed_frame

        cap.release()

    def _preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Resize frame for optimal processing speed"""
        if self.config.resize_to_720p and frame.shape[0] > 720:
            h, w = frame.shape[:2]
            target_h = 720
            target_w = int(w * (target_h / h))
            return cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        return frame


# ============================================================================ 
# Plugin Loader
# ============================================================================ 

def load_plugins(config: AnalysisConfig) -> List[AnalyzerPlugin]:
    plugins = []
    plugin_dir = Path(__file__).parent / "plugins"
    config_dict = asdict(config)
    config_dict['device'] = config.device

    print(f"Loading plugins from {plugin_dir}...", file=sys.stderr)
    print(f"Using device: {config.device}", file=sys.stderr)

    # Optimized plugin loading order
    enabled_plugins = [
        "ObjectDetectionPlugin",    # Run first
        "FaceRecognitionPlugin",     # Run second
        "ShotTypePlugin",            # Depends on faces
        "EnvironmentPlugin",         # Depends on objects
        # "EmotionDetectionPlugin", # Disable heavy plugins if memory constrained
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
                        print(f"  ✓ Loaded: {name}", file=sys.stderr)
                    else:
                        print(f"  - Skipped: {name}", file=sys.stderr)
        except Exception as e:
            print(f"  ✗ Error loading plugin {module_name}: {e}", file=sys.stderr)
    
    print(f"Total plugins loaded: {len(plugins)}\n", file=sys.stderr)
    return plugins


# ============================================================================ 
# Video Analyzer (Main Class) - HEAVILY OPTIMIZED
# ============================================================================ 

class VideoAnalyzer:
    """Main video analysis coordinator - Optimized for M1 Max"""

    def __init__(self, video_path: str, config: Optional[AnalysisConfig] = None):
        self.video_path = video_path
        self.config = config or AnalysisConfig()
        self.video_base_name = Path(self.video_path).stem
        self.metrics: List[PerformanceMetrics] = []
        self.frame_processor = FrameProcessor(self.config)
        self.memory_monitor = MemoryMonitor(self.config)
        
        # Create output directory
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Load plugins
        self.plugins = load_plugins(self.config)

    def _track_stage(self, stage_name: str) -> StageTracker:
        """Create a context manager for tracking stage performance"""
        return StageTracker(self, stage_name)

    def analyze(self) -> VideoAnalysisResult:
        """Perform complete video analysis with memory optimization"""
        start_video_analysis_time = time.time()
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"Starting analysis: {Path(self.video_path).name}", file=sys.stderr)
        print(f"Memory-optimized mode for M1 Max", file=sys.stderr)
        print(f"{'='*70}\n", file=sys.stderr)

        try:
            # Setup plugins
            with self._track_stage("plugin_setup") as stage:
                for plugin in self.plugins:
                    plugin.setup()

            # Always use streaming on M1
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
                    "peak_memory_mb": self.memory_monitor.peak_memory
                },
                performance_metrics=[asdict(m) for m in self.metrics]
            )

        except Exception as e:
            total_video_analysis_time = time.time() - start_video_analysis_time
            print(f"\n{'='*70}", file=sys.stderr)
            print(f"✗ FAILED Analysis for {Path(self.video_path).name}", file=sys.stderr)
            print(f"  Error: {str(e)}", file=sys.stderr)
            print(f"  Time elapsed: {total_video_analysis_time:.2f}s", file=sys.stderr)
            print(f"{'='*70}\n", file=sys.stderr)
            
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            return self._create_error_result(str(e))

    def _analyze_streaming_optimized(self) -> List[Dict]:
        """
        CRITICAL OPTIMIZATION: Process frames in micro-batches with aggressive memory management.
        This is designed specifically for M1 Max unified memory architecture.
        """
        frame_generator = self.frame_processor.extract_frames_streaming_generator(self.video_path)
        frame_analyses = []
        batch = []
        
        # Get total frame count for progress bar
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = int(fps * self.config.sample_interval_seconds)
        total_sampled = (total_frames // sample_interval) + 1
        cap.release()
        
        with self._track_stage("streaming_analysis") as stage:
            with tqdm(total=total_sampled, desc="  Processing", unit="frame", file=sys.stderr) as pbar:
                for frame_data, fps, total_frames in frame_generator:
                    batch.append(frame_data)
                    
                    # Process micro-batch when buffer limit is reached
                    if len(batch) >= self.config.frame_buffer_limit:
                        batch_results = self._process_micro_batch(batch)
                        frame_analyses.extend(batch_results)
                        
                        # CRITICAL: Clear batch and force cleanup
                        batch.clear()
                        self.memory_monitor.force_cleanup()
                        
                        # Check memory status
                        if self.memory_monitor.check_memory_warning():
                            print("  Pausing briefly for memory recovery...", file=sys.stderr)
                            time.sleep(0.5)
                        
                        pbar.update(len(batch_results))
                
                # Process remaining frames
                if batch:
                    batch_results = self._process_micro_batch(batch)
                    frame_analyses.extend(batch_results)
                    pbar.update(len(batch_results))
                    batch.clear()
            
            stage.frames_processed = len(frame_analyses)
        
        # Final cleanup
        self.memory_monitor.force_cleanup()
        return frame_analyses

    def _process_micro_batch(self, batch: List[Dict]) -> List[Dict]:
        """
        Process a micro-batch of frames through all plugins.
        Uses reduced parallelism to avoid memory spikes.
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
            
            # Use limited parallelism
            with ThreadPoolExecutor(max_workers=min(self.config.max_workers, len(batch))) as executor:
                futures = [
                    executor.submit(self._safe_plugin_call, plugin, batch[i]['frame'], results[i].copy())
                    for i in range(len(batch))
                ]
                
                for i, future in enumerate(futures):
                    try:
                        plugin_result = future.result(timeout=30)  # Add timeout
                        if plugin_result and isinstance(plugin_result, dict):
                            results[i].update(plugin_result)
                    except Exception as e:
                        print(f"\n  Warning: Frame {i} failed in {plugin_name}: {e}", file=sys.stderr)
        
        # Clean up batch frames from memory
        for b in batch:
            if 'frame' in b:
                del b['frame']
        
        return results

    def _safe_plugin_call(self, plugin: AnalyzerPlugin, frame: np.ndarray, frame_analysis: Dict) -> Dict:
        """Safely call plugin with error handling"""
        try:
            return plugin.analyze_frame(frame, frame_analysis)
        except Exception as e:
            print(f"\n  Error in {plugin.__class__.__name__}: {e}", file=sys.stderr)
            return frame_analysis

    def _run_post_processing(self, frame_analyses: List[Dict]) -> Tuple[Dict, List[Dict], Dict]:
        """Run post-processing plugins that analyze the whole scene."""
        scene_analysis = {}
        detected_activities = []
        face_summary = {}

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_scene'):
                plugin.analyze_scene(frame_analyses)
                results = plugin.get_results()
                if results:
                    scene_analysis.update(asdict(results) if hasattr(results, '__dataclass_fields__') else results)

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_activities'):
                activities = plugin.analyze_activities(frame_analyses, scene_analysis)
                if activities:
                    detected_activities = [asdict(a) if hasattr(a, '__dataclass_fields__') else a for a in activities]

        for plugin in self.plugins:
            if hasattr(plugin, 'get_summary'):
                summary = plugin.get_summary()
                if summary and "known_people_identified" in summary:
                    face_summary = summary

        return scene_analysis, detected_activities, face_summary

    def _print_performance_report(self, total_time: float):
        """Print detailed performance breakdown"""
        print(f"\n{'='*70}", file=sys.stderr)
        print("PERFORMANCE REPORT (M1 OPTIMIZED)", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        
        for metric in self.metrics:
            print(f"\n{metric.stage.upper()}", file=sys.stderr)
            print(f"  Duration: {metric.duration_seconds:.2f}s", file=sys.stderr)
            
            if metric.frames_processed > 0:
                print(f"  Frames: {metric.frames_processed}", file=sys.stderr)
                print(f"  FPS: {metric.fps:.2f}", file=sys.stderr)
            
            if metric.memory_mb is not None:
                print(f"  Memory Δ: {metric.memory_mb:+.1f} MB", file=sys.stderr)
            
            if metric.peak_memory_mb is not None:
                print(f"  Peak Memory: {metric.peak_memory_mb:.0f} MB", file=sys.stderr)
        
        print(f"\n{'─'*70}", file=sys.stderr)
        print(f"TOTAL TIME: {total_time:.2f}s", file=sys.stderr)
        print(f"PEAK MEMORY: {self.memory_monitor.peak_memory:.0f} MB", file=sys.stderr)
        
        # Calculate efficiency metrics
        total_frames = sum(m.frames_processed for m in self.metrics if m.frames_processed > 0)
        if total_frames > 0:
            overall_fps = total_frames / total_time
            print(f"OVERALL FPS: {overall_fps:.2f}", file=sys.stderr)
        
        print(f"{'='*70}\n", file=sys.stderr)

    def _create_error_result(self, error: str) -> VideoAnalysisResult:
        """Create error result object"""
        return VideoAnalysisResult(
            video_file=self.video_path,
            scene_analysis={},
            detected_activities=[],
            face_recognition_summary={},
            frame_analysis=[],
            summary={"error": error, "peak_memory_mb": self.memory_monitor.peak_memory},
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
                json.dump(asdict(result), f, indent=2, ensure_ascii=False)
            
            print(f"\n✓ Results saved to: {output_path}", file=sys.stderr)
            
            # Print file size
            file_size = output_path.stat().st_size
            if file_size < 1024:
                size_str = f"{file_size} B"
            elif file_size < 1024 * 1024:
                size_str = f"{file_size / 1024:.1f} KB"
            else:
                size_str = f"{file_size / (1024 * 1024):.1f} MB"
            
            print(f"  File size: {size_str}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"\n✗ Failed to save results: {e}", file=sys.stderr)
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
        print("  --batch <n>         Batch size (default: 16 for M1)", file=sys.stderr)
        print("  --no-report         Disable performance report", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print("  python analyze.py video.mp4", file=sys.stderr)
        print("  python analyze.py video.mp4 --workers 2 --batch 8", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    
    # Validate video file exists
    if not Path(video_path).exists():
        print(f"Error: Video file not found: {video_path}", file=sys.stderr)
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
        elif arg == '--batch' and i + 1 < len(sys.argv):
            config.batch_size = int(sys.argv[i + 1])
            i += 2
        elif arg == '--no-report':
            config.enable_performance_report = False
            i += 1
        else:
            i += 1
    
    # Determine output path
    if output_path is None:
        output_path = OutputManager.get_output_path(video_path, config.output_dir)
    
    # Run analysis
    analyze_and_save(video_path, output_path, config)


def analyze_and_save(video_path: str, output_path: Path, config: AnalysisConfig) -> None:
    """Analyze a video and save results to JSON file"""
    analyzer = VideoAnalyzer(video_path, config)
    result = analyzer.analyze()
    
    # Save to file
    success = OutputManager.save_result(result, output_path)
    
    if success:
        OutputManager.print_success_message(output_path)
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()