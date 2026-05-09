# Crop Disease Detector — Frontend

A modern React + Vite + Tailwind CSS app for AI-powered plant disease detection. Users select a crop, drag-and-drop or upload a leaf image, and receive a disease prediction with a confidence score from the FastAPI backend.

## Tech Stack

- **React 19** with Vite 8
- **Tailwind CSS v4** (Vite plugin, no config file needed)
- **FastAPI backend** at `http://localhost:8000` (see `/api`)

---

## Background Concepts

Before diving into the steps, it helps to understand a few terms that come up throughout this build.

### What is a component?

In React, a **component** is a self-contained piece of UI. It's just a JavaScript function that returns HTML-like markup (called JSX). You break your UI into components for the same reason you break code into functions — so each piece has one clear job, can be tested independently, and can be reused. In this app, the dropdown, the dropzone, and the result card are each their own component.

### What is state?

**State** is data that can change over time and that React needs to track so it knows when to re-render the UI. Examples here: the currently selected crop, the image file the user picked, whether a request is loading. When state changes, React automatically re-renders only the parts of the UI that depend on that state.

### What is a prop?

**Props** (short for properties) are how a parent component passes data *down* to a child component. They are read-only from the child's perspective. For example, `App` holds the `crop` state and passes it to `CropSelector` as a prop. The child can't change it directly — instead it calls a callback function (also passed as a prop) to ask the parent to update it.

### What is a controlled component?

A **controlled component** is one where React owns the value, not the DOM. Instead of the browser tracking what's in an `<input>` or `<select>`, you store the value in state and pass it back to the element as a prop. Every keystroke or selection triggers `onChange`, which updates state, which re-renders the element with the new value. This makes the UI a perfect reflection of your state at all times.

### What is lifting state up?

When two components need to share the same piece of data, you move that state into their nearest common parent and pass it down as props. In this app, `App.jsx` is the parent that owns all state — the selected crop, the uploaded file, the result — and passes it down to each child component. This pattern is called **lifting state up**.

---

## Build Roadmap

---

### Phase 1 — Configuration

Configuration comes first because everything else depends on it. You cannot write components or make API calls until your tools (Vite, Tailwind) are set up correctly and your environment variables are accessible to the app.

---

#### Step 1 — Fix `.env`

**What is a `.env` file?**

A `.env` file stores environment variables — configuration values that can differ between environments (your laptop vs. a production server) without changing any code. You commit the code but not the `.env`, so sensitive values like API keys never end up in version control.

**Why we need to fix it**

The existing `.env` uses the `REACT_APP_` prefix, which is a Create React App convention. Vite has its own convention: variables must start with `VITE_` to be exposed to client-side code. This is a deliberate security measure — without the prefix, Vite will not bundle the variable into your JavaScript at all, so it will be `undefined` at runtime. Any variable without the prefix is treated as a server-side secret and kept out of the browser bundle entirely.

Replace `frontend/.env` with:

```
VITE_API_URL=http://localhost:8000
```

In your code you'd access it as `import.meta.env.VITE_API_URL`. In this project we're using a dev proxy (Step 3) instead of using this variable directly in fetch calls, but it's still good practice to have it defined for when you deploy.

---

#### Step 2 — Install Tailwind CSS v4

**What is Tailwind CSS?**

Tailwind is a utility-first CSS framework. Instead of writing separate CSS files with class names like `.card` or `.dropdown`, you apply small single-purpose classes directly on your HTML elements: `flex`, `gap-4`, `rounded-xl`, `text-slate-400`. Each class does exactly one thing.

The main benefit is that you never have to context-switch between a `.jsx` file and a `.css` file. The styling lives right next to the markup. It also eliminates the problem of CSS growing unbounded — unused classes are automatically removed at build time, so your final CSS file contains only what you actually used.

**Why v4 specifically?**

