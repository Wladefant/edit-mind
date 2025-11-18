import sys
import os
import json
import asyncio
from pathlib import Path
from typing import Optional, Callable
import time 

async def create_faces_data_from_folder_async(faces_directory=".faces", output_json_path=".faces.json"):
    """
    Asynchronously scans the specified faces directory, expecting subfolders named after individuals,
    collects image paths, and optionally saves this data to a JSON file.
    """
    faces_data = {}
    
    def _sync_scan():
        if not os.path.exists(faces_directory):
            print(f"ERROR(create_faces): .faces directory not found at {faces_directory}", file=sys.stderr)
            return {}

        found_people_count = 0
        for person_name in os.listdir(faces_directory):
            person_folder_path = os.path.join(faces_directory, person_name)
            if os.path.isdir(person_folder_path):
                found_people_count += 1
                image_paths = []
                for filename in os.listdir(person_folder_path):
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                        relative_path = os.path.join(faces_directory, person_name, filename)
                        image_paths.append(relative_path.replace("\\", "/"))
                if image_paths:
                    faces_data[person_name] = image_paths
        return faces_data

    faces_data = await asyncio.to_thread(_sync_scan)
    
    if faces_data:
        try:
            output_dir = os.path.dirname(output_json_path)
            if output_dir and not os.path.exists(output_dir):
                print(f"DEBUG(create_faces): Creating output directory: {output_dir}", file=sys.stderr)
                os.makedirs(output_dir)

            def _sync_dump():
                with open(output_json_path, 'w') as f:
                    json.dump(faces_data, f, indent=2)
            await asyncio.to_thread(_sync_dump)
            print(f"Successfully generated and saved faces data to {output_json_path}", file=sys.stderr)
        except IOError as e:
            print(f"Error saving faces data to {output_json_path}: {e}", file=sys.stderr)
    else:
        print(f"No faces data found in '{faces_directory}' to save to '{output_json_path}'.", file=sys.stderr)

    return faces_data

async def batch_add_faces_from_folder(
    faces_directory=".faces",
    known_faces_file="known_faces.json",
    output_json_path=".faces.json",
    progress_callback: Optional[Callable[[dict], None]] = None
):
    """
    Scans the specified faces directory, collects image paths, saves data,
    and then adds each face using the add_face.py script.
    Reports progress via the optional progress_callback, including elapsed time and percentage.
    """

    start_time = time.monotonic() 

    async def report_progress(message: str, current: int = 0, total: int = 0):
        elapsed = time.monotonic() - start_time
        progress_percent = (current / total * 100) if total > 0 else 0
        
        hours, remainder = divmod(int(elapsed), 3600)
        minutes, seconds = divmod(remainder, 60)
        elapsed_str = f"{hours:02}:{minutes:02}:{seconds:02}"

        if progress_callback:
            try:
                await progress_callback({
                    "current_item": current,
                    "total_items": total,
                    "progress": round(progress_percent, 1),
                    "elapsed": int(elapsed)
                })
            except Exception as e:
                print(f"Failed to send progress via callback: {e}", file=sys.stderr)

        print(f"[{elapsed_str} | {progress_percent:.1f}%] {message}", file=sys.stderr)

    await report_progress("Scanning faces directory...", current=0, total=1) 

    faces_data = await create_faces_data_from_folder_async(faces_directory, output_json_path)

    if not faces_data:
        await report_progress("No faces data found. Exiting reindexing.", current=1, total=1)
        return False

    script_dir = Path(__file__).parent
    add_face_script = script_dir / "add_face.py"
    
    project_root = Path(os.getcwd())
    
    total_images = sum(len(paths) for paths in faces_data.values())
    processed_images = 0

    if total_images == 0:
        await report_progress("No images found to process.", current=0, total=0)
        return True

    for name, image_paths in faces_data.items():
        await report_progress(f"Processing faces for: {name}", processed_images, total_images)
        
        for image_path_relative in image_paths:
            processed_images += 1
            
            message_prefix = f"Processing image: {image_path_relative}"
            await report_progress(message_prefix, processed_images, total_images)
            
            absolute_image_path = project_root / image_path_relative
            
            if not absolute_image_path.exists():
                warning_msg = f"Image not found at {absolute_image_path}. Skipping."
                await report_progress(warning_msg, processed_images, total_images)
                continue

            command = [
                sys.executable,
                str(add_face_script),
                name,
                str(absolute_image_path),
                str(project_root / known_faces_file)
            ]
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout_data, stderr_data = await process.communicate()
            return_code = process.returncode 
            
            stdout_str = stdout_data.decode().strip()
            stderr_str = stderr_data.decode().strip()   
            if return_code == 0:
                status_message = "Success"
                if stdout_str:
                    try:
                        print(stdout_str)
                        json_output = json.loads(stdout_str)
                        if json_output.get("status") == "warning":
                            status_message = f"Warning: {json_output.get('message', 'Multiple faces found.')}"
                        elif json_output.get("status") == "error":
                            status_message = f"Error (despite code 0): {json_output.get('message', 'Unknown error')}"
                    except json.JSONDecodeError:
                        status_message = f"Success (non-JSON output: {stdout_str[:50]}...)"
                
                await report_progress(status_message, processed_images, total_images)
            else:
                error_msg = f"add_face.py failed for {image_path_relative}. Return code: {process.returncode}"
                print(error_msg, file=sys.stderr)
                await report_progress(error_msg, processed_images, total_images)
                return False

    await report_progress("All faces processed.", total_images, total_images)
    return True