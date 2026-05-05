import { useState } from 'react'
// import CropSelector from './components/CropSelector'
// import ImageDropzone from './components/ImageDropzone'
// import PredictionResult from './components/PredictionResult'
import { predictDisease } from './api'

const App = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-5">
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
    </div>
  )
}

export default App;
