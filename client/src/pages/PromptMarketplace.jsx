import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { promptAdminService } from '../services/promptAdminService';
import toast from 'react-hot-toast';
import { ChevronDown, Trash2, X } from 'lucide-react';

const PromptMarketplace = () => {
    const [prompts, setPrompts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const { getToken } = useAuth();
    const { user } = useUser();

    const fetchPrompts = async () => {
        try {
            const token = await getToken();
            const data = await promptAdminService.getAllPrompts(token);
            if (data.success) {
                setPrompts(data.prompts);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const fetchStats = async () => {
        try {
            const token = await getToken();
            const data = await promptAdminService.getPromptStats(token);
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const token = await getToken();
            const data = await promptAdminService.updatePromptStatus(
                selectedPrompt._id,
                newStatus,
                token
            );
            if (data.success) {
                toast.success(data.message);
                await fetchPrompts();
                await fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setShowStatusModal(false);
            setSelectedPrompt(null);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this prompt?')) return;

        try {
            const token = await getToken();
            const data = await promptAdminService.deletePrompt(id, token);
            if (data.success) {
                toast.success(data.message);
                await fetchPrompts();
                await fetchStats();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        if (user) {
            Promise.all([fetchPrompts(), fetchStats()]).finally(() =>
                setLoading(false)
            );
        }
    }, [user]);

    if (loading) {
        return (
            <div className='flex justify-center items-center h-full'>
                <span className='w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin'></span>
            </div>
        );
    }

    return (
        <div className='h-full overflow-y-scroll p-6'>
            <div className='flex items-center justify-between mb-4'>
                <h1 className='text-2xl font-semibold text-gray-800'>
                    Prompt Management
                </h1>
            </div>

            {stats && (
                <div className='grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4'>
                    <div className='bg-white rounded-lg p-4 border border-gray-200'>
                        <p className='text-sm text-gray-500'>Total Prompts</p>
                        <p className='text-2xl font-semibold text-gray-800'>
                            {stats.total}
                        </p>
                    </div>
                    <div className='bg-white rounded-lg p-4 border border-gray-200'>
                        <p className='text-sm text-gray-500'>Pending</p>
                        <p className='text-2xl font-semibold text-yellow-600'>
                            {stats.pending}
                        </p>
                    </div>
                    <div className='bg-white rounded-lg p-4 border border-gray-200'>
                        <p className='text-sm text-gray-500'>Live</p>
                        <p className='text-2xl font-semibold text-green-600'>
                            {stats.live}
                        </p>
                    </div>
                    <div className='bg-white rounded-lg p-4 border border-gray-200'>
                        <p className='text-sm text-gray-500'>Declined</p>
                        <p className='text-2xl font-semibold text-red-600'>
                            {stats.declined}
                        </p>
                    </div>
                </div>
            )}

            <div className='bg-white rounded-xl border border-gray-200 overflow-hidden mt-4'>
                <div className='overflow-x-auto'>
                    <table className='w-full'>
                        <thead className='bg-gray-50 border-b border-gray-200'>
                            <tr>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Preview
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Name
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    User Email
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Status
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                            {prompts.map((prompt) => (
                                <tr
                                    key={prompt._id}
                                    className='hover:bg-gray-50 transition-colors'
                                >
                                    <td className='px-4 py-3'>
                                        {prompt.previewImage ? (
                                            <img 
                                                src={prompt.previewImage.url} 
                                                alt={prompt.name}
                                                onClick={() => setSelectedImage(prompt.previewImage.url)}
                                                className='w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity'
                                            />
                                        ) : (
                                            <div className='w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center'>
                                                <span className='text-xs text-gray-400'>No image</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div>
                                            <p className='text-sm font-medium text-gray-900'>
                                                {prompt.name}
                                            </p>
                                            <p className='text-xs text-gray-500 mt-1'>
                                                {prompt.shortDescription}
                                            </p>
                                        </div>
                                    </td>
                                    <td className='px-4 py-3 text-sm text-gray-500'>
                                        {prompt.sellerEmail || 'N/A'}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                prompt.status === 'Live'
                                                    ? 'bg-green-100 text-green-700'
                                                    : prompt.status === 'Pending'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {prompt.status}
                                        </span>
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div className='flex items-center gap-2'>
                                            <button
                                                onClick={() => {
                                                    setSelectedPrompt(prompt);
                                                    setShowStatusModal(true);
                                                }}
                                                className='px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors'
                                            >
                                                Change Status
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(prompt._id)
                                                }
                                                className='p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors'
                                            >
                                                <Trash2 className='w-4 h-4' />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {prompts.length === 0 && (
                    <div className='text-center py-12 text-gray-500'>
                        No prompts found
                    </div>
                )}
            </div>

            {selectedImage && (
                <div 
                    className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4'
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className='relative max-w-4xl max-h-[90vh]'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className='absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors'
                        >
                            <X className='w-8 h-8' />
                        </button>
                        <img 
                            src={selectedImage} 
                            alt='Preview'
                            className='max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl'
                        />
                    </div>
                </div>
            )}

            {showStatusModal && selectedPrompt && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
                        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                            Change Status
                        </h3>
                        <p className='text-sm text-gray-600 mb-4'>
                            Current status:{' '}
                            <span className='font-medium'>
                                {selectedPrompt.status}
                            </span>
                        </p>
                        <div className='flex flex-col gap-2'>
                            <button
                                onClick={() => handleStatusChange('Pending')}
                                className='w-full px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors'
                            >
                                Set as Pending
                            </button>
                            <button
                                onClick={() => handleStatusChange('Live')}
                                className='w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors'
                            >
                                Set as Live
                            </button>
                            <button
                                onClick={() => handleStatusChange('Declined')}
                                className='w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors'
                            >
                                Set as Declined
                            </button>
                            <button
                                onClick={() => {
                                    setShowStatusModal(false);
                                    setSelectedPrompt(null);
                                }}
                                className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors mt-2'
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptMarketplace;
