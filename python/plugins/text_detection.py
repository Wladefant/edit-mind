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
            # EasyOCR expects images in RGB format
            frame_rgb = frame[:, :, ::-1]
            
            # Perform text detection and recognition
            results = self.reader.readtext(frame_rgb, detail=1)
            
            detected_texts = []
            for (bbox, text, prob) in results:
                # bbox is a list of 4 points (x, y)
                # Convert numpy types to native Python types for JSON serialization
                detected_texts.append({
                    'text': text,
                    'confidence': float(prob),
                    'bounding_box': [[int(p[0]), int(p[1])] for p in bbox]
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