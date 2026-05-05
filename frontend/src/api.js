export const predictDisease = (plant, imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    try {
        const res = await fetch(`/api/predict?plant=${plant}`, {
            method: 'POST',
            body: formData,
        // Do NOT set Content-Type — browser handles it automatically with the boundary
        });

        if(!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail ?? `Request failed with status ${res.status}`)
        }

        return res.json()
    }

    catch (error) {

        console.error(`Error calling model: ${error}`);
    }

}