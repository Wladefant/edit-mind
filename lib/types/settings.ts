
export type Settings = {
  sample_interval_seconds: number;
  max_workers: number;
  batch_size: number;
  yolo_confidence: number;
  yolo_iou: number;
  resize_to_720p: boolean;
  yolo_model: string;
  output_dir: string;
};
