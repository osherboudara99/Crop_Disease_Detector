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
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-center gap-3 text-center">
          <span className="text-2xl leading-none">🌿</span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-100 leading-none">
              crop disease detector
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              AI-powered plant health analysis
            </p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                osher boudara
              </span>
              <a
                href="https://github.com/osherboudara99"
                target="_blank"
                rel="noreferrer"
                aria-label="Osher Boudara on GitHub"
                className="text-slate-400 hover:text-emerald-300 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.38 6.84 9.73.5.1.68-.22.68-.49v-1.91c-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.31 9.31 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.2 10.2 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/osher-boudara-a612921b5/"
                target="_blank"
                rel="noreferrer"
                aria-label="Osher Boudara on LinkedIn"
                className="text-slate-400 hover:text-sky-300 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M6.94 8.98H3.71v10.39h3.23V8.98ZM5.32 7.56a1.87 1.87 0 1 0 0-3.74 1.87 1.87 0 0 0 0 3.74Zm14.85 6.12c0-3.13-1.67-4.58-3.9-4.58-1.8 0-2.6.99-3.05 1.68v-1.8h-3.23c.04.97 0 10.39 0 10.39h3.23v-5.8c0-.31.02-.62.11-.84.23-.62.76-1.26 1.65-1.26 1.17 0 1.64.95 1.64 2.34v5.56h3.23l.32-5.69Z" />
                </svg>
              </a>
            </div>
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
