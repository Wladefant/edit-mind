import unittest
import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from transcribe import run_transcription

class TestTranscribeVideo(unittest.TestCase):

    def test_transcribe_video(self):

        video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_video.mp4'))

        # Temporary JSON output path
        tmp_dir = tempfile.gettempdir()
        output_json_path = os.path.join(tmp_dir, 'transcription_output.json')

        # Run transcription and save JSON
        run_transcription(video_path, output_json_path) 

        # Load generated output
        with open(output_json_path, 'r') as f:
            generated_data = json.load(f)

        # Load expected JSON for comparison
        expected_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_video_transcription.json'))
        with open(expected_json_path, 'r') as f:
            expected_data = json.load(f)

        # Compare JSON structures
        self.assertEqual(generated_data, expected_data, "Generated transcription JSON does not match expected output")

if __name__ == '__main__':
    unittest.main()
