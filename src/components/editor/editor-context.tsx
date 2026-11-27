"use client";

import React, { createContext, useContext, useState } from "react";
import type { Editor } from "@tiptap/react";

interface ActiveEditorContextValue {
  activeEditor: Editor | null;
  activeField: string | null;
  setActiveEditor: (editor: Editor | null, field?: string | null) => void;
}

const ActiveEditorContext = createContext<ActiveEditorContextValue>({
  activeEditor: null,
  activeField: null,
  setActiveEditor: () => {},
});

export function ActiveEditorProvider({ children }: { children: React.ReactNode }) {
  const [activeEditor, setEditorState] = useState<Editor | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);

  const setActiveEditor = React.useCallback((editor: Editor | null, field?: string | null) => {
    setEditorState(editor);
    if (field !== undefined) {
      setActiveField(field);
    } else if (!editor) {
      setActiveField(null);
    }
  }, []);

  const value = React.useMemo(
    () => ({ activeEditor, activeField, setActiveEditor }),
    [activeEditor, activeField, setActiveEditor],
  );

  return (
    <ActiveEditorContext.Provider value={value}>
      {children}
    </ActiveEditorContext.Provider>
  );
}

export function useActiveEditor() {
  return useContext(ActiveEditorContext);
}
