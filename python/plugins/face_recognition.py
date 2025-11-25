"""Face detection, recognition, and tracking plugin."""
import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union
from datetime import datetime

import cv2
import numpy as np
from dotenv import load_dotenv

from face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult

load_dotenv()

logger = logging.getLogger(__name__)


class FaceRecognitionPlugin(AnalyzerPlugin):
    """Plugin for detecting and recognizing faces in video frames."""

    def __init__(self, config: Dict[str, Union[str, bool, int, float]]):
        super().__init__(config)
        self.face_recognizer: Optional[FaceRecognizer] = None
        self.all_faces: List[Dict[str, Union[float, str, int]]] = []
        self.unknown_faces_output_path: Optional[Path] = None
        self.known_faces_file = os.getenv("KNOWN_FACES_FILE_LOADED", ".known_faces.json")
        
        self.detection_model = str(config.get('detection_model', 'hog'))
        self.face_scale = float(config.get('face_scale', 0.5))
        self.save_unknown_faces = bool(config.get('save_unknown_faces', True))
        self.unknown_save_interval = int(config.get('unknown_save_interval', 5))

    def setup(self) -> None:
        """Initialize face recognizer and load known faces."""
        logger.info("=" * 70)
        logger.info("FACE RECOGNITION PLUGIN SETUP")
        logger.info("=" * 70)
        
        logger.info(f"Detection model: {self.detection_model} (HOG=fast, CNN=accurate)")
        logger.info(f"Processing scale: {self.face_scale*100}%")
        logger.info(f"Loading known faces from: {self.known_faces_file}")
        
        if not os.path.exists(self.known_faces_file):
            with open(self.known_faces_file, 'w', encoding='utf-8') as f:
                json.dump([], f)
        else:
            self._log_file_metadata()
        
        self.face_recognizer = FaceRecognizer(
            known_faces_file=self.known_faces_file,
            model=self.detection_model
        )
        
        self._log_loaded_faces()
        
        if self.save_unknown_faces:
            path_str = os.getenv("UNKNOWN_FACES_DIR", str(self.config.get('unknown_faces_dir', 'unknown_faces')))
            self.unknown_faces_output_path = Path(path_str)
            self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Unknown faces directory: {self.unknown_faces_output_path}")
            logger.info(f"Saving every {self.unknown_save_interval}th unknown face detection")
        
        logger.info("=" * 70 + "\n")

    def _log_file_metadata(self) -> None:
        """Log known faces file metadata."""
        file_stat = os.stat(self.known_faces_file)
        import time
        modified_str = time.strftime(
            '%Y-%m-%d %H:%M:%S', 
            time.localtime(file_stat.st_mtime)
        )
        
        logger.info(f"File size: {file_stat.st_size} bytes")
        logger.info(f"Last modified: {modified_str}")
        
        try:
            with open(self.known_faces_file, 'r') as f:
                known_faces_data = json.load(f)
                logger.info(f"JSON structure: {len(known_faces_data)} entries")
        except Exception as e:
            logger.error(f"Error reading known faces file: {e}")

    def _log_loaded_faces(self) -> None:
        """Log detailed information about loaded known faces."""
        if not hasattr(self.face_recognizer, 'known_face_encodings') or \
           not hasattr(self.face_recognizer, 'known_face_names'):
            logger.warning("Face recognizer not properly initialized")
            return
        
        known_encodings = self.face_recognizer.known_face_encodings
        known_names = self.face_recognizer.known_face_names
        
        if not known_encodings or not known_names:
            logger.warning("No known faces loaded!")
            return
        
        face_counts: Dict[str, int] = {}
        for name in known_names:
            face_counts[name] = face_counts.get(name, 0) + 1
        
        total_encodings = len(known_encodings)
        total_people = len(face_counts)
        
        logger.info(
            f"✓ Loaded {total_encodings} encoding(s) for {total_people} person/people"
        )
        logger.info("")
        logger.info("Loaded faces breakdown:")
        logger.info("-" * 50)
        
        sorted_faces = sorted(face_counts.items(), key=lambda x: x[1], reverse=True)
        
        for name, count in sorted_faces:
            plural = "image" if count == 1 else "images"
            logger.info(f"  • {name}: {count} {plural}")
        
        logger.info("-" * 50)
        logger.info(f"Total: {total_people} unique face(s), {total_encodings} encoding(s)")
        logger.info("")

    def analyze_frame(
        self, 
        frame: np.ndarray, 
        frame_analysis: FrameAnalysis, 
        video_path: str
    ) -> FrameAnalysis:
        """Detect and recognize faces in frame."""
        if self.face_recognizer is None:
            logger.error("Face recognizer not initialized")
            frame_analysis['faces'] = []
            return frame_analysis
        
        original_height, original_width = frame.shape[:2]
        
        small_frame = cv2.resize(
            frame, 
            (0, 0), 
            fx=self.face_scale, 
            fy=self.face_scale,
            interpolation=cv2.INTER_LINEAR
        )
        
        recognized_faces = self.face_recognizer.recognize_faces(small_frame)
        
        frame_scale_inverse = 1.0 / self.face_scale
        ui_scale = float(frame_analysis.get('scale_factor', 1.0))
        output_faces = []
        
        for face in recognized_faces:
            top, right, bottom, left = face['location']

            top = int(round(top * frame_scale_inverse))
            right = int(round(right * frame_scale_inverse))
            bottom = int(round(bottom * frame_scale_inverse))
            left = int(round(left * frame_scale_inverse))

            left = max(0, min(left, original_width - 1))
            top = max(0, min(top, original_height - 1))
            right = max(0, min(right, original_width))
            bottom = max(0, min(bottom, original_height))
            
            abs_x = left
            abs_y = top
            abs_w = right - left
            abs_h = bottom - top

            ui_x = abs_x * ui_scale
            ui_y = abs_y * ui_scale
            ui_w = abs_w * ui_scale
            ui_h = abs_h * ui_scale
                
            output_face: Dict[str, Union[str, List[int], Optional[Dict[str, float]], float, List[float], Dict[str, float], Dict[str, int]]] = {
                "name": face['name'],
                "location": [top, right, bottom, left],
                "emotion": face.get('emotion'),
                "confidence": face.get("confidence"),
                "encoding": (
                    face['encoding'].tolist() 
                    if isinstance(face['encoding'], np.ndarray) 
                    else face['encoding']
                ),
                "bbox": {
                    "x": ui_x,
                    "y": ui_y,
                    "width": ui_w,
                    "height": ui_h
                },
                "frame_dimensions": {
                    "width": original_width,
                    "height": original_height
                }
            }
            output_faces.append(output_face)
            
            self.all_faces.append({
                "timestamp": frame_analysis['start_time_ms'] / 1000,
                "name": face['name'],
                "frame_idx": frame_analysis.get('frame_idx', 0)
            })

            if face['name'].startswith("Unknown_") and self.save_unknown_faces:
                unknown_id = face['name'].split('_')[1] if '_' in face['name'] else '0'
                unknown_num = int(unknown_id) if unknown_id.isdigit() else 0
                
                if unknown_num % self.unknown_save_interval == 0:
                    face_original = face.copy()
                    face_original['location'] = [top, right, bottom, left]
                    
                    self._save_unknown_face(
                        frame,
                        int(frame_analysis['start_time_ms']),
                        int(frame_analysis.get('frame_idx', 0)),
                        face_original,
                        frame_analysis,
                        video_path
                    )

        frame_analysis['faces'] = output_faces
        return frame_analysis

    def _save_unknown_face(
        self,
        frame: np.ndarray,
        timestamp_ms: int,
        frame_idx: int,
        face: Dict[str, Union[str, List[int], np.ndarray, List[float]]],
        frame_analysis: FrameAnalysis,
        video_path: str
    ) -> None:
        """Crop and save unknown face with metadata."""
        h, w = frame.shape[:2]
        location = face['location']
        if not isinstance(location, list) or len(location) != 4:
            return
            
        top, right, bottom, left = location

        left = max(0, int(left))
        top = max(0, int(top))
        right = min(w, int(right))
        bottom = min(h, int(bottom))

        original_bbox = {
            'top': top,
            'right': right,
            'bottom': bottom,
            'left': left,
            'width': right - left,
            'height': bottom - top
        }

        padding_w = int((right - left) * 0.1)
        padding_h = int((bottom - top) * 0.1)
        
        padded_left = max(0, left - padding_w)
        padded_top = max(0, top - padding_h)
        padded_right = min(w, right + padding_w)
        padded_bottom = min(h, bottom + padding_h)

        padded_bbox = {
            'top': padded_top,
            'right': padded_right,
            'bottom': padded_bottom,
            'left': padded_left,
            'width': padded_right - padded_left,
            'height': padded_bottom - padded_top
        }

        face_image = frame[padded_top:padded_bottom, padded_left:padded_right]

        if face_image.size == 0:
            return

        base_filename = f"{face['name']}_{timestamp_ms}ms_frame{frame_idx}"
        image_filename = f"{base_filename}.jpg"
        json_filename = f"{base_filename}.json"
        
        if self.unknown_faces_output_path is None:
            return
            
        image_filepath = self.unknown_faces_output_path / image_filename
        json_filepath = self.unknown_faces_output_path / json_filename
        
        try:
            self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
            
            cv2.imwrite(
                str(image_filepath), 
                face_image,
                [cv2.IMWRITE_JPEG_QUALITY, 85]
            )
            
            encoding = face['encoding']
            encoding_list = encoding.tolist() if isinstance(encoding, np.ndarray) else encoding
            
            metadata = {
                "image_file": image_filename,
                "json_file": json_filename,
                "image_hash": hashlib.md5(face_image.tobytes()).hexdigest(),
                "created_at": datetime.now().isoformat(),
                "video_path": video_path,
                "video_name": Path(video_path).name if video_path else "unknown",
                "frame_index": frame_idx,
                "timestamp_ms": timestamp_ms,
                "timestamp_seconds": timestamp_ms / 1000,
                "formatted_timestamp": self._format_timestamp(timestamp_ms),
                "frame_dimensions": {"width": w, "height": h},
                "face_id": face['name'],
                "bounding_box": original_bbox,
                "padded_bounding_box": padded_bbox,
                "face_encoding": encoding_list,
                "label": {
                    "name": None,
                    "labeled_by": None,
                    "labeled_at": None,
                    "confidence": None,
                    "notes": None
                }
            }
            
            with open(json_filepath, 'w', encoding='utf-8') as json_file:
                json.dump(metadata, json_file, indent=2, ensure_ascii=False)
            
            logger.debug(f"Saved unknown face: {image_filename}")
            
        except Exception as e:
            logger.error(f"Error saving unknown face {image_filepath}: {e}")
            
    @staticmethod
    def _format_timestamp(timestamp_ms: int) -> str:
        """Format timestamp in HH:MM:SS.mmm format."""
        total_seconds = timestamp_ms / 1000
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = int(total_seconds % 60)
        milliseconds = int(timestamp_ms % 1000)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

    def get_results(self) -> PluginResult:
        """Return all detected faces."""
        return self.all_faces

    def get_summary(self) -> PluginResult:
        """Return comprehensive face recognition summary."""
        known_people = list(set(
            face['name']
            for face in self.all_faces
            if isinstance(face.get('name'), str) and not face['name'].startswith('Unknown_')
        ))

        unknown_count = sum(
            1 for face in self.all_faces
            if isinstance(face.get('name'), str) and face['name'].startswith('Unknown_')
        )

        unique_unknown = len(set(
            face['name']
            for face in self.all_faces
            if isinstance(face.get('name'), str) and face['name'].startswith('Unknown_')
        ))

        known_appearances: Dict[str, Dict[str, Union[int, float]]] = {}
        for person in known_people:
            appearances = [f for f in self.all_faces if f.get('name') == person]
            if appearances:
                timestamps = [float(f['timestamp']) for f in appearances if isinstance(f.get('timestamp'), (int, float))]
                known_appearances[person] = {
                    'count': len(appearances),
                    'first_seen': min(timestamps) if timestamps else 0.0,
                    'last_seen': max(timestamps) if timestamps else 0.0
                }

        logger.info("\n" + "=" * 70)
        logger.info("FACE RECOGNITION SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total faces detected: {len(self.all_faces)}")
        logger.info(f"Known people identified: {len(known_people)}")
        
        if known_people:
            logger.info("")
            logger.info("Known people appearances:")
            for person in sorted(known_people):
                info = known_appearances[person]
                logger.info(f"  • {person}:")
                logger.info(f"      Appearances: {info['count']}")
                logger.info(f"      First seen: {info['first_seen']:.1f}s")
                logger.info(f"      Last seen: {info['last_seen']:.1f}s")
        
        logger.info("")
        logger.info(f"Unknown faces: {unknown_count} ({unique_unknown} unique)")
        
        if unknown_count > 0 and self.save_unknown_faces:
            logger.info(f"Unknown faces saved to: {self.unknown_faces_output_path}")
        
        logger.info("=" * 70 + "\n")

        return {
            "known_people_identified": known_people,
            "known_appearances": known_appearances,
            "unknown_faces_detected": unknown_count,
            "unique_unknown_faces": unique_unknown,
            "total_faces_detected": len(self.all_faces),
            "unknown_faces_directory": str(self.unknown_faces_output_path) if self.save_unknown_faces else None
        }