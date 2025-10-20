import sys
import warnings
from typing import List, Dict, Any
import os
from pathlib import Path
import cv2
import logging
import json
import hashlib

from face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin


import numpy as np

logger = logging.getLogger(__name__)


class FaceRecognitionPlugin(AnalyzerPlugin):
    """
    A plugin for detecting and recognizing faces in video frames.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.face_recognizer = None
        self.all_faces = []
        self.unknown_faces_output_path = None
        self.known_faces_file = config['known_faces_file']
        self.current_video_path = None

    def setup(self):
        """
        Initializes the FaceRecognizer and logs loaded faces.
        Always reloads the known faces file from disk.
        """
        logger.info("=" * 70)
        logger.info("FACE RECOGNITION PLUGIN SETUP")
        logger.info("=" * 70)
        
        # Force reload of known faces file
        logger.info(f"Reloading known faces from: {self.known_faces_file}")
        
        # Check if file exists
        if not os.path.exists(self.known_faces_file):
            logger.warning(f"Known faces file not found: {self.known_faces_file}")
            logger.warning("Face recognition will only detect unknown faces")
            logger.info("=" * 70 + "\n")
        else:
            # Log file metadata
            file_stat = os.stat(self.known_faces_file)
            file_size = file_stat.st_size
            modified_time = file_stat.st_mtime
            
            import time
            modified_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(modified_time))
            
            logger.info(f"File size: {file_size} bytes")
            logger.info(f"Last modified: {modified_str}")
            
            # Preview the JSON structure
            try:
                with open(self.known_faces_file, 'r') as f:
                    known_faces_data = json.load(f)
                    logger.info(f"JSON structure: {len(known_faces_data)} entries")
            except Exception as e:
                logger.error(f"Error reading known faces file: {e}")
        
        # Create new FaceRecognizer instance (forces reload)
        self.face_recognizer = FaceRecognizer(
            known_faces_file=self.known_faces_file
        )
        
        # Log loaded faces information
        self._log_loaded_faces()
        
        # Setup unknown faces output directory
        self.unknown_faces_output_path = Path(self.config['output_dir']) / self.config['unknown_faces_dir']
        self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Unknown faces will be saved to: {self.unknown_faces_output_path}")
        logger.info("=" * 70 + "\n")

    def _log_loaded_faces(self):
        """
        Logs detailed information about loaded known faces.
        """
        if not hasattr(self.face_recognizer, 'known_face_encodings') or \
           not hasattr(self.face_recognizer, 'known_face_names'):
            logger.warning("Face recognizer not properly initialized")
            return
        
        known_encodings = self.face_recognizer.known_face_encodings
        known_names = self.face_recognizer.known_face_names
        
        if not known_encodings or not known_names:
            logger.warning("No known faces loaded!")
            logger.info("  To add known faces, create a JSON file with face encodings")
            logger.info("  Example format:")
            logger.info('    [')
            logger.info('      {')
            logger.info('        "name": "John Doe",')
            logger.info('        "encoding": [0.123, -0.456, ...]')
            logger.info('      }')
            logger.info('    ]')
            return
        
        # Count faces per person
        face_counts = {}
        for name in known_names:
            face_counts[name] = face_counts.get(name, 0) + 1
        
        # Log summary
        total_encodings = len(known_encodings)
        total_people = len(face_counts)
        
        logger.info(f"✓ Successfully loaded {total_encodings} face encoding(s) for {total_people} person/people")
        logger.info("")
        logger.info("Loaded faces breakdown:")
        logger.info("-" * 50)
        
        # Sort by number of images (descending)
        sorted_faces = sorted(face_counts.items(), key=lambda x: x[1], reverse=True)
        
        for name, count in sorted_faces:
            plural = "image" if count == 1 else "images"
            logger.info(f"  • {name}: {count} {plural}")
        
        logger.info("-" * 50)
        logger.info(f"Total: {total_people} unique face(s), {total_encodings} encoding(s)")
        logger.info("")
        
        # Log recognition settings
        if hasattr(self.face_recognizer, 'tolerance'):
            tolerance = self.face_recognizer.tolerance
            logger.info(f"Face recognition tolerance: {tolerance}")
            if tolerance < 0.5:
                logger.info("  (Very strict - fewer false positives)")
            elif tolerance > 0.7:
                logger.info("  (Very loose - more false positives)")
            else:
                logger.info("  (Balanced)")
                
        if hasattr(self.face_recognizer, 'model'):
            model = self.face_recognizer.model
            logger.info(f"Face detection model: {model}")
            if model == 'hog':
                logger.info("  (Faster, CPU-friendly)")
            elif model == 'cnn':
                logger.info("  (More accurate, GPU-recommended)")

    def set_video_path(self, video_path: str):
        """
        Set the current video path for metadata tracking.
        Should be called before analysis starts.
        """
        self.current_video_path = video_path

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
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
                "encoding": face['encoding'].tolist() if isinstance(face['encoding'], np.ndarray) else face['encoding']  # Convert to list for JSON serialization
            }
            output_faces.append(output_face)
            self.all_faces.append({
                "timestamp": frame_analysis['start_time_ms'] / 1000, 
                "name": face['name'],
                "frame_idx": frame_analysis.get('frame_idx', 0)
            })

            # Save unknown faces with metadata
            if face['name'].startswith("Unknown_"):
                self._crop_and_save_unknown_face(
                    frame,  # Use the frame being analyzed
                    frame.shape,  # Frame shape
                    frame_analysis['start_time_ms'],
                    frame_analysis.get('frame_idx', 0),
                    face,
                    frame_analysis,
                    video_path
                )

        frame_analysis['faces'] = output_faces
        return frame_analysis

    def _recognize_faces(self, frame: np.ndarray) -> List[Dict]:
        """
        Recognize faces in a frame.
        """
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return self.face_recognizer.recognize_faces(frame)

    def _crop_and_save_unknown_face(
        self, 
        frame: np.ndarray, 
        frame_shape: tuple, 
        timestamp_ms: int, 
        frame_idx: int, 
        face: Dict,
        frame_analysis: Dict[str, Any],
        video_path: str
    ) -> None:
        """
        Crops and saves an unknown face from the frame with accompanying JSON metadata.
        """
        h, w = frame_shape[:2]
        top, right, bottom, left = face['location']

        # Store original bounding box (before padding)
        original_bbox = {
            'top': int(top),
            'right': int(right),
            'bottom': int(bottom),
            'left': int(left),
            'width': int(right - left),
            'height': int(bottom - top)
        }

        # Ensure coordinates are within frame bounds
        left = max(0, int(left))
        top = max(0, int(top))
        right = min(w, int(right))
        bottom = min(h, int(bottom))

        # Add padding around face (10% on each side)
        padding_w = int((right - left) * 0.1)
        padding_h = int((bottom - top) * 0.1)
        
        padded_left = max(0, left - padding_w)
        padded_top = max(0, top - padding_h)
        padded_right = min(w, right + padding_w)
        padded_bottom = min(h, bottom + padding_h)

        # Store padded bounding box
        padded_bbox = {
            'top': int(padded_top),
            'right': int(padded_right),
            'bottom': int(padded_bottom),
            'left': int(padded_left),
            'width': int(padded_right - padded_left),
            'height': int(padded_bottom - padded_top)
        }

        face_image = frame[padded_top:padded_bottom, padded_left:padded_right]

        if face_image.size > 0:
            # Use the assigned unknown name for the filename
            base_filename = f"{face['name']}_{timestamp_ms}ms_frame{frame_idx}"
            image_filename = f"{base_filename}.jpg"
            json_filename = f"{base_filename}.json"
            
            image_filepath = self.unknown_faces_output_path / image_filename
            json_filepath = self.unknown_faces_output_path / json_filename
            
            try:
                # Save the face image
                cv2.imwrite(str(image_filepath), face_image)
                
                # Calculate image hash for deduplication
                image_hash = hashlib.md5(face_image.tobytes()).hexdigest()
                
                # Create comprehensive metadata
                metadata = {
                    # File information
                    "image_file": image_filename,
                    "json_file": json_filename,
                    "image_hash": image_hash,
                    "created_at": self._get_timestamp_iso(),
                    
                    # Video information
                    "video_path": video_path,
                    "video_name": Path(video_path).name if video_path else "unknown",
                    
                    # Frame information
                    "frame_index": int(frame_idx),
                    "timestamp_ms": int(timestamp_ms),
                    "timestamp_seconds": float(timestamp_ms / 1000),
                    "formatted_timestamp": self._format_timestamp(timestamp_ms),
                    
                    # Frame properties
                    "frame_dimensions": {
                        "width": int(w),
                        "height": int(h)
                    },
                    
                    # Face detection information
                    "face_id": face['name'],
                    "bounding_box": original_bbox,
                    "padded_bounding_box": padded_bbox,
                    "face_center": {
                        "x": int((left + right) / 2),
                        "y": int((top + bottom) / 2)
                    },
                    
                    # Face encoding (128-dimensional vector)
                    "face_encoding": face['encoding'].tolist() if isinstance(face['encoding'], np.ndarray) else face['encoding'],
                    
                    # Additional metadata from frame analysis
                    "frame_duration_ms": frame_analysis.get('duration_ms', 0),
                    "frame_start_time_ms": frame_analysis.get('start_time_ms', timestamp_ms),
                    "frame_end_time_ms": frame_analysis.get('end_time_ms', timestamp_ms),
                    
                    # Context information (if available)
                    "context": {
                        "detected_objects": frame_analysis.get('objects', []),
                        "scene_type": frame_analysis.get('scene_type'),
                        "environment": frame_analysis.get('environment'),
                        "other_faces_in_frame": [
                            f['name'] for f in frame_analysis.get('faces', []) 
                            if f['name'] != face['name']
                        ]
                    },
                    
                    # Labeling metadata (to be filled in later)
                    "label": {
                        "name": None,
                        "labeled_by": None,
                        "labeled_at": None,
                        "confidence": None,
                        "notes": None
                    },
                    
                    # Quality metrics
                    "quality": {
                        "face_size_pixels": original_bbox['width'] * original_bbox['height'],
                        "face_coverage_percent": round(
                            (original_bbox['width'] * original_bbox['height']) / (w * h) * 100, 2
                        ),
                        "aspect_ratio": round(original_bbox['width'] / original_bbox['height'], 2) if original_bbox['height'] > 0 else 0
                    }
                }
                
                # Save JSON metadata
                with open(json_filepath, 'w', encoding='utf-8') as json_file:
                    json.dump(metadata, json_file, indent=2, ensure_ascii=False)
                
                logger.debug(f"Saved unknown face: {image_filename} with metadata")
                
            except Exception as e:
                logger.error(f"Error saving unknown face {image_filepath}: {e}")
                import traceback
                traceback.print_exc()

    def _get_timestamp_iso(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()

    def _format_timestamp(self, timestamp_ms: int) -> str:
        """Format timestamp in HH:MM:SS.mmm format"""
        total_seconds = timestamp_ms / 1000
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = int(total_seconds % 60)
        milliseconds = int(timestamp_ms % 1000)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

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

        # Count unique unknown faces
        unique_unknown = len(set(
            face['name']
            for face in self.all_faces
            if face['name'].startswith('Unknown_')
        ))

        # Create appearance timeline for known faces
        known_appearances = {}
        for person in known_people:
            appearances = [
                f for f in self.all_faces 
                if f['name'] == person
            ]
            known_appearances[person] = {
                'count': len(appearances),
                'first_seen': min(appearances, key=lambda x: x['timestamp'])['timestamp'],
                'last_seen': max(appearances, key=lambda x: x['timestamp'])['timestamp']
            }

        # Log final summary
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
        logger.info(f"Unknown faces detected: {unknown_count} ({unique_unknown} unique)")
        
        if unknown_count > 0:
            logger.info(f"Unknown face images saved to: {self.unknown_faces_output_path}")
            logger.info(f"  - Images: {unknown_count} JPG files")
            logger.info(f"  - Metadata: {unknown_count} JSON files")
        
        logger.info("=" * 70 + "\n")

        return {
            "known_people_identified": known_people,
            "known_appearances": known_appearances,
            "unknown_faces_detected": unknown_count,
            "unique_unknown_faces": unique_unknown,
            "total_faces_detected": len(self.all_faces),
            "unknown_faces_directory": str(self.unknown_faces_output_path)
        }

    def reload_known_faces(self):
        """
        Manually reload known faces from the JSON file.
        Useful for updating faces without restarting the entire analysis.
        """
        logger.info("Manually reloading known faces...")
        
        if self.face_recognizer:
            # Create a new FaceRecognizer instance to force reload
            self.face_recognizer = FaceRecognizer(
                known_faces_file=self.known_faces_file
            )
            self._log_loaded_faces()
            logger.info("✓ Known faces reloaded successfully")
        else:
            logger.warning("Face recognizer not initialized")