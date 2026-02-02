import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { promptSellerService } from '../services/promptSellerService';
import toast from 'react-hot-toast';
import { Edit, Trash2, Plus, X } from 'lucide-react';

const MyPrompts = () => {
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const { getToken } = useAuth();
    const { user } = useUser();

    const [formData, setFormData] = useState({
        name: '',
        shortDescription: '',
        description: '',
        category: '',
        tags: ''
    });

    const resetForm = () => {
        setFormData({
            name: '',
            shortDescription: '',
            description: '',
            category: '',
            tags: ''
        });
        setEditingPrompt(null);
        setPreviewImage(null);
        setImageFile(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchPrompts = async () => {
        try {
            const token = await getToken();
            const data = await promptSellerService.getMyPrompts(token);
            if (data.success) {
                setPrompts(data.prompts);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.shortDescription || !formData.description || !formData.category) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const token = await getToken();
            const submitData = { ...formData };

            let data;
            if (editingPrompt) {
                data = await promptSellerService.updatePrompt(editingPrompt._id, submitData, token);
                
                // Upload preview image if a new file was selected
                if (imageFile) {
                    const uploadResult = await promptSellerService.uploadPreviewImage(
                        editingPrompt._id, 
                        imageFile, 
                        token
                    );
                    if (!uploadResult.success) {
                        toast.error('Prompt updated but image upload failed: ' + uploadResult.message);
                    }
                }
            } else {
                data = await promptSellerService.createPrompt(submitData, token);
                
                // Upload preview image if provided
                if (imageFile && data.prompt) {
                    const uploadResult = await promptSellerService.uploadPreviewImage(
                        data.prompt._id, 
                        imageFile, 
                        token
                    );
                    if (!uploadResult.success) {
                        toast.error('Prompt created but image upload failed: ' + uploadResult.message);
                    }
                }
            }

            if (data.success) {
                toast.success(data.message);
                setShowModal(false);
                resetForm();
                await fetchPrompts();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleEdit = (prompt) => {
        if (prompt.status === 'Live') {
            toast.error('Cannot edit a live prompt. Please contact admin.');
            return;
        }
        setEditingPrompt(prompt);
        setFormData({
            name: prompt.name,
            shortDescription: prompt.shortDescription,
            description: prompt.description,
            category: prompt.category,
            tags: prompt.tags || ''
        });
        // Set existing preview image if available
        if (prompt.previewImage) {
            setPreviewImage(prompt.previewImage.url);
        }
        setShowModal(true);
    };

    const handleDelete = async (id, status) => {
        if (status === 'Live') {
            toast.error('Cannot delete a live prompt. Please contact admin.');
            return;
        }

        if (!confirm('Are you sure you want to delete this prompt?')) return;

        try {
            const token = await getToken();
            const data = await promptSellerService.deletePrompt(id, token);
            if (data.success) {
                toast.success(data.message);
                await fetchPrompts();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPrompts();
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
                <h1 className='text-2xl font-semibold text-gray-800'>My Prompts</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className='px-4 py-2 bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2'
                >
                    <Plus className='w-4 h-4' />
                    Submit New Prompt
                </button>
            </div>

            <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                {prompts.length === 0 ? (
                    <div className='text-center py-12'>
                        <p className='text-gray-500 mb-4'>You haven't submitted any prompts yet</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className='px-4 py-2 bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white rounded-lg hover:opacity-90 transition-opacity'
                        >
                            Submit Your First Prompt
                        </button>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4'>
                        {prompts.map((prompt) => (
                            <div
                                key={prompt._id}
                                className='border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow'
                            >
                                {prompt.previewImage && (
                                    <div className='w-full aspect-video bg-gray-100 flex items-center justify-center p-2'>
                                        <img 
                                            src={prompt.previewImage.url} 
                                            alt={prompt.name}
                                            className='max-w-full max-h-full object-contain'
                                        />
                                    </div>
                                )}
                                <div className='p-4'>
                                    <div className='flex items-start justify-between mb-3'>
                                        <h3 className='font-semibold text-gray-900 text-lg'>
                                            {prompt.name}
                                        </h3>
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
                                    </div>

                                    <p className='text-sm text-gray-600 mb-3 line-clamp-2'>
                                        {prompt.shortDescription}
                                    </p>

                                    <div className='flex items-center justify-end mb-3'>
                                        <span className='text-xs text-gray-500'>
                                            {prompt.category}
                                        </span>
                                    </div>

                                    <div className='flex items-center gap-2 pt-3 border-t border-gray-200'>
                                        <button
                                            onClick={() => handleEdit(prompt)}
                                            disabled={prompt.status === 'Live'}
                                            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                                                prompt.status === 'Live'
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        >
                                            <Edit className='w-4 h-4 inline mr-1' />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(prompt._id, prompt.status)}
                                            disabled={prompt.status === 'Live'}
                                            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                                                prompt.status === 'Live'
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                            }`}
                                        >
                                            <Trash2 className='w-4 h-4 inline mr-1' />
                                            Delete
                                        </button>
                                    </div>

                                    {prompt.status === 'Declined' && (
                                        <p className='mt-2 text-xs text-red-600 bg-red-50 p-2 rounded'>
                                            This prompt was declined. You can edit and resubmit.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                    <div className='bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-xl font-semibold text-gray-900'>
                                {editingPrompt ? 'Edit Prompt' : 'Submit New Prompt'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className='p-1 hover:bg-gray-100 rounded transition-colors'
                            >
                                <X className='w-5 h-5 text-gray-500' />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Preview Image
                                </label>
                                <input
                                    type='file'
                                    accept='image/*'
                                    onChange={handleImageChange}
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                />
                                {previewImage && (
                                    <div className='mt-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center p-2'>
                                        <img 
                                            src={previewImage} 
                                            alt='Preview' 
                                            className='max-w-full max-h-64 object-contain rounded-lg'
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Prompt Name *
                                </label>
                                <input
                                    type='text'
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='e.g., Professional Email Writer'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Short Description *
                                </label>
                                <input
                                    type='text'
                                    value={formData.shortDescription}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            shortDescription: e.target.value
                                        })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='Brief one-line description'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Full Description *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value
                                        })
                                    }
                                    rows='4'
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='Detailed description of your prompt...'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Category *
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    required
                                >
                                    <option value=''>Select a category</option>
                                    <option value='Writing'>Writing</option>
                                    <option value='Marketing'>Marketing</option>
                                    <option value='Development'>Development</option>
                                    <option value='Design'>Design</option>
                                    <option value='Business'>Business</option>
                                    <option value='Education'>Education</option>
                                    <option value='Other'>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Tags (comma-separated)
                                </label>
                                <input
                                    type='text'
                                    value={formData.tags}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tags: e.target.value })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='email, professional, business'
                                />
                            </div>

                            <div className='flex gap-3 pt-4'>
                                <button
                                    type='submit'
                                    className='flex-1 px-4 py-2 bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white rounded-lg hover:opacity-90 transition-opacity font-medium'
                                >
                                    {editingPrompt ? 'Update Prompt' : 'Submit for Review'}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium'
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPrompts;
