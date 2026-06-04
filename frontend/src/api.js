const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function predictDisease(plant, imageFile) {
  const formData = new FormData()
  formData.append('file', imageFile)

  const res = await fetch(`${API_URL}/predict?plant=${plant}`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets it with the multipart boundary automatically
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Request failed with status ${res.status}`)
  }

  return res.json()
  // Returns: { plant: "potato", prediction: "Early blight", confidence: 0.95 }
}
