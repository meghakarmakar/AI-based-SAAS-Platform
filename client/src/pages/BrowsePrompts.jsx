import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { promptMarketplaceService } from '../services/promptMarketplaceService';
import toast from 'react-hot-toast';
import { Search, Star, ShoppingCart, Filter } from 'lucide-react';
import PromptDetailsModal from '../components/PromptDetailsModal';

const BrowsePrompts = () => {
    const [prompts, setPrompts] = useState([]);
    const [filteredPrompts, setFilteredPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { getToken } = useAuth();
    const { user } = useUser();

    const categories = ['All', 'Writing', 'Marketing', 'Development', 'Design', 'Business', 'Education', 'Other'];

    // Helper function to truncate description to ~4 words
    const truncateDescription = (text, wordLimit = 4) => {
        if (!text) return '';
        const words = text.trim().split(/\s+/);
        if (words.length <= wordLimit) return text;
        return words.slice(0, wordLimit).join(' ') + '...';
    };

    const fetchPrompts = async () => {
        try {
            const token = await getToken();
            const data = await promptMarketplaceService.getLivePrompts(token);
            if (data.success) {
                setPrompts(data.prompts);
                setFilteredPrompts(data.prompts);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchPrompts();
        }
    }, [user]);

    useEffect(() => {
        let filtered = [...prompts];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(prompt =>
                prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                prompt.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                prompt.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Category filter
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(prompt => prompt.category === selectedCategory);
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'popular':
                filtered.sort((a, b) => (b.orders?.length || 0) - (a.orders?.length || 0));
                break;
            default:
                break;
        }

        setFilteredPrompts(filtered);
    }, [searchTerm, selectedCategory, sortBy, prompts]);

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
                <h1 className='text-2xl font-semibold text-gray-800'>Browse Prompts Marketplace</h1>
                <div className='text-sm text-gray-500'>
                    {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''} available
                </div>
            </div>

            {/* Search and Filters */}
            <div className='bg-white rounded-lg p-4 border border-gray-200 space-y-4'>
                <div className='flex flex-col md:flex-row gap-4'>
                    {/* Search */}
                    <div className='flex-1 relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                        <input
                            type='text'
                            placeholder='Search prompts...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                    </div>

                    {/* Category Filter */}
                    <div className='flex items-center gap-2'>
                        <Filter className='w-4 h-4 text-gray-500' />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                        <option value='newest'>Newest First</option>
                        <option value='oldest'>Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Prompts Grid */}
            {filteredPrompts.length === 0 ? (
                <div className='bg-white rounded-lg p-12 text-center border border-gray-200'>
                    <p className='text-gray-500 text-lg mb-2'>No prompts found</p>
                    <p className='text-gray-400 text-sm'>Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {filteredPrompts.map((prompt) => (
                        <div
                            key={prompt._id}
                            className='bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'
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
                            <div className='p-5'>
                                <div className='flex items-start justify-between mb-3'>
                                    <div className='flex-1'>
                                        <h3 className='font-semibold text-gray-900 text-lg mb-1'>
                                            {prompt.name}
                                        </h3>
                                        <span className='inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded'>
                                            {prompt.category}
                                        </span>
                                    </div>
                                </div>

                                <p className='text-sm text-gray-600 mb-4'>
                                    {truncateDescription(prompt.shortDescription)}
                                </p>

                                <div className='flex items-center justify-end pt-4 border-t border-gray-200'>
                                    <button 
                                        onClick={() => {
                                            setSelectedPrompt(prompt);
                                            setIsModalOpen(true);
                                        }}
                                        className='px-4 py-2 bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium'
                                    >
                                        <ShoppingCart className='w-4 h-4' />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Prompt Details Modal */}
            <PromptDetailsModal 
                prompt={selectedPrompt}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedPrompt(null);
                }}
            />
        </div>
    );
};

export default BrowsePrompts;
