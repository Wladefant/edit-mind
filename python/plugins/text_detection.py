from .base import AnalyzerPlugin
from typing import Dict, Any
import numpy as np
import logging
import cv2

logger = logging.getLogger(__name__)

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

class TextDetectionPlugin(AnalyzerPlugin):
    """
    Analyzes frames to detect and recognize text using EasyOCR.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.reader = None
        self.text_scale = config.get('text_scale', 0.5) 
        self.min_confidence = config.get('min_text_confidence', 0.3) 
        self.use_gpu = config.get('device') != 'cpu'

    def setup(self):
        """
        Initializes the EasyOCR reader. This is done once when the plugin is loaded.
        """
        if not EASYOCR_AVAILABLE:
            logger.warning("EasyOCR not installed. Text detection will be skipped. Please run: pip install easyocr")
            return

        try:
            # Initialize the reader for English
            self.reader = easyocr.Reader(
                ['en'], 
                gpu=self.use_gpu,
                verbose=False,  # Disable verbose logging
                download_enabled=True
            )
            logger.info(f"EasyOCR reader initialized (GPU: {self.use_gpu}, Scale: {self.text_scale})")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            self.reader = None

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Detects text in a single frame with optimizations.
        """
        if self.reader is None:
            return frame_analysis

        try:
            scale_factor = frame_analysis.get('scale_factor', 1.0)
            
            # Resize frame for faster OCR processing
            if self.text_scale != 1.0:
                small_frame = cv2.resize(
                    frame, 
                    (0, 0), 
                    fx=self.text_scale, 
                    fy=self.text_scale,
                    interpolation=cv2.INTER_LINEAR
                )
            else:
                small_frame = frame
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            # Perform text detection 
            results = self.reader.readtext(
                frame_rgb,
                detail=1,
                paragraph=False,  # Disable paragraph grouping for speed
                min_size=10,  # Ignore very small text
                text_threshold=self.min_confidence,  # Filter low confidence
                low_text=self.min_confidence,
                link_threshold=0.4,
                canvas_size=2560, 
                mag_ratio=1.0  # Disable magnification for speed
            )
            
            if not results:
                frame_analysis['detected_text'] = []
                return frame_analysis
            
            detected_texts = []
            scale_inverse = 1.0 / self.text_scale
            
            for (bbox, text, prob) in results:
                # Filter low confidence detections
                if prob < self.min_confidence:
                    continue
                
                # Scale bbox back to original frame size, then to video dimensions
                scaled_bbox = [
                    [int(p[0] * scale_inverse * scale_factor), 
                     int(p[1] * scale_inverse * scale_factor)] 
                    for p in bbox
                ]
                
                # Calculate axis-aligned bounding box
                x_coords = [p[0] for p in scaled_bbox]
                y_coords = [p[1] for p in scaled_bbox]
                
                x_min = min(x_coords)
                y_min = min(y_coords)
                x_max = max(x_coords)
                y_max = max(y_coords)
                
                detected_texts.append({
                    'text': text,
                    'confidence': float(prob),
                    'bounding_box': scaled_bbox, 
                    'bbox': {  
                        'x': x_min,
                        'y': y_min,
                        'width': x_max - x_min,
                        'height': y_max - y_min
                    }
                })
            
            frame_analysis['detected_text'] = detected_texts

        except Exception as e:
            logger.error(f"Error during text detection: {e}")
            frame_analysis['detected_text'] = []

        return frame_analysis

    def get_results(self) -> Any:
        return None

    def get_summary(self) -> Any:
        return None