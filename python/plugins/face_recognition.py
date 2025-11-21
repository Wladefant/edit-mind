"""Face detection, recognition, and tracking plugin."""
import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

import cv2
import numpy as np

from face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin

logger = logging.getLogger(__name__)


class FaceRecognitionPlugin(AnalyzerPlugin):
    """Plugin for detecting and recognizing faces in video frames."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.face_recognizer = None
        self.all_faces: List[Dict] = []
        self.unknown_faces_output_path = None
        self.known_faces_file = config['known_faces_file']


    def setup(self) -> None:
        """Initialize face recognizer and load known faces."""
        logger.info("=" * 70)
        logger.info("FACE RECOGNITION PLUGIN SETUP")
        logger.info("=" * 70)
        
        logger.info(f"Loading known faces from: {self.known_faces_file}")
        
        if not os.path.exists(self.known_faces_file):
            with open(self.known_faces_file, 'w', encoding='utf-8') as f:
                json.dump([], f)
        else:
            self._log_file_metadata()
        
        self.face_recognizer = FaceRecognizer(
            known_faces_file=self.known_faces_file
        )
        
        self._log_loaded_faces()
        
        self.unknown_faces_output_path = Path(self.config['output_dir']) / self.config['unknown_faces_dir']
        self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Unknown faces directory: {self.unknown_faces_output_path}")
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
        
        face_counts = {}
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
        frame_analysis: Dict[str, Any], 
        video_path: str
    ) -> Dict[str, Any]:
        """Detect and recognize faces in frame."""
        if self.face_recognizer is None:
            logger.error("Face recognizer not initialized")
            frame_analysis['faces'] = []
            return frame_analysis
        
        recognized_faces = self.face_recognizer.recognize_faces(frame)
        scale_factor = frame_analysis.get('scale_factor', 1.0)

        output_faces = []
        for face in recognized_faces:
            top, right, bottom, left = face['location']
            x = left * scale_factor
            y = top * scale_factor
            width = (right - left) * scale_factor
            height = (bottom - top) * scale_factor
            output_face = {
                "name": face['name'],
                "location": [int(i) for i in face['location']],
                "emotion": face.get('emotion'),
                "confidence": face.get("confidence"),
                "encoding": (
                    face['encoding'].tolist() 
                    if isinstance(face['encoding'], np.ndarray) 
                    else face['encoding']
                ),
                "bbox": {
                        "x": x,
                        "y": y,
                        "width": width,
                        "height": height
                    }
            }
            output_faces.append(output_face)
            
            self.all_faces.append({
                "timestamp": frame_analysis['start_time_ms'] / 1000,
                "name": face['name'],
                "frame_idx": frame_analysis.get('frame_idx', 0)
            })

            if face['name'].startswith("Unknown_"):
                self._save_unknown_face(
                    frame,
                    frame_analysis['start_time_ms'],
                    frame_analysis.get('frame_idx', 0),
                    face,
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
        face: Dict,
        frame_analysis: Dict[str, Any],
        video_path: str
    ) -> None:
        """Crop and save unknown face with metadata."""
        h, w = frame.shape[:2]
        top, right, bottom, left = face['location']

        original_bbox = {
            'top': int(top),
            'right': int(right),
            'bottom': int(bottom),
            'left': int(left),
            'width': int(right - left),
            'height': int(bottom - top)
        }

        left = max(0, int(left))
        top = max(0, int(top))
        right = min(w, int(right))
        bottom = min(h, int(bottom))

        padding_w = int((right - left) * 0.1)
        padding_h = int((bottom - top) * 0.1)
        
        padded_left = max(0, left - padding_w)
        padded_top = max(0, top - padding_h)
        padded_right = min(w, right + padding_w)
        padded_bottom = min(h, bottom + padding_h)

        padded_bbox = {
            'top': int(padded_top),
            'right': int(padded_right),
            'bottom': int(padded_bottom),
            'left': int(padded_left),
            'width': int(padded_right - padded_left),
            'height': int(padded_bottom - padded_top)
        }

        face_image = frame[padded_top:padded_bottom, padded_left:padded_right]

        if face_image.size == 0:
            return

        base_filename = f"{face['name']}_{timestamp_ms}ms_frame{frame_idx}"
        image_filename = f"{base_filename}.jpg"
        json_filename = f"{base_filename}.json"
        
        image_filepath = self.unknown_faces_output_path / image_filename
        json_filepath = self.unknown_faces_output_path / json_filename
        
        try:
            cv2.imwrite(str(image_filepath), face_image)
            
            metadata = {
                "image_file": image_filename,
                "json_file": json_filename,
                "image_hash": hashlib.md5(face_image.tobytes()).hexdigest(),
                "created_at": datetime.now().isoformat(),
                "video_path": video_path,
                "video_name": Path(video_path).name if video_path else "unknown",
                "frame_index": int(frame_idx),
                "timestamp_ms": int(timestamp_ms),
                "timestamp_seconds": float(timestamp_ms / 1000),
                "formatted_timestamp": self._format_timestamp(timestamp_ms),
                "frame_dimensions": {"width": int(w), "height": int(h)},
                "face_id": face['name'],
                "bounding_box": original_bbox,
                "padded_bounding_box": padded_bbox,
                "face_center": {
                    "x": int((left + right) / 2),
                    "y": int((top + bottom) / 2)
                },
                "face_encoding": (
                    face['encoding'].tolist() 
                    if isinstance(face['encoding'], np.ndarray) 
                    else face['encoding']
                ),
                "frame_duration_ms": frame_analysis.get('duration_ms', 0),
                "context": {
                    "detected_objects": frame_analysis.get('objects', []),
                    "scene_type": frame_analysis.get('scene_type'),
                    "environment": frame_analysis.get('environment'),
                    "other_faces_in_frame": [
                        f['name'] for f in frame_analysis.get('faces', [])
                        if f['name'] != face['name']
                    ]
                },
                "label": {
                    "name": None,
                    "labeled_by": None,
                    "labeled_at": None,
                    "confidence": None,
                    "notes": None
                },
                "quality": {
                    "face_size_pixels": original_bbox['width'] * original_bbox['height'],
                    "face_coverage_percent": round(
                        (original_bbox['width'] * original_bbox['height']) / (w * h) * 100, 2
                    ),
                    "aspect_ratio": round(
                        original_bbox['width'] / original_bbox['height'], 2
                    ) if original_bbox['height'] > 0 else 0
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

    def get_results(self) -> List[Dict]:
        """Return all detected faces."""
        return self.all_faces

    def get_summary(self) -> Dict[str, Any]:
        """Return comprehensive face recognition summary."""
        known_people = list(set(
            face['name']
            for face in self.all_faces
            if not face['name'].startswith('Unknown_')
        ))

        unknown_count = sum(
            1 for face in self.all_faces
            if face['name'].startswith('Unknown_')
        )

        unique_unknown = len(set(
            face['name']
            for face in self.all_faces
            if face['name'].startswith('Unknown_')
        ))

        known_appearances = {}
        for person in known_people:
            appearances = [f for f in self.all_faces if f['name'] == person]
            known_appearances[person] = {
                'count': len(appearances),
                'first_seen': min(appearances, key=lambda x: x['timestamp'])['timestamp'],
                'last_seen': max(appearances, key=lambda x: x['timestamp'])['timestamp']
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
        
        if unknown_count > 0:
            logger.info(f"Unknown faces saved to: {self.unknown_faces_output_path}")
        
        logger.info("=" * 70 + "\n")

        return {
            "known_people_identified": known_people,
            "known_appearances": known_appearances,
            "unknown_faces_detected": unknown_count,
            "unique_unknown_faces": unique_unknown,
            "total_faces_detected": len(self.all_faces),
            "unknown_faces_directory": str(self.unknown_faces_output_path)
        }

    def reload_known_faces(self) -> None:
        """Reload known faces from JSON file (hot reload support)."""
        logger.info("Reloading known faces...")
        
        if self.face_recognizer:
            self.face_recognizer = FaceRecognizer(
                known_faces_file=self.known_faces_file
            )
            self._log_loaded_faces()
            logger.info("✓ Known faces reloaded successfully")
        else:
            logger.warning("Face recognizer not initialized")