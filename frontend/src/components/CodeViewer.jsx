import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import api from "../api/axios";

function getLanguage(path = "") {
  const extension = path.split(".").pop()?.toLowerCase();

  const languages = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    sql: "sql",
    xml: "xml",
  };

  return languages[extension] || "plaintext";
}

export default function CodeViewer({
  file,
  projectId,
  socket,
  onFileSaved,
}) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    return () => {
      // Memory Leak Eradication: Dispose Monaco editor and detach listeners on unmount
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setCode(file?.content || "");
    setSaved(false);
    setSaveError("");
  }, [file]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Select a file to view its contents
      </div>
    );
  }

  const language = getLanguage(file.path);

  async function handleSave() {
    if (!projectId || !file.path) {
      return;
    }

    try {
      setSaving(true);
      setSaved(false);
      setSaveError("");

      // Save to MongoDB through REST API
      const response = await api.put(
        `/projects/${projectId}/files`,
        {
          path: file.path,
          content: code,
        }
      );

      const updatedFiles = response.data.project?.files || [];

      // Update the local workspace
      onFileSaved?.(updatedFiles);

      // Notify other collaborators through Socket.IO
      if (socket?.connected) {
        socket.emit("fileUpdated", {
          projectId,
          path: file.path,
          content: code,
        });
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to save file:", err);

      setSaveError(
        err.response?.data?.message ||
          "Failed to save file"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="px-4 py-2 border-b border-panel2 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {file.path}
        </span>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-400">
              Saved
            </span>
          )}

          {saveError && (
            <span className="text-xs text-red-400">
              {saveError}
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-accent hover:opacity-90 disabled:opacity-50 text-white px-3 py-1.5 rounded-md"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
          }}
          onChange={(value) => {
            setCode(value || "");
            setSaved(false);
            setSaveError("");
          }}
          theme="vs-dark"
          options={{
            minimap: {
              enabled: true,
            },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}