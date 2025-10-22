# Plugin Development Guide

This guide explains how to create custom analyzer plugins for the Edit Mind video analysis system.

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating a Plugin](#creating-a-plugin)
4. [Plugin Lifecycle](#plugin-lifecycle)
5. [Best Practices](#best-practices)
6. [Example Plugins](#example-plugins)

---

## Overview

Analyzer plugins extend the video analysis pipeline by processing video frames and extracting specific types of information. Each plugin operates independently and can contribute data to the frame analysis results.

**Common Plugin Types:**
- Object detection
- Face recognition
- Scene classification
- Audio analysis
- Motion detection
- Text recognition (OCR)
- Color analysis

---

## Plugin Architecture

### Base Class

All plugins must inherit from `AnalyzerPlugin`:
```python
from plugins.base import AnalyzerPlugin
from typing import Dict, Any
import numpy as np

class MyPlugin(AnalyzerPlugin):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # Initialize your plugin
    
    def setup(self) -> None:
        # Load models, resources, etc.
        pass
    
    def analyze_frame(
        self, 
        frame: np.ndarray, 
        frame_analysis: Dict[str, Any], 
        video_path: str
    ) -> Dict[str, Any]:
        # Process frame and return results
        return frame_analysis
    
    def get_results(self) -> Any:
        # Return accumulated results
        pass
    
    def get_summary(self) -> Any:
        # Return high-level summary
        pass
```

### Plugin Discovery

Plugins are automatically discovered and loaded from the `python/plugins/` directory. To register a plugin:

1. Create a Python file in `python/plugins/`
2. Add your plugin class name to the `plugin_module_map` in `analyze.py`:
```python
plugin_module_map = {
    "YourPluginName": "your_plugin_file",  # Without .py extension
    # ... other plugins
}
```

---

## Creating a Plugin

### Step 1: Create Plugin File

Create `python/plugins/my_analyzer.py`:
```python
"""My custom video analyzer plugin."""
import logging
from typing import Dict, Any, List
import numpy as np
from plugins.base import AnalyzerPlugin

logger = logging.getLogger(__name__)


class MyAnalyzerPlugin(AnalyzerPlugin):
    """Detects and analyzes X in video frames."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.model = None
        self.results: List[Dict] = []
        
        # Access configuration
        self.confidence_threshold = config.get('my_confidence', 0.5)
        self.device = config.get('device', 'cpu')
    
    def setup(self) -> None:
        """Initialize models and resources."""
        logger.info("Setting up MyAnalyzerPlugin...")
        
        try:
            # Load your model here
            # self.model = load_model('path/to/model')
            logger.info("✓ MyAnalyzerPlugin ready")
        except Exception as e:
            logger.error(f"Failed to setup MyAnalyzerPlugin: {e}")
            raise
    
    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: Dict[str, Any],
        video_path: str
    ) -> Dict[str, Any]:
        """
        Analyze a single frame.
        
        Args:
            frame: Video frame (BGR format, NumPy array)
            frame_analysis: Existing analysis data for this frame
            video_path: Path to video file being analyzed
            
        Returns:
            Updated frame_analysis dictionary
        """
        if self.model is None:
            logger.warning("Model not initialized")
            return frame_analysis
        
        try:
            # Perform your analysis
            # results = self.model.predict(frame)
            
            # Add results to frame analysis
            frame_analysis['my_custom_data'] = {
                'detected': True,
                'confidence': 0.95,
                # ... your data
            }
            
            # Store for summary
            self.results.append({
                'timestamp': frame_analysis['start_time_ms'],
                'data': 'some_value'
            })
            
        except Exception as e:
            logger.error(f"Error analyzing frame: {e}")
        
        return frame_analysis
    
    def get_results(self) -> List[Dict]:
        """Return all accumulated results."""
        return self.results
    
    def get_summary(self) -> Dict[str, Any]:
        """Return high-level summary statistics."""
        total_detections = len(self.results)
        
        logger.info(f"\nMyAnalyzer Summary:")
        logger.info(f"  Total detections: {total_detections}")
        
        return {
            'total_detections': total_detections,
            'plugin_name': 'MyAnalyzerPlugin'
        }
```

### Step 2: Register Plugin

Edit `analyze.py` and add your plugin to the map:
```python
plugin_module_map = {
    "ObjectDetectionPlugin": "object_detection",
    "FaceRecognitionPlugin": "face_recognition",
    "MyAnalyzerPlugin": "my_analyzer",  # Add this line
    # ... other plugins
}
```

### Step 3: Configuration (Optional)

Add plugin-specific settings to `settings.json`:
```json
{
  "sample_interval_seconds": 2.0,
  "my_confidence": 0.7,
  "my_custom_setting": true
}
```

---

## Plugin Lifecycle

### 1. Initialization (`__init__`)
```python
def __init__(self, config: Dict[str, Any]):
    super().__init__(config)
    # Store configuration
    # Initialize variables (don't load heavy resources yet)
```

### 2. Setup (`setup`)
```python
def setup(self) -> None:
    # Load ML models
    # Initialize heavy resources
    # Perform one-time operations
```

### 3. Frame Analysis (`analyze_frame`)
```python
def analyze_frame(self, frame, frame_analysis, video_path):
    # Called for EVERY frame
    # Must be fast and efficient
    # Update frame_analysis dictionary
    return frame_analysis
```

### 4. Results Collection (`get_results`)
```python
def get_results(self):
    # Return all accumulated data
    # Called once after all frames processed
```

### 5. Summary (`get_summary`)
```python
def get_summary(self):
    # Return high-level statistics
    # Called once at the end
```

---

## Best Practices

### Performance

1. **Minimize `analyze_frame` execution time**
```python
   # ❌ Bad: Loading model every frame
   def analyze_frame(self, frame, frame_analysis, video_path):
       model = load_model()  # SLOW!
       results = model.predict(frame)
   
   # ✅ Good: Load once in setup
   def setup(self):
       self.model = load_model()
   
   def analyze_frame(self, frame, frame_analysis, video_path):
       results = self.model.predict(frame)
```

2. **Use efficient NumPy operations**
```python
   # ✅ Good: Vectorized operations
   gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
   blurred = cv2.GaussianBlur(gray, (5, 5), 0)
```

3. **Avoid unnecessary copies**
```python
   # ❌ Bad: Creates copy
   frame_copy = frame.copy()
   
   # ✅ Good: Work with reference (if read-only)
   gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
```

### Memory Management

1. **Don't store entire frames**
```python
   # ❌ Bad: Stores entire frame in memory
   self.frames.append(frame)
   
   # ✅ Good: Store only necessary data
   self.results.append({
       'timestamp': frame_analysis['start_time_ms'],
       'detection': True
   })
```

2. **Clean up large objects**
```python
   def analyze_frame(self, frame, frame_analysis, video_path):
       large_tensor = self.model.process(frame)
       result = extract_data(large_tensor)
       del large_tensor  # Free memory immediately
       return frame_analysis
```

### Error Handling
```python
def analyze_frame(self, frame, frame_analysis, video_path):
    try:
        # Your analysis code
        results = self.model.predict(frame)
        frame_analysis['my_data'] = results
    except Exception as e:
        logger.error(f"Error in {self.__class__.__name__}: {e}")
        # Don't crash the entire pipeline
        frame_analysis['my_data'] = None
    
    return frame_analysis
```

### Logging
```python
import logging
logger = logging.getLogger(__name__)

class MyPlugin(AnalyzerPlugin):
    def setup(self):
        logger.info("Setting up MyPlugin...")
        logger.debug("Loading model from path X")
        logger.info("✓ MyPlugin ready")
    
    def analyze_frame(self, frame, frame_analysis, video_path):
        logger.debug(f"Processing frame at {frame_analysis['timestamp_ms']}ms")
        # Use debug for verbose frame-level logs
```

---

## Example Plugins

### Example 1 : Motion Detection Plugin
```python
"""Detects motion between consecutive frames."""
import logging
from typing import Dict, Any, List
import numpy as np
import cv2
from plugins.base import AnalyzerPlugin

logger = logging.getLogger(__name__)


class MotionDetectionPlugin(AnalyzerPlugin):
    """Detects motion by comparing consecutive frames."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.previous_frame = None
        self.motion_events: List[Dict] = []
        self.motion_threshold = config.get('motion_threshold', 5000)
    
    def setup(self) -> None:
        logger.info("Motion Detection Plugin ready")
    
    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: Dict[str, Any],
        video_path: str
    ) -> Dict[str, Any]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        
        if self.previous_frame is None:
            self.previous_frame = gray
            frame_analysis['motion_detected'] = False
            frame_analysis['motion_intensity'] = 0
            return frame_analysis
        
        frame_delta = cv2.absdiff(self.previous_frame, gray)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        motion_pixels = np.sum(thresh) / 255
        
        motion_detected = motion_pixels > self.motion_threshold
        
        frame_analysis['motion_detected'] = bool(motion_detected)
        frame_analysis['motion_intensity'] = float(motion_pixels)
        
        if motion_detected:
            self.motion_events.append({
                'timestamp': frame_analysis['start_time_ms'],
                'intensity': float(motion_pixels)
            })
        
        self.previous_frame = gray
        
        return frame_analysis
    
    def get_results(self) -> List[Dict]:
        return self.motion_events
    
    def get_summary(self) -> Dict[str, Any]:
        total_motion_events = len(self.motion_events)
        avg_intensity = (
            sum(e['intensity'] for e in self.motion_events) / total_motion_events
            if total_motion_events > 0 else 0
        )
        
        logger.info(f"\nMotion Detection Summary:")
        logger.info(f"  Events detected: {total_motion_events}")
        logger.info(f"  Average intensity: {avg_intensity:.1f}")
        
        return {
            'total_motion_events': total_motion_events,
            'average_intensity': avg_intensity
        }
```
