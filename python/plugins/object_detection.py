from typing import List, Dict, Any
import numpy as np
import torch
from ultralytics import YOLO

from plugins.base import AnalyzerPlugin
import logging

logger = logging.getLogger(__name__)


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
        
        requested_device = self.config['device']
        if "cuda" in requested_device.lower() and not torch.cuda.is_available():
            logger.warning(f"Requested device '{requested_device}' not available. Falling back to CPU.")
            self.config['device'] = 'cpu'
        
        self.yolo_model.to(self.config['device'])
        self.yolo_model.fuse()

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        detections_results = self._run_object_detection([frame])
        
        scale_factor = frame_analysis.get('scale_factor', 1.0)
        
        frame_objects = []
        if detections_results:
            detections = detections_results[0]
            if detections.boxes:
                for det in detections.boxes:
                    label = self.yolo_model.names[int(det.cls[0])]
                    confidence = float(det.conf[0])
                    
                    # YOLO returns boxes in xyxy format: [x1, y1, x2, y2]
                    x1, y1, x2, y2 = det.xyxy[0].tolist()
                    
                    # Scale back to original video dimensions
                    x1_orig = x1 * scale_factor
                    y1_orig = y1 * scale_factor
                    x2_orig = x2 * scale_factor
                    y2_orig = y2 * scale_factor
                    
                    # Convert to (x, y, width, height) in original dimensions
                    x = x1_orig
                    y = y1_orig
                    width = x2_orig - x1_orig
                    height = y2_orig - y1_orig
                    if width < 20 or height < 20:
                        continue  # ignore tiny detections

                    frame_objects.append({
                        "label": label,
                        "confidence": confidence,
                        "bbox": {
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height
                        }
                    })
        frame_analysis['objects'] = frame_objects
        return frame_analysis

    def _run_object_detection(self, frames: List[Any]) -> List:
        """
        Run YOLO object detection on a batch of frames.
        """
        device = self.config['device']
        use_half = torch.cuda.is_available() and "cuda" in device.lower()

        with torch.no_grad():
            return self.yolo_model.predict(
                frames,
                verbose=False,
                device=device,
                conf=self.config['yolo_confidence'],
                iou=self.config['yolo_iou'],
                half=use_half,
                augment=True,
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