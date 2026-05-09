const CONFIDENCE_THRESHOLDS = { high: 0.85, medium: 0.65 }

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100)
  const barColor =
    pct >= CONFIDENCE_THRESHOLDS.high * 100
      ? 'bg-emerald-500'
      : pct >= CONFIDENCE_THRESHOLDS.medium * 100
        ? 'bg-amber-400'
        : 'bg-red-500'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Confidence</span>
        <span className="font-semibold text-slate-200">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function PredictionResult({ result, onReset }) {
  const isHealthy = result.prediction.toLowerCase().includes('healthy')

  return (
    <div className={`
      rounded-xl border p-6 flex flex-col gap-4
      ${isHealthy
        ? 'bg-emerald-950/40 border-emerald-700'
        : 'bg-red-950/30 border-red-800'
      }
    `}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Result — {result.plant}
        </span>
        <span className="text-2xl">{isHealthy ? '✅' : '⚠️'}</span>
      </div>

      <div>
        <p className="text-slate-400 text-sm mb-1">Detected condition</p>
        <p className={`text-2xl font-bold ${isHealthy ? 'text-emerald-400' : 'text-red-300'}`}>
          {result.prediction}
        </p>
      </div>

      <ConfidenceBar confidence={result.confidence} />

      <button
        onClick={onReset}
        className="
          mt-2 w-full py-2.5 rounded-lg
          border border-slate-600 text-slate-300
          hover:bg-slate-700 hover:text-white
          text-sm font-medium transition-colors duration-150
          cursor-pointer
        "
      >
        Analyze another image
      </button>
    </div>
  )
}
