const CROPS = [
  { value: 'potato', label: 'Potato', emoji: '🥔' },
  { value: 'tomato', label: 'Tomato', emoji: '🍅' },
  { value: 'pepper', label: 'Pepper', emoji: '🌶️' },
]

const CropSelector = ({value, onChange}) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-center text-slate-400 uppercase tracking-wider">
                Select Crop 
            </label>
            <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="
            w-full px-4 py-3 rounded-xl
            bg-slate-800 border border-slate-700
            text-slate-100 text-base
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            cursor-pointer
            transition-colors duration-150
            ">
                <option value="">Choose a crop</option>
                {CROPS.map(({ value, label, emoji }) => (
                    <option key={value} value={value}>
                        {emoji} {label}
                    </option>
                    ))}
            </select>
        </div>
    )
}

export default CropSelector