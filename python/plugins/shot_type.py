# ============================================================================
# Shot Type Plugin 
# ============================================================================

from typing import List, Dict, Any
import numpy as np
from plugins.base import AnalyzerPlugin


class ShotTypePlugin(AnalyzerPlugin):
    """
    A plugin for classifying the shot type of video frames.
    Depends on face detection data from FaceRecognitionPlugin.
    """

    CLOSE_UP_THRESHOLD = 0.3
    MEDIUM_SHOT_THRESHOLD = 0.1

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

    def setup(self):
        """
        No setup required for this plugin.
        """
        pass

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes a single frame for shot type.
        
        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far.
        :return: An updated dictionary with shot type classification.
        """
        frame_height, frame_width = frame.shape[:2]
        
        # Safely get faces data - it might not exist yet
        faces = frame_analysis.get('faces', [])
        
        shot_type = self.classify(frame_width, frame_height, faces)
        frame_analysis['shot_type'] = shot_type
        
        return frame_analysis

    def classify(self, frame_width: int, frame_height: int, faces: List[Dict]) -> str:
        """
        Classify shot type based on the largest face.
        
        - close-up: Face takes up >30% of frame
        - medium-shot: Face takes up >10% of frame
        - long-shot: Face takes up <10% of frame or no faces
        """
        if not faces:
            return "long-shot"

        frame_area = frame_width * frame_height
        largest_face_area = 0
        
        for face in faces:
            # Face location format: (top, right, bottom, left)
            location = face.get('location')
            if not location or len(location) != 4:
                continue
                
            t, r, b, l = location
            face_area = abs(r - l) * abs(b - t)
            largest_face_area = max(largest_face_area, face_area)

        if largest_face_area == 0:
            return "long-shot"

        ratio = largest_face_area / frame_area

        if ratio > self.CLOSE_UP_THRESHOLD:
            return "close-up"
        elif ratio > self.MEDIUM_SHOT_THRESHOLD:
            return "medium-shot"
        
        return "long-shot"

    def get_results(self) -> Any:
        """
        This plugin doesn't produce scene-level results.
        """
        return None

    def get_summary(self) -> Any:
        """
        This plugin doesn't produce a summary.
        """
        return None

