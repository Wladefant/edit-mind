import warnings
from typing import Dict, Any
import numpy as np
import cv2

from plugins.base import AnalyzerPlugin

try:
    from fer import FER
    FER_AVAILABLE = True
except ImportError:
    FER_AVAILABLE = False
    print("Warning: FER (Facial Emotion Recognition) package not available")


class EmotionDetectionPlugin(AnalyzerPlugin):
    """
    A plugin for detecting emotions in faces.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.emotion_detector = None
        self.emotion_scale = config.get('emotion_scale', 0.5)  
        self.use_mtcnn = config.get('use_mtcnn', False)
        self.min_face_size = config.get('min_face_size', 30)  # Skip tiny faces
        self.iou_threshold = config.get('emotion_iou_threshold', 0.3)  # Lower threshold
        self.enabled = FER_AVAILABLE

    def setup(self):
        """
        Initializes the FER emotion detector.
        """
        if not FER_AVAILABLE:
            print("  ✗ Emotion Detection: FER package not available, skipping")
            self.enabled = False
            return
        
        try:
            # Use faster detector without MTCNN
            self.emotion_detector = FER(mtcnn=self.use_mtcnn)
            print(f"  ✓ Emotion Detection: FER initialized (MTCNN: {self.use_mtcnn}, Scale: {self.emotion_scale})")
        except Exception as e:
            print(f"  ✗ Emotion Detection: Failed to initialize FER: {e}")
            self.enabled = False

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Analyzes a single frame for emotions.

        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far for the current frame.
        :return: An updated dictionary with the analysis results from this plugin.
        """
        if not self.enabled or self.emotion_detector is None:
            return frame_analysis
            
        if 'faces' in frame_analysis and frame_analysis['faces']:
            self._add_emotions(frame, frame_analysis)
        return frame_analysis

    def _add_emotions(self, frame: np.ndarray, frame_analysis: Dict) -> None:
        """
        Add emotion data to recognized faces.
        """
        if not self.enabled or self.emotion_detector is None:
            return
            
        faces = frame_analysis.get('faces', [])
        if not faces:
            return

        # Filter out tiny faces for speed
        valid_faces = []
        for face in faces:
            if 'location' not in face:
                face['emotion'] = None
                continue
            
            ft, fr, fb, fl = face['location']
            face_width = fr - fl
            face_height = fb - ft
            
            if face_width < self.min_face_size or face_height < self.min_face_size:
                face['emotion'] = None
                continue
            
            valid_faces.append(face)

        if not valid_faces:
            return

        # Resize frame for faster emotion detection
        original_height, original_width = frame.shape[:2]
        
        if self.emotion_scale != 1.0:
            small_frame = cv2.resize(
                frame,
                (0, 0),
                fx=self.emotion_scale,
                fy=self.emotion_scale,
                interpolation=cv2.INTER_LINEAR
            )
        else:
            small_frame = frame

        # Detect emotions on smaller frame
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                emotions_results = self.emotion_detector.detect_emotions(small_frame)
            except Exception as e:
                # Silently handle errors and continue
                for face in faces:
                    face['emotion'] = None
                return

        if not emotions_results:
            for face in faces:
                face['emotion'] = None
            return

        # Match emotions to faces using IoU
        scale_inverse = 1.0 / self.emotion_scale
        
        for face in valid_faces:
            ft, fr, fb, fl = face['location']
            face_area = (fr - fl) * (fb - ft)

            best_match_emotion = None
            max_iou = 0.0

            for emotion_res in emotions_results:
                # Scale emotion box back to original frame coordinates
                el, et, ew, eh = emotion_res['box']
                
                if self.emotion_scale != 1.0:
                    el = int(el * scale_inverse)
                    et = int(et * scale_inverse)
                    ew = int(ew * scale_inverse)
                    eh = int(eh * scale_inverse)
                
                er = el + ew
                eb = et + eh
                emotion_area = ew * eh

                # Calculate IoU
                x_overlap = max(0, min(fr, er) - max(fl, el))
                y_overlap = max(0, min(fb, eb) - max(ft, et))
                intersection_area = x_overlap * y_overlap

                union_area = face_area + emotion_area - intersection_area
                iou = intersection_area / union_area if union_area > 0 else 0

                if iou > max_iou:
                    max_iou = iou
                    best_match_emotion = emotion_res['emotions']

            # Assign emotion if IoU is above threshold
            if max_iou > self.iou_threshold:
                face['emotion'] = best_match_emotion
            else:
                face['emotion'] = None

    def get_results(self) -> Any:
        return None

    def get_summary(self) -> Any:
        return None