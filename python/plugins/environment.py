from collections import Counter
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
import numpy as np
from plugins.base import AnalyzerPlugin


@dataclass
class SceneContext:
    """Scene environment analysis"""
    environment: str
    environment_confidence: float
    object_distribution: Dict[str, int]
    total_frames: int


class EnvironmentPlugin(AnalyzerPlugin):
    """
    A plugin for analyzing the scene environment from detected objects.
    Depends on object detection data from ObjectDetectionPlugin.
    """

    CATEGORIES = {
        'aquatic': ['boat', 'surfboard', 'person'],  # Swimming/water activities
        'urban': ['car', 'truck', 'bus', 'traffic light', 'stop sign', 'parking meter'],
        'indoor': ['chair', 'couch', 'tv', 'laptop', 'keyboard', 'mouse', 'bed', 'dining table'],
        'outdoor_nature': ['bicycle', 'kite', 'frisbee', 'sports ball', 'bird'],
        'commercial': ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl']
    }

    MIN_CONFIDENCE_THRESHOLD = 0.05  # Lowered threshold for better classification
    OBJECT_CONFIDENCE_THRESHOLD = 0.4

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.scene_context = None

    def setup(self):
        """
        No setup required for this plugin.
        """
        pass

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        This plugin does not analyze individual frames.
        It performs scene-level analysis in analyze_scene().
        """
        return frame_analysis

    def analyze_scene(self, all_frame_analyses: List[Dict[str, Any]]):
        """
        Analyze the environment from all frame objects.
        """
        # Collect all detected objects across all frames
        all_objects = []
        
        for frame in all_frame_analyses:
            # Safely get objects - might not exist if ObjectDetectionPlugin hasn't run
            objects = frame.get('objects', [])
            
            for obj in objects:
                # Check if object has required fields
                if isinstance(obj, dict) and 'label' in obj and 'confidence' in obj:
                    if obj['confidence'] > self.OBJECT_CONFIDENCE_THRESHOLD:
                        all_objects.append(obj['label'])

        # Handle case with no objects detected
        if not all_objects:
            self.scene_context = SceneContext(
                environment="unknown",
                environment_confidence=0.0,
                object_distribution={},
                total_frames=len(all_frame_analyses)
            )
            return

        # Count object occurrences
        object_counts = Counter(all_objects)
        total_objects = sum(object_counts.values())

        # Calculate environment scores
        scores = {}
        for env, category_objects in self.CATEGORIES.items():
            score = sum(object_counts.get(obj, 0) for obj in category_objects) / total_objects
            scores[env] = score

        # Find primary environment
        primary_env, confidence = max(scores.items(), key=lambda x: x[1])

        # Fallback for low confidence
        if confidence <= self.MIN_CONFIDENCE_THRESHOLD:
            primary_env = "general_outdoor"
            confidence = 0.0

        self.scene_context = SceneContext(
            environment=primary_env,
            environment_confidence=float(confidence),
            object_distribution=dict(object_counts),
            total_frames=len(all_frame_analyses)
        )

    def get_results(self) -> Any:
        """
        Returns the final scene context analysis.
        """
        if self.scene_context:
            return asdict(self.scene_context)
        return None

    def get_summary(self) -> Any:
        """
        Returns a summary of the environment analysis.
        """
        if self.scene_context:
            return {
                "primary_environment": self.scene_context.environment,
                "confidence": self.scene_context.environment_confidence,
                "top_objects": dict(Counter(self.scene_context.object_distribution).most_common(5))
            }
        return None