Tailwind v4 is a major rewrite. In v3 you needed a `tailwind.config.js` file, a PostCSS pipeline, and an `@tailwind base/components/utilities` directive in your CSS. In v4 all of that is replaced by a single Vite plugin and a single `@import "tailwindcss"` line in your CSS. There is no config file to maintain. It is also significantly faster at build time.

```bash
npm install tailwindcss @tailwindcss/vite
```

This installs two packages: the core Tailwind CSS library and the official Vite plugin that integrates it into the Vite build pipeline.

---

#### Step 3 — Update `vite.config.js`

**What is Vite?**

Vite is the build tool that powers this project. During development it runs a local server with hot module replacement (HMR) — when you save a file, the browser updates in under a second without a full page reload. For production it bundles all your JavaScript and CSS into optimised static files.

**What is `vite.config.js`?**

This file is where you configure Vite's behaviour: which plugins to use, how to handle imports, how the dev server should behave, etc.

**Why add the Tailwind plugin here?**

Plugins extend Vite's capabilities. The `@tailwindcss/vite` plugin tells Vite to process your CSS through Tailwind during compilation, so all those utility classes get resolved into real CSS rules. Without it, classes like `bg-slate-950` would produce no styles at all — Vite would just pass your CSS through unchanged.

**What is the dev proxy and why do we need it?**

This is the most important configuration here, so let's understand it properly.

Your React app runs on `http://localhost:5173` (Vite's default port). Your FastAPI backend runs on `http://localhost:8000`. These are different **origins** (protocol + host + port). When a browser makes a fetch request from one origin to another, the browser enforces a security policy called **CORS (Cross-Origin Resource Sharing)**. The browser first sends a preflight request asking the server "are you OK with receiving requests from `localhost:5173`?" If the server doesn't respond with the right headers, the browser blocks the request entirely.

The dev proxy sidesteps this entirely. Instead of your React app fetching `http://localhost:8000/predict` directly, you fetch `/api/predict` — a path on your *own* origin. Vite intercepts that request server-side (outside the browser) and forwards it to FastAPI. The browser never sees a cross-origin request, so CORS never comes into play during development.

The `rewrite` function strips the `/api` prefix before forwarding: `/api/predict` becomes `/predict`, which matches the FastAPI route exactly.

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',   // forward to FastAPI
        changeOrigin: true,                // rewrite the Host header
        rewrite: (path) => path.replace(/^\/api/, ''),  // /api/predict → /predict
      },
    },
  },
})
```

In production, you'll use real CORS headers on the backend (Step 10) or deploy both on the same domain.

---

#### Step 4 — Update `src/index.css`

**Why does this file exist?**

`index.css` is the global stylesheet that gets imported in `main.jsx` and applied to every page. It's the right place for styles that aren't specific to any one component — things like the base background colour, default font, and box-sizing reset.

**What is `box-sizing: border-box`?**

By default, CSS calculates element widths *excluding* padding and border. So a `width: 200px` element with `padding: 20px` is actually 240px wide. This is confusing. `border-box` makes the width *include* padding and borders, which is almost always what you intuitively want. Applying it to `*` (every element) via the reset is standard practice in modern CSS.

**Why `min-height: 100vh`?**

`100vh` means 100% of the viewport height (the visible browser window). Setting it on `body` ensures the dark background colour fills the entire screen even if the page content is short. Without it, you'd see the browser's white default background below short pages.

Replace `frontend/src/index.css` entirely, and delete `App.css` — all styling will now come from Tailwind classes applied directly in JSX.

```css
@import "tailwindcss";

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f172a; /* slate-950 */
  color: #f8fafc;            /* slate-50 */
  min-height: 100vh;
}
```

---

### Phase 2 — API Layer

#### Step 5 — Create `src/api.js`

**Why isolate API calls in their own file?**

Separation of concerns. Components should be responsible for rendering UI and responding to user interactions — not for knowing how to format HTTP requests, handle status codes, or parse error responses. By putting all network logic in `api.js`, you get a single place to update if the API changes, and your components stay clean and focused.

**What is `FormData`?**

`FormData` is a browser API for constructing `multipart/form-data` payloads — the same format used by HTML `<form>` elements with file inputs. It's the standard way to send binary file data (like an image) alongside other fields in a single HTTP request. The FastAPI backend uses `python-multipart` to parse this format on the server side.

**Why not set `Content-Type` manually?**

When you use `FormData` as the request body, the browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`. The `boundary` value is a randomly generated string that separates the different parts of the body. If you manually set `Content-Type: multipart/form-data` without the boundary, the server cannot parse the body and the request will fail. So you must leave that header out entirely and let the browser handle it.

