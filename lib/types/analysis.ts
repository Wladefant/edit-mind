export interface Face {
  name: string;
  location: [number, number, number, number];
  emotion?: Record<string, number>;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  box: [number, number, number, number]; 
}

export interface FrameAnalysis {
  timestamp_seconds: number;
  objects: DetectedObject[];
  faces: Face[];
  start_time_ms: number;
  end_time_ms: number;
  scene_description: string;
  shot_type: string;
}

export interface SceneAnalysis {
  environment: string;
  environment_confidence: number;
  object_distribution: { [key: string]: number };
  total_frames: number;
}

export interface DetectedActivity {
  activity: string;
  confidence: number;
  indicators: string[];
  primary_objects: string[];
}

export interface FaceRecognitionSummary {
  known_people_identified: string[];
  unknown_faces_detected: number;
  total_faces_detected: number;
  all_faces: {
    timestamp: number;
    name: string;
  }[];
  unknown_faces_timestamps: number[];
}

export interface AnalysisSummary {
  total_frames_analyzed: number;
  primary_activity: string;
  confidence: number;
}

export interface Analysis {
  video_file: string;
  scene_analysis: SceneAnalysis;
  detected_activities: DetectedActivity[];
  face_recognition_summary: FaceRecognitionSummary;
  frame_analysis: FrameAnalysis[];
  summary: AnalysisSummary;
}
