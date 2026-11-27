"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

type BudgetFn = () => number;

interface ActiveEditorContextValue {
  activeEditor: Editor | null;
  activeField: string | null;
  primaryEditor: Editor | null;
  setActiveEditor: (editor: Editor | null, field?: string | null) => void;
  registerEditor: (field: string, editor: Editor | null, getBudget?: BudgetFn) => void;
  getPasteBudgetForEditor: (editor: Editor | null) => number;
}

const ActiveEditorContext = createContext<ActiveEditorContextValue>({
  activeEditor: null,
  activeField: null,
  primaryEditor: null,
  setActiveEditor: () => {},
  registerEditor: () => {},
  getPasteBudgetForEditor: () => 500_000,
});

export function ActiveEditorProvider({ children }: { children: React.ReactNode }) {
  const [activeEditor, setEditorState] = useState<Editor | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [primaryEditor, setPrimaryEditor] = useState<Editor | null>(null);

  const editorsRef = useRef<Map<string, Editor>>(new Map());
  const budgetsRef = useRef<WeakMap<Editor, BudgetFn>>(new WeakMap());

  const setActiveEditor = useCallback((editor: Editor | null, field?: string | null) => {
    setEditorState(editor);
    if (field !== undefined) {
      setActiveField(field);
    } else if (!editor) {
      setActiveField(null);
    }
  }, []);

  const registerEditor = useCallback((field: string, editor: Editor | null, getBudget?: BudgetFn) => {
    if (editor) {
      editorsRef.current.set(field, editor);
      if (getBudget) budgetsRef.current.set(editor, getBudget);
      setPrimaryEditor((prev) => {
        if (prev && prev.isDestroyed === false && prev.isEditable) return prev;
        return editor;
      });
    } else {
      const removed = editorsRef.current.get(field);
      editorsRef.current.delete(field);
      setPrimaryEditor((prev) => {
        if (prev && prev !== removed && !prev.isDestroyed) return prev;
        const next = Array.from(editorsRef.current.values()).find((e) => !e.isDestroyed) ?? null;
        return next;
      });
      setEditorState((prev) => (prev && prev === removed ? null : prev));
    }
  }, []);

  const getPasteBudgetForEditor = useCallback((editor: Editor | null) => {
    if (!editor) return 500_000;
    const fn = budgetsRef.current.get(editor);
    return fn ? fn() : 500_000;
  }, []);

  const value = useMemo(
    () => ({
      activeEditor,
      activeField,
      primaryEditor,
      setActiveEditor,
      registerEditor,
      getPasteBudgetForEditor,
    }),
    [activeEditor, activeField, primaryEditor, setActiveEditor, registerEditor, getPasteBudgetForEditor],
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
