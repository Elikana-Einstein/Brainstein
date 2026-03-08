import React from 'react'

// I have fixed onClear and onSave props are now wired up from Whiteboard
const Buttons = ({ onClear, onSave }) => {
  return (
    <div className='mt-3 relative flex flex-row gap-x-4'>
      <button
        onClick={onClear}
        className="relative p-2 text-white font-semibold rounded-lg overflow-hidden bg-purple-600 hover:shadow-lg group"
      >
        <span className="relative z-10">Clear all</span>
        <div className="absolute inset-0 bg-orange-800 transform -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
      </button>

      <button
        onClick={onSave}
        className="relative p-2 text-white font-semibold rounded-lg overflow-hidden bg-green-600 hover:shadow-lg group"
      >
        <span className="relative z-10">Save</span>
        <div className="absolute inset-0 bg-green-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
      </button>
    </div>
  )
}

export default Buttons