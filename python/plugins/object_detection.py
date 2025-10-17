
import sys
from typing import List, Dict, Any
import numpy as np
import torch
from ultralytics import YOLO

from plugins.base import AnalyzerPlugin



class ObjectDetectionPlugin(AnalyzerPlugin):
    """
    A plugin for detecting objects in video frames using YOLO.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.yolo_model = None

    def setup(self):
        """
        Initializes the YOLO model.
        """
        self.yolo_model = YOLO(self.config['yolo_model'])
        self.yolo_model.to(self.config['device'])
        self.yolo_model.fuse()

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes a single frame for objects.

        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far for the current frame.
        :return: An updated dictionary with the analysis results from this plugin.
        """
        detections_results = self._run_object_detection([frame])
        frame_objects = []
        if detections_results:
            detections = detections_results[0]
            if detections.boxes:
                for det in detections.boxes:
                    label = self.yolo_model.names[int(det.cls[0])]
                    confidence = float(det.conf[0])
                    box = det.xyxy[0].tolist()

                    frame_objects.append({
                        "label": label,
                        "confidence": confidence,
                        "box": box
                    })
        frame_analysis['objects'] = frame_objects
        return frame_analysis

    def _run_object_detection(self, frames: List[Any]) -> List:
        """
        Run YOLO object detection on a batch of frames.
        """
        with torch.no_grad():
            return self.yolo_model.predict(
                frames,
                verbose=False,
                device=self.config['device'],
                conf=self.config['yolo_confidence'],
                iou=self.config['yolo_iou'],
                half=True
            )

    def get_results(self) -> Any:
        """
        Returns the final analysis results from the plugin.
        """
        return None

    def get_summary(self) -> Any:
        """
        Returns a summary of the analysis results.
        """
        return None
