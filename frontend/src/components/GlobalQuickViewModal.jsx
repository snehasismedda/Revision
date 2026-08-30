import React from 'react';
import { useQuickView } from '../context/QuickViewContext.jsx';
import FileViewerModal from './modals/FileViewerModal.jsx';
import ViewNoteModal from './modals/ViewNoteModal.jsx';
import ViewSolutionModal from './modals/ViewSolutionModal.jsx';
import ImageViewerModal from './modals/ImageViewerModal.jsx';

const GlobalQuickViewModal = () => {
    const { activeItem, setActiveItem, minimize } = useQuickView();

    if (!activeItem) return null;

    const onClose = () => setActiveItem(null);
    const onMinimize = () => {
        minimize(activeItem);
    };

    if (activeItem.type === 'file') {
        return (
            <FileViewerModal 
                isOpen={true}
                onClose={onClose}
                file={activeItem.data}
                onMinimize={onMinimize}
                isMinimized={false}
                {...activeItem.props}
            />
        );
    }

    if (activeItem.type === 'note') {
        return (
            <ViewNoteModal 
                isOpen={true}
                onClose={onClose}
                note={activeItem.data}
                subjectId={activeItem.subjectId || activeItem.data.subject_id}
                onMinimize={onMinimize}
                isMinimized={false}
                {...activeItem.props}
            />
        );
    }

    if (activeItem.type === 'solution') {
        return (
            <ViewSolutionModal 
                isOpen={true}
                onClose={onClose}
                solution={activeItem.data}
                onMinimize={onMinimize}
                isMinimized={false}
                {...activeItem.props}
            />
        );
    }

    if (activeItem.type === 'image') {
        return (
            <ImageViewerModal
                isOpen={true}
                onClose={onClose}
                imageUrl={activeItem.data?.imageUrl || activeItem.data}
                title={activeItem.title || 'Image Viewer'}
                onMinimize={onMinimize}
                isFullscreen={activeItem.props?.isFullscreen}
            />
        );
    }

    return null;
};

export default GlobalQuickViewModal;
