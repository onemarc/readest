import clsx from 'clsx';
import React from 'react';

import { FiSearch } from 'react-icons/fi';
import { LuNotebookPen, LuCopy } from 'react-icons/lu';
import { MdArrowBackIosNew, MdOutlinePushPin, MdPushPin, MdContentCopy } from 'react-icons/md';
import { BsCheckAll } from 'react-icons/bs';
import { FaRegCheckSquare, FaTrashAlt } from "react-icons/fa";
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { BookNote } from '@/types/book';

const NotebookHeader: React.FC<{
  isPinned: boolean;
  isSearchBarVisible: boolean;
  isMultiSelectMode: boolean;
  hasSelection: boolean;
  selectedCount: number;
  isAllSelected: boolean;
  allNotes: BookNote[];
  notebookWidth: string;
  handleClose: () => void;
  handleTogglePin: () => void;
  handleToggleSearchBar: () => void;
  handleToggleMultiSelect: () => void;
  handleSelectAll: () => void;
  handleDeleteSelected: () => void;
  handleCopySelected: () => void;
}> = ({ 
  isPinned, 
  isSearchBarVisible, 
  isMultiSelectMode,
  hasSelection,
  selectedCount,
  isAllSelected,
  allNotes,
  notebookWidth,
  handleClose, 
  handleTogglePin, 
  handleToggleSearchBar,
  handleToggleMultiSelect,
  handleSelectAll,
  handleDeleteSelected,
  handleCopySelected
}) => {
  const _ = useTranslation();
  const iconSize14 = useResponsiveSize(14);
  const iconSize18 = useResponsiveSize(18);
  
  // Calculate if we should show labels based on sidebar width
  const widthPercent = parseFloat(notebookWidth);
  const shouldShowLabels = widthPercent > 35; // Show labels when sidebar is wider than 35%
  return (
    <div className='notebook-header relative flex h-11 items-center px-3' dir='ltr'>
      {/* Left side - back button or Pin button */}
      <div className='flex items-center gap-x-2'>
        {!isMultiSelectMode && (
          <>
            <button
              onClick={handleTogglePin}
              className={clsx(
                'btn btn-ghost btn-circle hidden h-6 min-h-6 w-6 sm:flex',
                isPinned ? 'bg-base-300' : 'bg-base-300/65',
              )}
            >
              {isPinned ? <MdPushPin size={iconSize14} /> : <MdOutlinePushPin size={iconSize14} />}
            </button>
            <button
              onClick={handleClose}
              className={'btn btn-ghost btn-circle flex h-6 min-h-6 w-6 hover:bg-transparent sm:hidden'}
            >
              <MdArrowBackIosNew />
            </button>
          </>
        )}
        
        {isMultiSelectMode && (
          <button
            onClick={handleToggleMultiSelect}
            className='btn btn-ghost btn-circle h-6 min-h-6 w-6'
            title={_('Exit selection')}
          >
            <MdArrowBackIosNew size={iconSize14} />
          </button>
        )}
      </div>

      {/* Center - title or selection Info */}
      <div className='flex-1 flex items-center justify-center space-x-2'>
        <LuNotebookPen size={iconSize18} />
        <div className='text-sm font-medium'>
          {isMultiSelectMode && hasSelection ? `${selectedCount} ${_('selected')}` : _('Notebook')}
        </div>
      </div>

      {/* Right side - action buttons */}
      <div className='flex items-center gap-x-2'>
        {isMultiSelectMode && (
          <>
            {allNotes.filter(note => !note.deletedAt).length > 0 && (
              <button
                onClick={handleSelectAll}
                className={clsx(
                  'btn btn-ghost h-6 min-h-6',
                  shouldShowLabels ? 'px-2' : 'w-6 p-0'
                )}
                title={isAllSelected ? _('Deselect all') : _('Select all')}
              >
                {isAllSelected ? <FaRegCheckSquare size={iconSize18} /> : <BsCheckAll size={iconSize18} />}
                {shouldShowLabels && (
                  <span className='ml-1 text-sm font-normal'>
                    {isAllSelected ? _('Deselect') : _('Select all')}
                  </span>
                )}
              </button>
            )}
            
            {hasSelection && (
              <>
                <button
                  onClick={handleCopySelected}
                  className={clsx(
                    'btn btn-ghost h-6 min-h-6',
                    shouldShowLabels ? 'px-2' : 'w-6 p-0'
                  )}
                  title={_('Copy selected')}
                >
                  <MdContentCopy size={iconSize18} />
                  {shouldShowLabels && (
                    <span className='ml-1 text-sm font-normal'>{_('Copy')}</span>
                  )}
                </button>
                
                <button
                  onClick={handleDeleteSelected}
                  className={clsx(
                    'btn btn-ghost h-6 min-h-6 text-red-500 hover:bg-red-100 hover:text-red-600',
                    shouldShowLabels ? 'px-2' : 'w-6 p-0'
                  )}
                  title={_('Delete selected')}
                >
                  <FaTrashAlt size={iconSize18} />
                  {shouldShowLabels && (
                    <span className='ml-1 text-sm font-normal'>{_('Delete')}</span>
                  )}
                </button>
              </>
            )}
          </>
        )}
        
        {!isMultiSelectMode && (
          <>
            <button
              onClick={handleToggleSearchBar}
              className={clsx('btn btn-ghost h-6 min-h-6 w-6 p-0', isSearchBarVisible && 'bg-base-300')}
              title={_('Search')}
            >
              <FiSearch size={iconSize18} />
            </button>
            
            <button
              onClick={handleToggleMultiSelect}
              className='btn btn-ghost h-6 min-h-6 w-6 p-0'
              title={_('Select notes')}
            >
              <FaRegCheckSquare size={iconSize18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NotebookHeader;
