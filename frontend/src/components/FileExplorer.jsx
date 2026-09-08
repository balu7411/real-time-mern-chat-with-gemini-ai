import React from "react";

export default function FileExplorer({ files, activePath, onSelect }) {
  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-500">
        No files yet. Ask the AI, e.g. <span className="text-accent">@ai create a login page</span>
      </div>
    );
  }

  return (
    <ul className="py-2">
      {files.map((f) => (
        <li key={f.path}>
          <button
            onClick={() => onSelect(f.path)}
            className={`w-full text-left px-4 py-1.5 text-sm truncate ${
              activePath === f.path
                ? "bg-panel2 text-white"
                : "text-gray-400 hover:bg-panel2/60"
            }`}
            title={f.path}
          >
            {f.path}
          </button>
        </li>
      ))}
    </ul>
  );
}
