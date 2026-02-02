import { useAuth } from '@clerk/clerk-react';
import { Hash, Sparkles } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import Markdown from 'react-markdown'
import axios from 'axios'
import OptimizePromptButton from '../components/ai/OptimizePromptButton'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const BlogTitles = () => {

  const blogCategories = ['General',  'Technology', 'Business', 'Health', 'Lifestyle', 'Education', 'Travel', 'Food']
  
    const [selectedCategory, setSelectedCategory] = useState('General')
    const [input, setInput] = useState('')

    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState('')

    const {getToken} = useAuth()
    const textareaRef = useRef(null)
  
    // Auto-resize textarea based on content
    useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto'
        // Set height to scrollHeight to fit content
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [input]) // Re-run when input changes
  
    const onSubmitHandler = async (e)=>{
      e.preventDefault();
      try {
         setLoading(true)
         // Enhanced prompt with explicit formatting instructions to prevent truncation
         const prompt = `Generate ONLY a complete blog title (no numbering, no explanations, no prefixes like "Title:") for the keyword "${input}" in the category "${selectedCategory}". Return ONLY the full title text as a single line.`

         const { data } = await axios.post('/api/ai/generate-blog-title', {prompt}, {headers: {Authorization: `Bearer ${await getToken()}`}})

         if (data.success) {
          // Debug logging to verify full content received
          console.log('[BlogTitles] Received full content:', data.content);
          setContent(data.content)
         }else{
          toast.error(data.message)
         }
      } catch (error) {
        toast.error(error.message)
      }
      setLoading(false)
    }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>
      {/* left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>
          <div className='flex items-center gap-3'>
            <Sparkles className='w-6 text-[#8E37EB]'/>
            <h1 className='text-xl font-semibold'>AI Title Generator</h1>
          </div>
          <p className='mt-6 text-sm font-medium'>Keyword</p>

          <textarea 
            ref={textareaRef}
            onChange={(e)=>setInput(e.target.value)} 
            value={input} 
            rows={1}
            className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 resize-none overflow-hidden min-h-[42px] max-h-[200px]' 
            placeholder='The future of artificial intelligence is...' 
            required
            style={{ height: 'auto' }}
          />

          <OptimizePromptButton 
            prompt={input} 
            onOptimized={(optimized) => setInput(optimized)}
            disabled={loading}
          />

          <p className='mt-4 text-sm font-medium'>Category</p>

          <div className='mt-3 flex gap-3 flex-wrap sm:max-w-9/11'>
            {blogCategories.map((item)=>(
              <span onClick={()=> setSelectedCategory(item)} 
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${selectedCategory === item ? 'bg-purple-50 text-purple-700' : 'text-gray-500 border-gray-300'}`} key={item}>{item}</span>
            ) )}
          </div>
          <br/>
          <button disabled={loading} className='w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#C341F6] to-[#8E37EB] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer'>
            {loading ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span> : <Hash className='w-5'/>}
            Generate title
          </button>
      </form>
      {/* Right col */}
      <div className='w-full max-w-lg bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-[calc(100vh-120px)]'>

            <div className='flex items-center gap-3 p-4 border-b border-gray-100'>
              <Hash className='w-5 h-5 text-[#8E37EB]' />
              <h1 className='text-xl font-semibold'>Generated titles</h1>
            </div>
            {
              !content ? (
                <div className='flex-1 flex justify-center items-center p-4'>
                  <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
                    <Hash className='w-9 h-9' />
                    <p>Enter a topic and click “Generated title” to get started</p>
                  </div>
                </div>
              ) : (
                <div className='flex-1 min-h-0 overflow-y-auto p-4 text-sm text-slate-600'>
                  {/* Safety check: Ensure content is a valid string */}
                  {typeof content === 'string' && content.trim().length > 0 ? (
                    <div className='reset-tw'>
                      <Markdown>{content}</Markdown>
                    </div>
                  ) : (
                    <div className='text-red-500 text-sm'>
                      <p>Error: Invalid content received. Please try again.</p>
                    </div>
                  )}
                </div>
              )
            }
            
      </div>
    </div>
  )
}

export default BlogTitles
