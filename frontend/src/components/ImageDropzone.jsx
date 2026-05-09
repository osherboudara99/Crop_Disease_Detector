import { useRef, useState } from 'react'

export default function ImageDropzone({ file, onFileChange }) {
  const inputRef = useRef(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const previewUrl = file ? URL.createObjectURL(file) : null

  function handleDragOver(e) {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDraggingOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith('image/')) {
      onFileChange(dropped)
    }
  }

  function handleInputChange(e) {
    const selected = e.target.files[0]
    if (selected) onFileChange(selected)
  }

  function handleClear(e) {
    e.stopPropagation()
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Upload Image
      </label>

      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200
          flex items-center justify-center min-h-64 overflow-hidden
          ${file
            ? 'border-emerald-500 cursor-default'
            : 'border-slate-600 cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50'
          }
          ${isDraggingOver ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]' : ''}
        `}
      >
        {file && previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain max-h-72 rounded-xl"
            />
            <button
              onClick={handleClear}
              className="
                absolute top-3 right-3
                bg-slate-900/80 hover:bg-red-500
                text-slate-300 hover:text-white
                rounded-full w-8 h-8 flex items-center justify-center
                text-sm font-bold transition-colors duration-150
                border border-slate-600 hover:border-red-500
              "
              title="Remove image"
            >
              ✕
            </button>
          </>
        ) : (
          <div className={`flex flex-col items-center gap-3 p-8 text-center select-none transition-transform duration-200 ${isDraggingOver ? 'scale-105' : ''}`}>
            <div className="text-5xl">📷</div>
            <p className="text-slate-300 font-medium">
              {isDraggingOver ? 'Drop it here!' : 'Drag & drop your image here'}
            </p>
            <p className="text-slate-500 text-sm">or click to browse files</p>
            <p className="text-slate-600 text-xs">PNG, JPG, JPEG supported</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
