import React from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Plan = () => {
  const { openSignIn } = useClerk()
  const { user } = useUser()
  const navigate = useNavigate()

  const handlePremiumClick = () => {
    if (user) {
      navigate('/ai/profile/billing')
      return
    }

    openSignIn()
  }

  return (
    <div className='max-w-5xl mx-auto z-20 my-30 px-4 sm:px-6'>

      <div className='text-center'>
        <h2 className='text-slate-700 text-[42px] font-semibold'>Choose Your Plan</h2>
        <p className='text-gray-500 max-w-lg mx-auto'>Start for free and scale up as you grow. Find the perfect plan for your content creation needs.</p>
      </div>

      <div className='mt-14 grid gap-6 lg:grid-cols-2'>
        <div className='rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]'>
          <div className='inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'>Free</div>
          <h3 className='mt-5 text-2xl font-semibold text-slate-800'>Create with a generous free tier</h3>
          <p className='mt-3 text-sm leading-6 text-gray-500'>Try the core AI tools, build your workflow, and upgrade only when you need premium generation.</p>
          <div className='mt-6 flex items-end gap-2'>
            <span className='text-4xl font-semibold text-slate-800'>$0</span>
            <span className='pb-1 text-sm text-gray-500'>/month</span>
          </div>
          <ul className='mt-6 space-y-3 text-sm text-slate-600'>
            <li className='flex items-center gap-3'><Check className='h-4 w-4 text-emerald-500' /> Article generation</li>
            <li className='flex items-center gap-3'><Check className='h-4 w-4 text-emerald-500' /> Blog title generation</li>
            <li className='flex items-center gap-3'><Check className='h-4 w-4 text-emerald-500' /> Community browsing</li>
            <li className='flex items-center gap-3'><Check className='h-4 w-4 text-emerald-500' /> Dashboard creation history</li>
          </ul>
          <button
            type='button'
            onClick={() => navigate(user ? '/ai' : '/')}
            className='mt-8 w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
          >
            Start free
          </button>
        </div>

        <div className='relative overflow-hidden rounded-3xl border border-[#8A4BFF] bg-[linear-gradient(135deg,#7A39F7_0%,#4B8BFF_100%)] p-8 text-white shadow-[0_24px_60px_rgba(72,91,255,0.28)]'>
          <div className='absolute inset-x-0 top-0 h-20 bg-white/10 blur-3xl' />
          <div className='relative'>
            <div className='inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90'>Premium</div>
            <h3 className='mt-5 text-2xl font-semibold'>Unlock the full toolkit</h3>
            <p className='mt-3 text-sm leading-6 text-white/80'>Everything in Free, plus image generation, background removal, object removal, and resume review.</p>
            <div className='mt-6 flex items-end gap-2'>
              <span className='text-4xl font-semibold'>$19</span>
              <span className='pb-1 text-sm text-white/70'>/month</span>
            </div>
            <ul className='mt-6 space-y-3 text-sm text-white/90'>
              <li className='flex items-center gap-3'><Check className='h-4 w-4 text-white' /> AI image generation</li>
              <li className='flex items-center gap-3'><Check className='h-4 w-4 text-white' /> Background removal</li>
              <li className='flex items-center gap-3'><Check className='h-4 w-4 text-white' /> Object removal</li>
              <li className='flex items-center gap-3'><Check className='h-4 w-4 text-white' /> Resume review</li>
            </ul>
            <button
              type='button'
              onClick={handlePremiumClick}
              className='mt-8 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100'
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Plan
