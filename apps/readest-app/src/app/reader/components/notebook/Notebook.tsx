import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsStore } from '@/store/settingsStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/store/themeStore';
import { useEnv } from '@/context/EnvContext';
import { DragKey, useDrag } from '@/hooks/useDrag';
import { useNotesSelection } from '@/hooks/useNotesSelection';
import { TextSelection } from '@/utils/sel';
import { BookNote } from '@/types/book';
import { uniqueId } from '@/utils/misc';
import { eventDispatcher } from '@/utils/event';
import { getBookDirFromLanguage } from '@/utils/book';
import { Overlay } from '@/components/Overlay';
import BooknoteItem from '../sidebar/BooknoteItem';
import NotebookHeader from './Header';
import NoteEditor from './NoteEditor';
import SearchBar from './SearchBar';

const MIN_NOTEBOOK_WIDTH = 0.2;
const MAX_NOTEBOOK_WIDTH = 0.6;

const Notebook: React.FC = () => {
  const _ = useTranslation();
  const { updateAppTheme, safeAreaInsets } = useThemeStore();
  const { envConfig, appService } = useEnv();
  const { settings } = useSettingsStore();
  const { sideBarBookKey } = useSidebarStore();
  const { notebookWidth, isNotebookVisible, isNotebookPinned } = useNotebookStore();
  const { notebookNewAnnotation, notebookEditAnnotation, setNotebookPin } = useNotebookStore();
  const { getBookData, getConfig, saveConfig, updateBooknotes } = useBookDataStore();
  const { getView, getViewSettings } = useReaderStore();
  const { getNotebookWidth, setNotebookWidth, setNotebookVisible, toggleNotebookPin } =
    useNotebookStore();
  const { setNotebookNewAnnotation, setNotebookEditAnnotation } = useNotebookStore();

  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<BookNote[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const notesSelection = useNotesSelection();

  const onNavigateEvent = async () => {
    const pinButton = document.querySelector('.sidebar-pin-btn');
    const isPinButtonHidden = !pinButton || window.getComputedStyle(pinButton).display === 'none';
    if (isPinButtonHidden) {
      setNotebookVisible(false);
    }
  };

  useEffect(() => {
    if (isNotebookVisible) {
      updateAppTheme('base-200');
    } else {
      updateAppTheme('base-100');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotebookVisible]);

  useEffect(() => {
    setNotebookWidth(settings.globalReadSettings.notebookWidth);
    setNotebookPin(settings.globalReadSettings.isNotebookPinned);
    setNotebookVisible(settings.globalReadSettings.isNotebookPinned);

    eventDispatcher.on('navigate', onNavigateEvent);
    return () => {
      eventDispatcher.off('navigate', onNavigateEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNotebookResize = (newWidth: string) => {
    setNotebookWidth(newWidth);
    settings.globalReadSettings.notebookWidth = newWidth;
  };

  const handleTogglePin = () => {
    toggleNotebookPin();
    settings.globalReadSettings.isNotebookPinned = !isNotebookPinned;
  };

  const handleClickOverlay = () => {
    setNotebookVisible(false);
    setNotebookNewAnnotation(null);
    setNotebookEditAnnotation(null);
  };

  const handleSaveNote = (selection: TextSelection, note: string) => {
    if (!sideBarBookKey) return;
    const view = getView(sideBarBookKey);
    const config = getConfig(sideBarBookKey)!;

    const cfi = view?.getCFI(selection.index, selection.range);
    if (!cfi) return;

    const { booknotes: annotations = [] } = config;
    const annotation: BookNote = {
      id: uniqueId(),
      type: 'annotation',
      cfi,
      note,
      text: selection.text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    annotations.push(annotation);
    const updatedConfig = updateBooknotes(sideBarBookKey, annotations);
    if (updatedConfig) {
      saveConfig(envConfig, sideBarBookKey, updatedConfig, settings);
    }
    setNotebookNewAnnotation(null);
  };

  const handleEditNote = (note: BookNote, isDelete: boolean) => {
    if (!sideBarBookKey) return;
    const config = getConfig(sideBarBookKey)!;
    const { booknotes: annotations = [] } = config;
    const existingIndex = annotations.findIndex((item) => item.id === note.id);
    if (existingIndex === -1) return;
    if (isDelete) {
      note.deletedAt = Date.now();
    } else {
      note.updatedAt = Date.now();
    }
    annotations[existingIndex] = note;
    const updatedConfig = updateBooknotes(sideBarBookKey, annotations);
    if (updatedConfig) {
      saveConfig(envConfig, sideBarBookKey, updatedConfig, settings);
    }
    setNotebookEditAnnotation(null);
  };

  const onDragMove = (data: { clientX: number }) => {
    const widthFraction = 1 - data.clientX / window.innerWidth;
    const newWidth = Math.max(MIN_NOTEBOOK_WIDTH, Math.min(MAX_NOTEBOOK_WIDTH, widthFraction));
    handleNotebookResize(`${Math.round(newWidth * 10000) / 100}%`);
  };

  const onDragKeyDown = (data: { key: DragKey; step: number }) => {
    const currentWidth = parseFloat(getNotebookWidth()) / 100;
    let newWidth = currentWidth;

    if (data.key === 'ArrowLeft') {
      newWidth = Math.max(MIN_NOTEBOOK_WIDTH, currentWidth + data.step);
    } else if (data.key === 'ArrowRight') {
      newWidth = Math.min(MAX_NOTEBOOK_WIDTH, currentWidth - data.step);
    }
    handleNotebookResize(`${Math.round(newWidth * 10000) / 100}%`);
  };

  const { handleDragStart, handleDragKeyDown } = useDrag(onDragMove, onDragKeyDown);

  const config = getConfig(sideBarBookKey);
  const { booknotes: allNotes = [] } = config || {};
  const annotationNotes = allNotes
    .filter((note) => note.type === 'annotation' && note.note && !note.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
  const excerptNotes = allNotes
    .filter((note) => note.type === 'excerpt' && note.text && !note.deletedAt)
    .sort((a, b) => a.createdAt - b.createdAt);

  const handleToggleSearchBar = () => {
    setIsSearchBarVisible((prev) => !prev);
    if (isSearchBarVisible) {
      setSearchResults(null);
      setSearchTerm('');
    }
    // Exit multi-select mode when toggling search
    if (notesSelection.isMultiSelectMode) {
      notesSelection.toggleMultiSelectMode();
    }
  };

  // Multi-select handlers
  const allVisibleNotes = useMemo(() => {
    return [...annotationNotes, ...excerptNotes];
  }, [annotationNotes, excerptNotes]);

  const handleToggleMultiSelect = () => {
    notesSelection.toggleMultiSelectMode();
  };

  const handleSelectAll = () => {
    const currentVisibleNotes = isSearchBarVisible && searchResults ? 
      searchResults.filter(note => !note.deletedAt) : 
      allVisibleNotes;
    
    if (notesSelection.isAllSelected(currentVisibleNotes)) {
      notesSelection.selectNone();
    } else {
      notesSelection.selectAll(currentVisibleNotes);
    }
  };

  const handleDeleteSelected = () => {
    if (!sideBarBookKey) return;
    
    const selectedNotes = notesSelection.getSelectedNotes(allVisibleNotes);
    if (selectedNotes.length === 0) return;

    const config = getConfig(sideBarBookKey)!;
    const { booknotes: annotations = [] } = config;
    
    // Mark selected notes as deleted
    selectedNotes.forEach(selectedNote => {
      const existingIndex = annotations.findIndex(note => note.id === selectedNote.id);
      if (existingIndex !== -1) {
        annotations[existingIndex]!.deletedAt = Date.now();
      }
    });

    const updatedConfig = updateBooknotes(sideBarBookKey, annotations);
    if (updatedConfig) {
      saveConfig(envConfig, sideBarBookKey, updatedConfig, settings);
    }

    // Clear selection after deletion
    notesSelection.selectNone();
    
    // Show toast notification
    eventDispatcher.dispatch('toast', {
      type: 'info',
      message: `${selectedNotes.length} ${selectedNotes.length === 1 ? _('note deleted') : _('notes deleted')}`,
      className: 'whitespace-nowrap',
      timeout: 2000,
    });
  };

  const handleCopySelected = () => {
    const selectedNotes = notesSelection.getSelectedNotes(allVisibleNotes);
    if (selectedNotes.length === 0) return;

    // Format notes for copying
    const lines: string[] = [];
    selectedNotes.forEach(note => {
      if (note.text) {
        lines.push(note.text);
        if (note.note) {
          lines.push(note.note);
        }
        lines.push(''); // Empty line between notes
      }
    });

    const textToCopy = lines.join('\n');
    navigator.clipboard?.writeText(textToCopy);

    // Show toast notification
    eventDispatcher.dispatch('toast', {
      type: 'info',
      message: `${selectedNotes.length} ${selectedNotes.length === 1 ? _('note copied') : _('notes copied')}`,
      className: 'whitespace-nowrap',
      timeout: 2000,
    });
  };

  const filteredAnnotationNotes = useMemo(
    () =>
      isSearchBarVisible && searchResults
        ? searchResults.filter((note) => note.type === 'annotation' && note.note && !note.deletedAt)
        : annotationNotes,
    [annotationNotes, searchResults, isSearchBarVisible],
  );

  const filteredExcerptNotes = useMemo(
    () =>
      isSearchBarVisible && searchResults
        ? searchResults.filter((note) => note.type === 'excerpt' && note.text && !note.deletedAt)
        : excerptNotes,
    [excerptNotes, searchResults, isSearchBarVisible],
  );

  const currentVisibleNotes = useMemo(() => {
    return [...filteredAnnotationNotes, ...filteredExcerptNotes];
  }, [filteredAnnotationNotes, filteredExcerptNotes]);

  if (!sideBarBookKey) return null;

  const bookData = getBookData(sideBarBookKey);
  const viewSettings = getViewSettings(sideBarBookKey);
  if (!bookData || !bookData.bookDoc) {
    return null;
  }
  const { bookDoc } = bookData;
  const languageDir = getBookDirFromLanguage(bookDoc.metadata.language);

  const hasSearchResults = filteredAnnotationNotes.length > 0 || filteredExcerptNotes.length > 0;
  const hasAnyNotes = annotationNotes.length > 0 || excerptNotes.length > 0;

  return isNotebookVisible ? (
    <>
      {!isNotebookPinned && (
        <Overlay className='z-[45] bg-black/20' onDismiss={handleClickOverlay} />
      )}
      <div
        className={clsx(
          'notebook-container bg-base-200 right-0 flex min-w-60 select-none flex-col',
          'font-sans text-base font-normal sm:text-sm',
          appService?.isIOSApp ? 'h-[100vh]' : 'h-full',
          appService?.hasRoundedWindow && 'rounded-window-top-right rounded-window-bottom-right',
          isNotebookPinned ? 'z-20' : 'z-[45] shadow-2xl',
        )}
        role='group'
        aria-label={_('Notebook')}
        dir={viewSettings?.rtl && languageDir === 'rtl' ? 'rtl' : 'ltr'}
        style={{
          width: `${notebookWidth}`,
          maxWidth: `${MAX_NOTEBOOK_WIDTH * 100}%`,
          position: isNotebookPinned ? 'relative' : 'absolute',
          paddingTop: `${safeAreaInsets?.top || 0}px`,
        }}
      >
        <style jsx>{`
          @media (max-width: 640px) {
            .notebook-container {
              width: 100%;
              min-width: 100%;
            }
          }
        `}</style>
        <div
          className='drag-bar absolute -left-2 top-0 h-full w-0.5 cursor-col-resize bg-transparent p-2'
          role='slider'
          tabIndex={0}
          aria-label={_('Resize Notebook')}
          aria-orientation='horizontal'
          aria-valuenow={parseFloat(notebookWidth)}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onKeyDown={handleDragKeyDown}
        />
        <div className='flex-shrink-0'>
          <NotebookHeader
            isPinned={isNotebookPinned}
            isSearchBarVisible={isSearchBarVisible}
            isMultiSelectMode={notesSelection.isMultiSelectMode}
            hasSelection={notesSelection.hasSelection}
            selectedCount={notesSelection.selectedCount}
            isAllSelected={notesSelection.isAllSelected(currentVisibleNotes)}
            allNotes={currentVisibleNotes}
            notebookWidth={notebookWidth}
            handleClose={() => setNotebookVisible(false)}
            handleTogglePin={handleTogglePin}
            handleToggleSearchBar={handleToggleSearchBar}
            handleToggleMultiSelect={handleToggleMultiSelect}
            handleSelectAll={handleSelectAll}
            handleDeleteSelected={handleDeleteSelected}
            handleCopySelected={handleCopySelected}
          />
          <div
            className={clsx('search-bar', {
              'search-bar-visible': isSearchBarVisible,
            })}
          >
            <SearchBar
              isVisible={isSearchBarVisible}
              bookKey={sideBarBookKey}
              searchTerm={searchTerm}
              onSearchResultChange={setSearchResults}
            />
          </div>
        </div>
        <div className='flex-grow overflow-y-auto px-3'>
          {isSearchBarVisible && searchResults && !hasSearchResults && hasAnyNotes && (
            <div className='flex h-32 items-center justify-center text-gray-500'>
              <p className='font-size-sm text-center'>{_('No notes match your search')}</p>
            </div>
          )}
          <div dir='ltr'>
            {filteredExcerptNotes.length > 0 && (
              <p className='content font-size-base'>
                {_('Excerpts')}
                {isSearchBarVisible && searchResults && (
                  <span className='font-size-xs ml-2 text-gray-500'>
                    ({filteredExcerptNotes.length})
                  </span>
                )}
              </p>
            )}
          </div>
          <ul className=''>
            {filteredExcerptNotes.map((item, index) => (
              <li key={`${index}-${item.id}`} className='my-2'>
                <div
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      handleEditNote(item, true);
                    }
                  }}
                  className='collapse-arrow border-base-300 bg-base-100 collapse border'
                >
                  <div
                    className={clsx(
                      'collapse-title pe-8 text-sm font-medium',
                      'h-[2.5rem] min-h-[2.5rem] p-[0.6rem]',
                    )}
                    style={
                      {
                        '--top-override': '1.25rem',
                        '--end-override': '0.7rem',
                      } as React.CSSProperties
                    }
                  >
                    <p className='line-clamp-1'>{item.text || `Excerpt ${index + 1}`}</p>
                  </div>
                  <div className='collapse-content font-size-xs select-text px-3 pb-0'>
                    <p className='hyphens-auto text-justify'>{item.text}</p>
                    <div className='flex justify-end' dir='ltr'>
                      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions*/}
                      <div
                        className='font-size-xs cursor-pointer align-bottom text-red-500 hover:text-red-600'
                        onClick={handleEditNote.bind(null, item, true)}
                        aria-label={_('Delete')}
                      >
                        {_('Delete')}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div dir='ltr'>
            {(notebookNewAnnotation || filteredAnnotationNotes.length > 0) && (
              <p className='content font-size-base'>
                {_('Notes')}
                {isSearchBarVisible && searchResults && filteredAnnotationNotes.length > 0 && (
                  <span className='font-size-xs ml-2 text-gray-500'>
                    ({filteredAnnotationNotes.length})
                  </span>
                )}
              </p>
            )}
          </div>
          {(notebookNewAnnotation || notebookEditAnnotation) && !isSearchBarVisible && (
            <NoteEditor onSave={handleSaveNote} onEdit={(item) => handleEditNote(item, false)} />
          )}
          <ul>
            {filteredAnnotationNotes.map((item, index) => (
              <BooknoteItem 
                key={`${index}-${item.cfi}`} 
                bookKey={sideBarBookKey} 
                item={item}
                isMultiSelectMode={notesSelection.isMultiSelectMode}
                isSelected={notesSelection.selectedNoteIds.has(item.id)}
                onToggleSelect={notesSelection.toggleNote}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  ) : null;
};

export default Notebook;
