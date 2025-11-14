from .base import AnalyzerPlugin
from typing import Dict, Any
import numpy as np
import logging


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

    def setup(self):
        """
        Initializes the EasyOCR reader. This is done once when the plugin is loaded.
        """
        if not EASYOCR_AVAILABLE:
            logger.warning("EasyOCR not installed. Text detection will be skipped. Please run: pip install easyocr")
            return

        try:
            # Initialize the reader for English. It will download the model on the first run.
            self.reader = easyocr.Reader(['en'], gpu=self.config.get('device') != 'cpu')
            logger.info("EasyOCR reader initialized for text detection.")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            self.reader = None

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Detects text in a single frame.

        :param frame: The frame to analyze (as a NumPy array).
        :param frame_analysis: Existing analysis for this frame.
        :return: Updated analysis dictionary with detected text.
        """
        # Check if reader is initialized
        if self.reader is None:
            return {}

        try:
            # Get scaling factor to convert back to original dimensions
            scale_factor = frame_analysis.get('scale_factor', 1.0)
            
            # EasyOCR expects images in RGB format
            frame_rgb = frame[:, :, ::-1]
            
            # Perform text detection and recognition
            results = self.reader.readtext(frame_rgb, detail=1)
            
            detected_texts = []
            for (bbox, text, prob) in results:
                # bbox is a list of 4 points [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                # representing the corners of the text region (usually a rotated rectangle)
                
                # Scale bounding box points to original dimensions
                scaled_bbox = [[int(p[0] * scale_factor), int(p[1] * scale_factor)] for p in bbox]
                
                # Calculate axis-aligned bounding box (x, y, width, height)
                x_coords = [p[0] for p in scaled_bbox]
                y_coords = [p[1] for p in scaled_bbox]
                
                x_min = min(x_coords)
                y_min = min(y_coords)
                x_max = max(x_coords)
                y_max = max(y_coords)
                
                width = x_max - x_min
                height = y_max - y_min
                
                detected_texts.append({
                    'text': text,
                    'confidence': float(prob),
                    'bounding_box': scaled_bbox, 
                    'bbox': {  
                        'x': x_min,
                        'y': y_min,
                        'width': width,
                        'height': height
                    }
                })

            
            if detected_texts:
                return {'detected_text': detected_texts}

        except Exception as e:
            logger.error(f"Error during text detection: {e}")

        return {}

    def get_results(self) -> Any:
        """
        This plugin does not aggregate scene-level results.
        """
        return None

    def get_summary(self) -> Any:
        """
        This plugin does not provide a summary.
        """
        return None