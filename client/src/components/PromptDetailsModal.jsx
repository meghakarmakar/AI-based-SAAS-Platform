import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const PromptDetailsModal = ({ prompt, isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';
            
            // Handle Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            
            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen || !prompt) return null;

    return (
        <div 
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
            onClick={onClose}
        >
            <div 
                className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Close Button */}
                <div className='sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg'>
                    <h2 className='text-xl font-semibold text-gray-900'>Prompt Details</h2>
                    <button
                        onClick={onClose}
                        className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                    >
                        <X className='w-5 h-5' />
                    </button>
                </div>

                {/* Content */}
                <div className='p-6'>
                    {/* Preview Image */}
                    {prompt.previewImage && (
                        <div className='w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6'>
                            <img 
                                src={prompt.previewImage.url} 
                                alt={prompt.name}
                                className='w-full h-full object-contain'
                            />
                        </div>
                    )}

                    {/* Title and Category */}
                    <div className='mb-4'>
                        <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                            {prompt.name}
                        </h3>
                        <span className='inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded'>
                            {prompt.category}
                        </span>
                    </div>

                    {/* Full Description */}
                    <div className='mb-6'>
                        <h4 className='text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                            Description
                        </h4>
                        <p className='text-base text-gray-700 leading-relaxed whitespace-pre-wrap'>
                            {prompt.description || prompt.shortDescription}
                        </p>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default PromptDetailsModal;
