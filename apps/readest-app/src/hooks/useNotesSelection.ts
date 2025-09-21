import { useState, useMemo } from 'react';
import { BookNote } from '@/types/book';

export interface NotesSelectionState {
  selectedNoteIds: Set<string>;
  isMultiSelectMode: boolean;
  selectAll: (notes: BookNote[]) => void;
  selectNone: () => void;
  toggleNote: (noteId: string) => void;
  toggleMultiSelectMode: () => void;
  isAllSelected: (notes: BookNote[]) => boolean;
  hasSelection: boolean;
  selectedCount: number;
  getSelectedNotes: (notes: BookNote[]) => BookNote[];
}

export const useNotesSelection = (): NotesSelectionState => {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const selectAll = (notes: BookNote[]) => {
    const activeNoteIds = notes.filter(note => !note.deletedAt).map(note => note.id);
    setSelectedNoteIds(new Set(activeNoteIds));
  };

  const selectNone = () => {
    setSelectedNoteIds(new Set());
  };

  const toggleNote = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(prev => !prev);
    if (isMultiSelectMode) {
      // Exit multi-select mode, clear selections
      setSelectedNoteIds(new Set());
    }
  };

  const isAllSelected = (notes: BookNote[]) => {
    const activeNotes = notes.filter(note => !note.deletedAt);
    if (activeNotes.length === 0) return false;
    return activeNotes.every(note => selectedNoteIds.has(note.id));
  };

  const hasSelection = useMemo(() => selectedNoteIds.size > 0, [selectedNoteIds]);

  const selectedCount = useMemo(() => selectedNoteIds.size, [selectedNoteIds]);

  const getSelectedNotes = (notes: BookNote[]) => {
    return notes.filter(note => selectedNoteIds.has(note.id));
  };

  return {
    selectedNoteIds,
    isMultiSelectMode,
    selectAll,
    selectNone,
    toggleNote,
    toggleMultiSelectMode,
    isAllSelected,
    hasSelection,
    selectedCount,
    getSelectedNotes,
  };
};