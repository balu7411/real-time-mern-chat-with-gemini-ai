import React, { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";

let webContainerInstance = null;
let webContainerBootPromise = null;

async function getWebContainer() {
  if (webContainerInstance) {
    return webContainerInstance;
  }

  if (!webContainerBootPromise) {
    webContainerBootPromise = WebContainer.boot();
  }

  try {
    webContainerInstance = await webContainerBootPromise;

    return webContainerInstance;
  } catch (error) {
    webContainerBootPromise = null;
    throw error;
  }
}

export default function WebContainerPreview({ files = [] }) {
  const iframeRef = useRef(null);
  const processRef = useRef(null);
  const serverReadyHandlerRef = useRef(null);

  const [status, setStatus] = useState(
    "Starting WebContainer..."
  );

  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [running, setRunning] = useState(false);

  /*
   * Start WebContainer
   */
  useEffect(() => {
    let cancelled = false;

    async function startContainer() {
      try {
        setError("");
        setStatus("Starting WebContainer...");

        const container = await getWebContainer();

        if (cancelled) {
          return;
        }

        setBooted(true);
        setStatus("WebContainer ready");

        console.log(
          "[WebContainer] Ready"
        );
      } catch (err) {
        console.error(
          "[WebContainer] Boot error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to start WebContainer"
          );

          setStatus(
            "WebContainer failed"
          );
        }
      }
    }

    startContainer();

    return () => {
      cancelled = true;

      // Memory Leak Eradication Protocol (Section 1.3):
      // Kill running process, detach listeners, and blank out iframe to release browser memory
      if (processRef.current) {
        try {
          processRef.current.kill();
        } catch (_) {}
        processRef.current = null;
      }

      if (serverReadyHandlerRef.current && webContainerInstance) {
        webContainerInstance.off("server-ready", serverReadyHandlerRef.current);
        serverReadyHandlerRef.current = null;
      }

      if (iframeRef.current) {
        iframeRef.current.src = "about:blank";
      }
    };
  }, []);

  /*
   * Mount generated project files
   */
  useEffect(() => {
    if (
      !booted ||
      !webContainerInstance ||
      !files.length
    ) {
      return;
    }

    async function mountFiles() {
      try {
        setError("");
        setStatus(
          "Loading project files..."
        );

        const fileTree = {};

        for (const file of files) {
          if (!file?.path) {
            continue;
          }

          const parts =
            file.path.split("/");

          let current = fileTree;

          for (
            let i = 0;
            i < parts.length - 1;
            i++
          ) {
            const folder = parts[i];

            if (!current[folder]) {
              current[folder] = {
                directory: {},
              };
            }

            current =
              current[folder].directory;
          }

          const fileName =
            parts[parts.length - 1];

          current[fileName] = {
            file: {
              contents:
                file.content || "",
            },
          };
        }

        await webContainerInstance.mount(
          fileTree
        );

        setStatus(
          "Project files loaded"
        );

        console.log(
          "[WebContainer] Files mounted:",
          files.length
        );
      } catch (err) {
        console.error(
          "[WebContainer] Mount error:",
          err
        );

        setError(
          err?.message ||
            "Failed to load project files"
        );

        setStatus(
          "Failed to load files"
        );
      }
    }

    mountFiles();
  }, [booted, files]);

  /*
   * Run generated frontend project
   */
  async function runProject() {
    if (!webContainerInstance) {
      setError(
        "WebContainer is not ready yet."
      );

      return;
    }

    if (!files.length) {
      setError(
        "No project files available."
      );

      return;
    }

    try {
      setError("");
      setRunning(false);

      /*
       * Stop previous process
       */
      if (processRef.current) {
        try {
          processRef.current.kill();
        } catch (err) {
          console.log(
            "Previous process already stopped."
          );
        }

        processRef.current = null;
      }

      /*
       * Remove old server-ready listener
       */
      if (serverReadyHandlerRef.current) {
        webContainerInstance.off(
          "server-ready",
          serverReadyHandlerRef.current
        );

        serverReadyHandlerRef.current = null;
      }

      /*
       * Install dependencies
       *
       * Generated project structure:
       *
       * /client
       * /server
       */
      setStatus(
        "Installing frontend dependencies..."
      );

      const installProcess =
        await webContainerInstance.spawn(
          "npm",
          ["install"],
          {
            cwd: "/client",
          }
        );

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(
              "[npm install]",
              data
            );
          },
        })
      );

      const installExitCode =
        await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error(
          "npm install failed inside the client folder."
        );
      }

      /*
       * Start Vite frontend
       */
      setStatus(
        "Starting Student Management System..."
      );

      const process =
        await webContainerInstance.spawn(
          "npm",
          [
            "run",
            "dev",
            "--",
            "--host",
            "0.0.0.0",
          ],
          {
            cwd: "/client",
          }
        );

      processRef.current = process;

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(
              "[WebContainer]",
              data
            );
          },
        })
      );

      /*
       * Wait for Vite server
       */
      const handleServerReady = (
        port,
        url
      ) => {
        console.log(
          "[WebContainer] Server ready:",
          port,
          url
        );

        if (iframeRef.current) {
          iframeRef.current.src = url;
        }

        setRunning(true);

        setStatus(
          `Running on port ${port}`
        );
      };

      serverReadyHandlerRef.current =
        handleServerReady;

      webContainerInstance.on(
        "server-ready",
        handleServerReady
      );
    } catch (err) {
      console.error(
        "[WebContainer] Run error:",
        err
      );

      setRunning(false);

      setError(
        err?.message ||
          "Failed to run project"
      );

      setStatus(
        "Project failed to start"
      );
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0d12]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-panel2">
        <div className="text-sm text-gray-300">
          Live Preview
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {status}
          </span>

          <button
            onClick={runProject}
            disabled={
              !booted || running
            }
            className="text-xs bg-accent hover:opacity-90 disabled:opacity-50 text-white px-3 py-1.5 rounded-md"
          >
            {running
              ? "Running..."
              : "Run"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-400 border-b border-red-900/30 bg-red-950/20">
          {error}
        </div>
      )}

      {/* Preview */}
      <div className="flex-1 min-h-0 bg-white">
        <iframe
          ref={iframeRef}
          title="Student Management System Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}