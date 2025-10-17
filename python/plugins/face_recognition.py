import sys
import warnings
from typing import List, Dict, Any
import os
from pathlib import Path
import cv2

from face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin


import numpy as np

class FaceRecognitionPlugin(AnalyzerPlugin):
    """
    A plugin for detecting and recognizing faces in video frames.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.face_recognizer = None
        self.all_faces = []
        self.unknown_faces_output_path = None

    def setup(self):
        """
        Initializes the FaceRecognizer.
        """
        self.face_recognizer = FaceRecognizer(
            known_faces_file=self.config['known_faces_file']
        )
        # Setup unknown faces output directory
        self.unknown_faces_output_path = Path(self.config['output_dir']) / self.config['unknown_faces_dir']
        self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes a single frame for faces.

        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far for the current frame.
        :return: An updated dictionary with the analysis results from this plugin.
        """
        recognized_faces = self._recognize_faces(frame)

        output_faces = []
        for face in recognized_faces:
            output_face = {
                "name": face['name'],
                "location": [int(i) for i in face['location']],
                "emotion": face.get('emotion'),
                "encoding": face['encoding'] # Include encoding for potential re-embedding
            }
            output_faces.append(output_face)
            self.all_faces.append({"timestamp": frame_analysis['start_time_ms'] / 1000, "name": face['name']})

            # Save unknown faces
            # if face['name'].startswith("Unknown_"):
            #     self._crop_and_save_unknown_face(
            #         frame_analysis['frame'], # Use original frame for cropping
            #         frame.shape, # Resized frame shape
            #         frame_analysis['timestamp_ms'],
            #         frame_analysis['frame_idx'],
            #         face
            #     )

        frame_analysis['faces'] = output_faces
        return frame_analysis

    def _recognize_faces(self, frame: np.ndarray) -> List[Dict]:
        """
        Recognize faces in a frame.
        """
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return self.face_recognizer.recognize_faces(frame)

    def _crop_and_save_unknown_face(self, original_frame: np.ndarray, resized_frame_shape: tuple, timestamp_ms: int, frame_idx: int, face: Dict) -> None:
        """
        Crops and saves an unknown face from the original frame.
        """
        original_h, original_w = original_frame.shape[:2]
        resized_h, resized_w = resized_frame_shape[:2]

        top, right, bottom, left = face['location']

        scale_w = original_w / resized_w
        scale_h = original_h / resized_h

        orig_left = int(left * scale_w)
        orig_top = int(top * scale_h)
        orig_right = int(right * scale_w)
        orig_bottom = int(bottom * scale_h)

        orig_left = max(0, orig_left)
        orig_top = max(0, orig_top)
        orig_right = min(original_w, orig_right)
        orig_bottom = min(original_h, orig_bottom)

        face_image = original_frame[orig_top:orig_bottom, orig_left:orig_right]

        if face_image.size > 0:
            # Use the assigned unknown name for the filename
            filename = f"{face['name']}_{timestamp_ms}ms_frame{frame_idx}.jpg"
            filepath = self.unknown_faces_output_path / filename
            try:
                cv2.imwrite(str(filepath), face_image)
            except Exception as e:
                print(f"DEBUG: Error saving unknown face crop {filepath}: {e}", file=sys.stderr)

    def get_results(self) -> Any:
        """
        Returns the final analysis results from the plugin.
        """
        return self.all_faces

    def get_summary(self) -> Any:
        """
        Returns a summary of the analysis results.
        """
        known_people = list(set(
            face['name']
            for face in self.all_faces
            if not face['name'].startswith('Unknown_')
        ))

        unknown_count = sum(
            1 for face in self.all_faces
            if face['name'].startswith('Unknown_')
        )

        return {
            "known_people_identified": known_people,
            "unknown_faces_detected": unknown_count,
            "total_faces_detected": len(self.all_faces),
        }