**What is `res.ok`?**

`fetch` does not throw an error for HTTP error responses like `404` or `500`. It only rejects (throws) on network failures (e.g., no internet connection). `res.ok` is `true` for any status in the `200–299` range. By checking it explicitly and throwing a meaningful error, you ensure that the component can show the user a proper error message instead of crashing or silently doing nothing.

**What is `??` (nullish coalescing)?**

`err.detail ?? 'fallback'` means: use `err.detail` if it's not `null` or `undefined`, otherwise use the fallback. It's safer than `||` because `||` also treats empty strings and `0` as falsy. FastAPI error responses include a `detail` field, so this cleanly extracts that message.

```js
export async function predictDisease(plant, imageFile) {
  const formData = new FormData()
  formData.append('file', imageFile)

  const res = await fetch(`/api/predict?plant=${plant}`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser handles it automatically with the boundary
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Request failed with status ${res.status}`)
  }

  return res.json()
  // Returns: { plant: "potato", prediction: "Early blight", confidence: 0.95 }
}
```

---

### Phase 3 — Components

**Why split into these specific components?**

Each component below has a single responsibility:
- `CropSelector` — owns the crop dropdown UI
- `ImageDropzone` — owns all file input logic and preview
- `PredictionResult` — owns the display of a completed prediction

`App.jsx` owns all the *data* (state) but none of the *presentation* detail. This separation makes each piece easy to reason about in isolation and easy to update without touching unrelated code.

**Component tree:**

```
App.jsx                     ← holds all state, orchestrates data flow
├── <header>                ← static markup, inlined directly in App
├── CropSelector.jsx        ← controlled select dropdown
├── ImageDropzone.jsx       ← drag-drop zone + hidden file input + image preview
└── PredictionResult.jsx    ← result card + confidence bar + reset button
```

---

#### Step 6 — `src/components/CropSelector.jsx`

**What concept is demonstrated here: controlled components**

This component is a **controlled component**. Notice that it receives `value` as a prop (from App's state) and calls `onChange` to notify the parent when the user picks something new. The component never stores the selected value itself — it's always driven from outside. This means App is always the single source of truth for which crop is selected. If you needed to reset the dropdown from the parent (e.g., after a submission), you just set the state to `''` and the dropdown automatically shows the placeholder again.

**What is the `CROPS` array for?**

Rather than hardcoding three `<option>` tags, we define the crop data as a JavaScript array of objects at the top of the file. Then we `.map()` over it to generate the options. This is the standard React pattern for rendering lists from data. If the backend adds a new crop (corn, rice, etc.), you only update the array — the rendering logic stays the same.

**What does `key` do?**

When rendering a list with `.map()`, React needs a stable unique identifier for each item so it can efficiently update the DOM when the list changes. Without `key`, React warns you in the console and may produce incorrect behaviour. We use the crop's `value` string (e.g., `'potato'`) since it's guaranteed unique.

**What does `appearance-none` do?**

By default, `<select>` elements have browser-native styling (a dropdown arrow, OS-specific colours) that is very hard to customise with CSS. `appearance-none` removes all of that default styling, giving us full control. You'd normally add a custom arrow icon back in via CSS, but for now the select is clean and functional.

```jsx
const CROPS = [
  { value: 'potato', label: 'Potato', emoji: '🥔' },
  { value: 'tomato', label: 'Tomato', emoji: '🍅' },
  { value: 'pepper', label: 'Pepper', emoji: '🌶️' },
]

