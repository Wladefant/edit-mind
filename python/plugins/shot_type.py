from typing import List, Dict, Any
import numpy as np
from collections import deque
from plugins.base import AnalyzerPlugin

class ShotTypePlugin(AnalyzerPlugin):
    """
    A plugin for classifying the shot type of video frames.
    Depends on face detection data from FaceRecognitionPlugin.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.CLOSE_UP_THRESHOLD = config.get("close_up_threshold", 0.3)
        self.MEDIUM_SHOT_THRESHOLD = config.get("medium_shot_threshold", 0.1)
        self.ratio_window = deque(maxlen=config.get("smoothing_window", 5))

    def setup(self):
        pass

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        frame_height, frame_width = frame.shape[:2]
        faces = frame_analysis.get("faces", [])
        shot_type = self.classify(frame_width, frame_height, faces)
        frame_analysis["shot_type"] = shot_type
        return frame_analysis

    def classify(self, frame_width: int, frame_height: int, faces: List[Dict]) -> str:
        if not faces:
            return "long-shot"

        frame_area = frame_width * frame_height

        total_face_area = sum(
            abs(r - l) * abs(b - t)
            for face in faces
            if (loc := face.get("location")) and len(loc) == 4
            for t, r, b, l in [loc]
        )

        ratio = total_face_area / frame_area if frame_area else 0.0
        self.ratio_window.append(ratio)
        smoothed_ratio = np.mean(self.ratio_window)

        if smoothed_ratio > self.CLOSE_UP_THRESHOLD:
            return "close-up"
        elif smoothed_ratio > self.MEDIUM_SHOT_THRESHOLD:
            return "medium-shot"
        return "long-shot"

    def get_results(self) -> Any:
        return None

    def get_summary(self) -> Any:
        return None
