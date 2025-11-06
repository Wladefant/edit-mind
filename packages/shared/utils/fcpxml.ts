import { spawn } from "child_process";
import path from "path";

const PYTHON_EXECUTABLE = path.resolve("../.venv/bin/python");
const TIMELINE_GENERATOR_PATH = path.resolve("../python/timeline_generator.py");

/**
 * Generates an FCPXML file from a clips.json file using the Python service.
 * @param clipsJsonPath The absolute path to the clips.json file.
 * @param outputDir The directory where the final FCPXML file should be saved.
 * @returns The path to the generated FCPXML file.
 */
export function exportToFcpXml(
  clipsJsonPath: string,
  outputFilename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn(PYTHON_EXECUTABLE, [
      TIMELINE_GENERATOR_PATH,
      clipsJsonPath,
      outputFilename,
    ]);

    let stderr = "";
    pyProcess.stderr.on("data", (data: any) => {
      stderr += data.toString();
    });

    pyProcess.on("close", (code: any) => {
      if (code === 0) {
        resolve(outputFilename);
      } else {
        reject(
          new Error(
            `Timeline generator exited with code ${code}. Stderr: ${stderr}`
          )
        );
      }
    });
  });
}