export default function CropSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
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
          cursor-pointer appearance-none
          transition-colors duration-150
        "
      >
        <option value="">— Choose a crop —</option>
        {CROPS.map(({ value, label, emoji }) => (
          <option key={value} value={value}>
            {emoji} {label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

#### Step 7 — `src/components/ImageDropzone.jsx`

**What concepts are demonstrated here: refs, drag events, object URLs**

This is the most complex component. It introduces three important concepts.

**`useRef` — imperative access to a DOM element**

React is declarative — you describe what you want and React updates the DOM. But occasionally you need to imperatively call a method on a DOM element, like `.click()` on a file input. `useRef` gives you a stable reference to the actual DOM node. Here, `inputRef.current` points to the hidden `<input type="file">` element, so clicking anywhere on the dropzone div can programmatically trigger the file picker.

**The HTML Drag and Drop API**

The browser fires a sequence of events as the user drags a file over a drop target:
- `dragover` — fires continuously while dragging over the element. You **must** call `e.preventDefault()` here or the browser will refuse to accept the drop.
- `dragleave` — fires when the dragged item leaves the element.
- `drop` — fires when the user releases the mouse. `e.dataTransfer.files` contains the dropped files. Again `e.preventDefault()` prevents the browser from navigating to the file.

We use a `isDraggingOver` state variable to visually highlight the dropzone while a file is being dragged over it.

**`URL.createObjectURL` — in-memory file preview**

After the user selects a file (via drag-drop or the input), we want to show a preview image. We have the `File` object in JavaScript — how do we turn that into an `<img src="...">` without uploading it anywhere?

`URL.createObjectURL(file)` creates a temporary local URL that points to the file in memory. It looks like `blob:http://localhost:5173/abc-123`. You can use it as an `src` directly. The browser handles reading the file and displaying it, entirely client-side. The file is never sent anywhere until the user clicks "Analyze".

**Why `e.stopPropagation()` on the clear button?**

The clear button sits *inside* the dropzone `<div>` that has an `onClick` handler. Without `stopPropagation`, clicking the clear button would also trigger the parent div's click handler (which opens the file picker), and you'd immediately see a file dialog after clearing. `stopPropagation` prevents the event from bubbling up to the parent.

```jsx
import { useRef, useState } from 'react'

export default function ImageDropzone({ file, onFileChange }) {
  const inputRef = useRef(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const previewUrl = file ? URL.createObjectURL(file) : null

  function handleDragOver(e) {
    e.preventDefault()          // required — tells the browser this is a valid drop target
    setIsDraggingOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()          // prevents the browser from navigating to the dropped file
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
    e.stopPropagation()         // prevents click from bubbling up to the dropzone div
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''  // reset the input so the same file can be re-selected
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
          <div className="flex flex-col items-center gap-3 p-8 text-center select-none">
            <div className={`text-5xl transition-transform duration-200 ${isDraggingOver ? 'scale-125' : ''}`}>
              📷
            </div>
            <p className="text-slate-300 font-medium">
              {isDraggingOver ? 'Drop it here!' : 'Drag & drop your image here'}
            </p>
            <p className="text-slate-500 text-sm">or click to browse files</p>
            <p className="text-slate-600 text-xs">PNG, JPG, JPEG supported</p>
          </div>
        )}
      </div>

      {/* Hidden input — triggered programmatically via inputRef */}
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
```

---

#### Step 8 — `src/components/PredictionResult.jsx`

**What concepts are demonstrated here: derived state, component decomposition, conditional rendering**

**Derived state vs. stored state**

`isHealthy` is not stored in state — it's computed on every render from `result.prediction`. This is called **derived state**. The rule of thumb is: if a value can be computed from existing state or props, don't store it separately. Storing it separately means you'd have to keep two pieces of state in sync, which is a source of bugs.

**`ConfidenceBar` as a sub-component**

`ConfidenceBar` is defined in the same file (not exported) because it's only ever used by `PredictionResult` and has no meaning outside of it. Splitting it out avoids a deeply nested return block and makes the `barColor` logic easy to read and change. This is the right level of decomposition — not a separate file, but not crammed into the parent's return either.

**Why a `style` prop for the bar width?**

Tailwind generates static CSS classes at build time. You cannot use dynamic values inside class strings like `w-[${pct}%]` if `pct` comes from runtime data (it works in some cases but is unreliable). For values that are genuinely dynamic — like a confidence percentage that varies per prediction — you use the `style` prop for that one property and let Tailwind handle everything else. This is the standard approach.

**Why check `confidence * 100` against threshold constants?**

Keeping the thresholds as named constants at the top of the file makes the intent clear and makes them easy to tune without hunting through conditional logic. The colour-coding gives users an at-a-glance signal: green means the model is confident, amber means it's uncertain, red means it barely had a preference. This matters for a medical-adjacent use case where low confidence is important information.

```jsx
const CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.65,
}

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100)

  // Colour reflects reliability: green = confident, amber = uncertain, red = barely a preference
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
          style={{ width: `${pct}%` }}  // dynamic value — must use style prop, not a Tailwind class
        />
      </div>
    </div>
  )
}

export default function PredictionResult({ result, onReset }) {
  // Derived from result.prediction — no need to store separately in state
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
        "
      >
        Analyze another image
      </button>
    </div>
  )
}
```

---

#### Step 9 — Rewrite `src/App.jsx`

**What concepts are demonstrated here: state ownership, async event handlers, try/catch/finally, conditional rendering**

**Why does App own all the state?**

`App` is the root component and the lowest common ancestor of all three child components. `CropSelector` needs to read `crop`; `ImageDropzone` needs to read `file`; `PredictionResult` needs to read `result`. Since multiple components need access to the same data, that data must live in their shared parent. This is the "lift state up" pattern from the background section above.

**Why clear `result` and `error` when the file changes?**

`handleFileChange` resets `result` and `error` to null whenever a new file is selected. This prevents a stale result from a previous image hanging around on screen while the user has already picked a new one. Each state change keeps the UI honest — what you see always reflects the current file.

**`try / catch / finally` for async operations**

When making an API call, three outcomes are possible:
1. The request succeeds → `setResult(data)`
2. The request fails (network error, 4xx, 5xx) → `catch` block sets the error message
3. Either way → `finally` block runs, setting `isLoading` back to `false`

`finally` is critical here. If you put `setIsLoading(false)` only in the try block, a failed request would leave the button permanently stuck in a loading state. `finally` always runs regardless of success or failure.

**`!!` for boolean coercion**

`!!crop` converts the string `crop` to a boolean. If `crop` is `''` (empty string), `!!''` is `false`. If `crop` is `'potato'`, `!!'potato'` is `true`. It's a common JavaScript idiom for checking "does this value have a meaningful value?"

**Conditional rendering with `&&` and ternary**

React renders nothing for `false`, `null`, and `undefined`. So `{error && <div>...</div>}` only renders the error div when `error` is a non-empty string. Similarly, `{!result && <button>...</button>}` hides the submit button once a result is shown (replaced by the result card below). These patterns keep the UI in sync with state without any manual DOM manipulation.

```jsx
import { useState } from 'react'
import CropSelector from './components/CropSelector'
import ImageDropzone from './components/ImageDropzone'
import PredictionResult from './components/PredictionResult'
import { predictDisease } from './api'

export default function App() {
  // All shared state lives here — passed down as props to children
  const [crop, setCrop] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleFileChange(newFile) {
    setFile(newFile)
    setResult(null)   // clear stale result when a new file is picked
    setError(null)
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!crop || !file) return   // guard: button should be disabled anyway, but be safe

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await predictDisease(crop, file)
      setResult(data)
    } catch (err) {
      setError(err.message)      // display the error message from api.js
    } finally {
      setIsLoading(false)        // always re-enable the button, success or failure
    }
  }

  // Both conditions must be true before the Analyze button becomes active
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

            {/* Only renders when error is a non-empty string */}
            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Hide the button once we have a result — result card has its own reset button */}
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
                    {/* Pure CSS spinner — the animate-spin class rotates it 360° continuously */}
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  'Analyze Image'
                )}
              </button>
            )}
          </div>

          {/* Result card renders below the main card once we have a prediction */}
          {result && (
            <PredictionResult result={result} onReset={handleReset} />
          )}
        </div>
      </main>
    </div>
  )
}
```

---

### Phase 4 — Backend CORS Fix

#### Step 10 — Add CORS to `api/main.py`

**What is CORS and why does it matter in production?**

As explained in Step 3, CORS is a browser security policy that blocks requests from one origin to another unless the server explicitly permits it. The Vite dev proxy works around this during local development, but in production your frontend and backend are typically on different domains. The proxy is a dev-only tool — in production, real HTTP requests go directly from the user's browser to your API.

FastAPI includes official CORS middleware via `CORSMiddleware`. Middleware sits between the HTTP server and your route handlers — every request passes through it before reaching your code. The CORS middleware inspects each request's `Origin` header and, if it's in the allow-list, adds the appropriate `Access-Control-Allow-*` headers to the response, signalling to the browser that the request is permitted.

**What does each setting mean?**

- `allow_origins` — the list of frontend origins allowed to call this API. In production, replace `localhost:5173` with your actual deployed frontend URL.
- `allow_methods` — which HTTP methods are permitted. We only need `GET` (for `/health`) and `POST` (for `/predict`).
- `allow_headers` — which request headers are allowed. `"*"` means any header, which is fine for an API you control.

Add this to `api/main.py` immediately after `app = FastAPI()`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # add your deployed frontend URL here later
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## Files Changed Summary

| Action | File | Why |
|--------|------|-----|
| Modify | `frontend/.env` | Fix `VITE_` prefix so the variable is accessible to the app |
| Modify | `frontend/vite.config.js` | Add Tailwind plugin + dev proxy for CORS-free API calls |
| Modify | `frontend/src/index.css` | Import Tailwind and set base styles |
| Delete | `frontend/src/App.css` | Replaced by Tailwind utilities |
| Rewrite | `frontend/src/App.jsx` | Complete UI replacing the boilerplate template |
| Create | `frontend/src/api.js` | Isolate all network logic in one place |
| Create | `frontend/src/components/CropSelector.jsx` | Controlled dropdown for selecting crop type |
| Create | `frontend/src/components/ImageDropzone.jsx` | Drag-drop + file picker + image preview |
| Create | `frontend/src/components/PredictionResult.jsx` | Display prediction and confidence bar |
| Modify | `api/main.py` | Add CORS middleware for production access |

---

## Implementation Order

Follow this order to be able to test incrementally at each step rather than building everything blind and debugging all at once.

1. **Steps 1–4** — Configuration. Run `npm run dev` after Step 4 to confirm Tailwind is working. You should see a dark background and no console errors.
2. **Step 5** — Add `api.js`. Nothing visible yet, but the function is ready.
3. **Step 6** — Add `CropSelector.jsx` and render it in `App.jsx`. Verify the dropdown appears and you can select a crop.
4. **Step 7** — Add `ImageDropzone.jsx` and render it. Verify drag-drop works and the preview appears.
5. **Step 8** — Add `PredictionResult.jsx`. You can temporarily hardcode a fake result in App to verify it renders correctly before the API is connected.
6. **Step 9** — Wire everything in `App.jsx` with the real `predictDisease` call. Start the FastAPI backend and test a real prediction end-to-end.
7. **Step 10** — Add CORS to the backend. Not needed for local dev but required before any deployment.
