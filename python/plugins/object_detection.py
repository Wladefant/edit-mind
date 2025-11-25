from typing import List, Dict, Optional, Union, Literal
import numpy as np
import torch
from ultralytics import YOLO

from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
import logging

logger = logging.getLogger(__name__)


class ObjectDetectionPlugin(AnalyzerPlugin):
    """A plugin for detecting objects in video frames using YOLO."""

    def __init__(self, config: Dict[str, Union[str, bool, int, float]]):
        super().__init__(config)
        self.yolo_model: Optional[YOLO] = None
        self.use_half = False
        
        device: str = 'auto'
        if 'device' in self.config and self.config['device']:
            requested_device = self.config['device']
            if requested_device != 'auto':
                device = str(requested_device)
                logger.info(f"Using configured device: {device}")
        
        self.config['device'] = device
        
    def setup(self) -> None:
        """Initialize the YOLO model."""
        model_path = str(self.config.get('yolo_model', 'yolov8n.pt'))
        self.yolo_model = YOLO(model_path)
        
        requested_device = str(self.config['device'])
        if "cuda" in requested_device.lower() and not torch.cuda.is_available():
            logger.warning(f"Requested device '{requested_device}' not available. Falling back to CPU.")
            self.config['device'] = 'cpu'
        
        self.yolo_model.to(self.config['device'])
        self.yolo_model.fuse()

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        detections_results = self._run_object_detection([frame])
        
        scale_factor = float(frame_analysis.get('scale_factor', 1.0))
        
        frame_objects: List[Dict[str, Union[str, float, Dict[str, float]]]] = []
        if detections_results and self.yolo_model is not None:
            detections = detections_results[0]
            if detections.boxes:
                for det in detections.boxes:
                    label = self.yolo_model.names[int(det.cls[0])]
                    confidence = float(det.conf[0])
                    
                    x1, y1, x2, y2 = det.xyxy[0].tolist()
                    
                    x1_orig = x1 * scale_factor
                    y1_orig = y1 * scale_factor
                    x2_orig = x2 * scale_factor
                    y2_orig = y2 * scale_factor
                    
                    x = x1_orig
                    y = y1_orig
                    width = x2_orig - x1_orig
                    height = y2_orig - y1_orig
                    
                    if width < 20 or height < 20:
                        continue

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

    def _run_object_detection(self, frames: List[np.ndarray]) -> List:
        """Run YOLO object detection on a batch of frames."""
        if self.yolo_model is None:
            return []
            
        device = str(self.config['device'])
        is_mps = self.config['device'] == 'mps'
        batch_size = 4 if is_mps else 1
        imgsz = 640 if is_mps else 320
        
        confidence = float(self.config.get('yolo_confidence', 0.5))
        iou = float(self.config.get('yolo_iou', 0.5))
        
        with torch.no_grad():
            return self.yolo_model.predict(
                frames,
                verbose=False,
                device=device,
                conf=confidence,
                iou=iou,
                half=self.use_half,
                augment=False,
                imgsz=imgsz,
                batch=batch_size,
            )

    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None