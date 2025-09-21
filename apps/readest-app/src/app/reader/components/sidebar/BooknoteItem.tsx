import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';

import { marked } from 'marked';
import { BsCheckSquareFill, BsSquare } from 'react-icons/bs';
import { useEnv } from '@/context/EnvContext';
import { BookNote } from '@/types/book';
import { useSettingsStore } from '@/store/settingsStore';
import { useReaderStore } from '@/store/readerStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { eventDispatcher } from '@/utils/event';
import useScrollToItem from '../../hooks/useScrollToItem';
import TextButton from '@/components/TextButton';
import TextEditor, { TextEditorRef } from '@/components/TextEditor';

interface BooknoteItemProps {
  bookKey: string;
  item: BookNote;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (noteId: string) => void;
}

const BooknoteItem: React.FC<BooknoteItemProps> = ({ 
  bookKey, 
  item, 
  isMultiSelectMode = false, 
  isSelected = false, 
  onToggleSelect 
}) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const { settings } = useSettingsStore();
  const { getConfig, saveConfig, updateBooknotes } = useBookDataStore();
  const { getProgress, getView, getViewsById } = useReaderStore();
  const { setNotebookEditAnnotation, setNotebookVisible } = useNotebookStore();

  const { text, cfi, note } = item;
  const editorRef = useRef<TextEditorRef>(null);
  const editorDraftRef = useRef<string>(text || '');
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const separatorWidth = useResponsiveSize(3);
  const iconSize16 = useResponsiveSize(16);

  const progress = getProgress(bookKey);
  const { isCurrent, viewRef } = useScrollToItem(cfi, progress);

  const handleClickItem = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    
    // In multi-select mode, clicking should toggle selection instead of navigating
    if (isMultiSelectMode && onToggleSelect) {
      onToggleSelect(item.id);
      return;
    }
    
    eventDispatcher.dispatch('navigate', { bookKey, cfi });

    getView(bookKey)?.goTo(cfi);
    if (note) {
      setNotebookVisible(true);
    }
  };

  const handleCheckboxClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(item.id);
    }
  };

  const deleteNote = (note: BookNote) => {
    if (!bookKey) return;
    const config = getConfig(bookKey);
    if (!config) return;
    const { booknotes = [] } = config;
    booknotes.forEach((item) => {
      if (item.id === note.id) {
        item.deletedAt = Date.now();
        const views = getViewsById(bookKey.split('-')[0]!);
        views.forEach((view) => view?.addAnnotation(item, true));
      }
    });
    const updatedConfig = updateBooknotes(bookKey, booknotes);
    if (updatedConfig) {
      saveConfig(envConfig, bookKey, updatedConfig, settings);
    }
  };

  const copyNote = async (note: BookNote) => {
    try {
      let content = '';
      if (note.text) {
        content += note.text;
      }
      if (note.note) {
        if (content) content += '\n\n';
        content += note.note;
      }
      
      await navigator.clipboard.writeText(content);
      // Simple notification - you could enhance this with a toast if available
      console.log('Note copied to clipboard');
    } catch (err) {
      console.error('Failed to copy note:', err);
    }
  };

  const editNote = (note: BookNote) => {
    setNotebookVisible(true);
    setNotebookEditAnnotation(note);
  };

  const editBookmark = () => {
    setInlineEditMode(true);
  };

  const handleSaveBookmark = () => {
    setInlineEditMode(false);
    const config = getConfig(bookKey);
    if (!config || !editorDraftRef.current) return;

    const { booknotes: annotations = [] } = config;
    const existingIndex = annotations.findIndex((annotation) => item.id === annotation.id);
    if (existingIndex === -1) return;
    annotations[existingIndex]!.updatedAt = Date.now();
    annotations[existingIndex]!.text = editorDraftRef.current;
    const updatedConfig = updateBooknotes(bookKey, annotations);
    if (updatedConfig) {
      saveConfig(envConfig, bookKey, updatedConfig, settings);
    }
  };

  if (inlineEditMode) {
    return (
      <div
        className={clsx(
          'border-base-300 content group relative my-2 cursor-pointer rounded-lg p-2',
          isCurrent ? 'bg-base-300/85 hover:bg-base-300' : 'hover:bg-base-300/55 bg-base-100',
          'transition-all duration-300 ease-in-out',
        )}
      >
        <div className='flex w-full'>
          <TextEditor
            className='!leading-normal'
            ref={editorRef}
            value={editorDraftRef.current}
            onChange={(value) => (editorDraftRef.current = value)}
            onSave={handleSaveBookmark}
            onEscape={() => setInlineEditMode(false)}
            spellCheck={false}
          />
        </div>
        <div className='flex justify-end space-x-3 p-2' dir='ltr'>
          <TextButton onClick={() => setInlineEditMode(false)}>{_('Cancel')}</TextButton>
          <TextButton onClick={handleSaveBookmark} disabled={!editorDraftRef.current}>
            {_('Save')}
          </TextButton>
        </div>
      </div>
    );
  }

  return (
    <li
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role='button'
      ref={viewRef}
      className={clsx(
        'border-base-300 content group relative my-2 cursor-pointer rounded-lg p-2',
        isCurrent
          ? 'bg-base-300/85 hover:bg-base-300 focus:bg-base-300'
          : 'hover:bg-base-300/55 focus:bg-base-300/55 bg-base-100',
        isMultiSelectMode && isSelected && 'ring-2 ring-primary bg-primary/10',
        'transition-all duration-300 ease-in-out',
      )}
      tabIndex={0}
      onClick={handleClickItem}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClickItem(e);
        } else {
          e.stopPropagation();
        }
      }}
    >
      {/* Multi-select checkbox */}
      {isMultiSelectMode && (
        <div className='absolute left-2 top-2 z-10'>
          <button
            onClick={handleCheckboxClick}
            className='p-1 hover:bg-base-300 rounded transition-colors duration-200'
            aria-label={isSelected ? _('Deselect note') : _('Select note')}
          >
            {isSelected ? (
              <BsCheckSquareFill size={iconSize16} className='text-primary' />
            ) : (
              <BsSquare size={iconSize16} className='text-gray-400' />
            )}
          </button>
        </div>
      )}
      
      <div
        className={clsx(
          'min-h-4 p-0 transition-all duration-300 ease-in-out',
          isMultiSelectMode && 'ml-8'
        )}
        style={
          {
            '--top-override': '0.7rem',
            '--end-override': '0.3rem',
          } as React.CSSProperties
        }
      >
        {item.note && (
          <div
            className='content prose prose-sm font-size-sm'
            dir='auto'
            dangerouslySetInnerHTML={{ __html: marked.parse(item.note) }}
          ></div>
        )}
        <div className='flex items-start'>
          {item.note && (
            <div
              className='me-2 mt-2.5 min-h-full self-stretch rounded-xl bg-gray-300'
              style={{
                minWidth: `${separatorWidth}px`,
              }}
            ></div>
          )}
          <div className={clsx('content font-size-sm line-clamp-3', item.note && 'mt-2')}>
            <span
              className={clsx(
                'inline leading-normal',
                item.note && 'content font-size-xs text-gray-500',
                (item.style === 'underline' || item.style === 'squiggly') &&
                  'underline decoration-2',
                item.style === 'highlight' && `bg-${item.color}-500 bg-opacity-40`,
                item.style === 'underline' && `decoration-${item.color}-400`,
                item.style === 'squiggly' && `decoration-wavy decoration-${item.color}-400`,
              )}
            >
              {text || ''}
            </span>
          </div>
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={clsx(
          'max-h-0 overflow-hidden p-0',
          'transition-[max-height] duration-300 ease-in-out',
          !isMultiSelectMode && 'group-hover:max-h-8 group-hover:overflow-visible',
          !isMultiSelectMode && 'group-focus-within:max-h-8 group-focus-within:overflow-visible',
        )}
        style={
          {
            '--bottom-override': 0,
          } as React.CSSProperties
        }
        // This is needed to prevent the parent onClick from being triggered
        onClick={(e) => e.stopPropagation()}
      >
        {!isMultiSelectMode && (
          <div className='flex cursor-default items-center justify-between'>
            <div className='flex items-center'>
              <span className='text-sm text-gray-500 sm:text-xs'>
                {dayjs(item.createdAt).fromNow()}
              </span>
            </div>
            <div className='flex items-center justify-end space-x-3 p-2' dir='ltr'>
              <TextButton
                onClick={copyNote.bind(null, item)}
                variant='secondary'
                className='opacity-0 transition duration-300 ease-in-out group-focus-within:opacity-100 group-hover:opacity-100'
              >
                {_('Copy')}
              </TextButton>

              {(item.note || item.type === 'bookmark') && (
                <TextButton
                  onClick={item.type === 'bookmark' ? editBookmark : editNote.bind(null, item)}
                  variant='primary'
                  className='opacity-0 transition duration-300 ease-in-out group-focus-within:opacity-100 group-hover:opacity-100'
                >
                  {_('Edit')}
                </TextButton>
              )}

              <TextButton
                onClick={deleteNote.bind(null, item)}
                variant='danger'
                className='opacity-0 transition duration-300 ease-in-out group-focus-within:opacity-100 group-hover:opacity-100'
              >
                {_('Delete')}
              </TextButton>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

export default BooknoteItem;
