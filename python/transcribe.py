import whisper
import sys
import json

def main():
    """Main entry point for CLI"""
    if len(sys.argv) < 3:
        print("Usage:", file=sys.stderr)
        print("python transcribe.py <video_file> <output_json>", file=sys.stderr)
        sys.exit(1)

    model = whisper.load_model("large-v3")

    video_path = sys.argv[1]
    json_file_path = sys.argv[2]

    print(f"Starting transcription for: {video_path}", file=sys.stderr)

    try:
        result = model.transcribe(video_path, verbose=False, word_timestamps=True)
        
        # Check if transcription is empty or no speech detected
        if not result.get("text", "").strip() or len(result.get("segments", [])) == 0:
            print("Warning: No audio or speech detected in video", file=sys.stderr)
            json_output_data = {
                "text": "",
                "segments": [],
                "language": None
            }
        else:
            json_output_data = result
            
    except Exception as e:
        print("Creating empty transcription file", file=sys.stderr)
        json_output_data = {
            "text": "",
            "segments": [],
            "language": None
        }

    try:
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(json_output_data, f, indent=4, ensure_ascii=False)
        print(f"Transcription saved to: {json_file_path}", file=sys.stderr)
    except IOError as e:
        print(f"Error writing JSON file to {json_file_path}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()