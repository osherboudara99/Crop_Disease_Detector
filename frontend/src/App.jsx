import { useState } from 'react'
import CropSelector from './components/CropSelector'
import ImageDropzone from './components/ImageDropzone'
import PredictionResult from './components/PredictionResult'
import { predictDisease } from './api'

export default function App() {
  const [crop, setCrop] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleFileChange(newFile) {
    setFile(newFile)
    setResult(null)
    setError(null)
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!crop || !file) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await predictDisease(crop, file)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = !!crop && !!file && !isLoading

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-none">
              Crop Disease Detector
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              AI-powered plant health analysis
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-lg flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
            <CropSelector value={crop} onChange={setCrop} />
            <ImageDropzone file={file} onFileChange={handleFileChange} />

            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {!result && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  w-full py-3.5 rounded-xl font-semibold text-base
                  transition-all duration-200
                  ${canSubmit
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  'Analyze Image'
                )}
              </button>
            )}
          </div>

          {result && (
            <PredictionResult result={result} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  )
}
