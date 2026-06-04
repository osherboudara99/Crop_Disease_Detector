from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from .utils import read_file_as_image
import tensorflow as tf
import numpy as np
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://crop-disease-predictor.osherboudara.com",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]

CLASSES = {
    "potato": {
        "model": tf.keras.models.load_model(BASE_DIR / "modeling/models/potato/1"),
        "classes": [
            "Early blight",
            "Late blight",
            "Healthy",
        ],
    },
    "tomato": {
        "model": tf.keras.models.load_model(BASE_DIR / "modeling/models/tomato/1"),
        "classes": [
            "Bacterial spot",
            "Early blight",
            "Late blight",
            "Leaf Mold",
            "Septoria leaf spot",
            "Spider mites / Two-spotted spider mite",
            "Target Spot",
            "Tomato Yellow Leaf Curl Virus",
            "Tomato mosaic virus",
            "Healthy",
        ],
    },
    "pepper": {
        "model": tf.keras.models.load_model(BASE_DIR / "modeling/models/pepper/1"),
        "classes": [
            "Bacterial spot",
            "Healthy",
        ],
    },
}

@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "message": "API is healthy and ready to receive requests."  
    }


@app.post("/predict")
async def predict(
    plant: str,
    file: UploadFile = File(...)
) -> dict:
    
    plant = plant.lower()

    if plant not in CLASSES:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown plant '{plant}'. Use one of: {list(CLASSES.keys())}",
        )
    
    image = read_file_as_image(await file.read()) 
    image_batch = np.expand_dims(image, axis=0)

    model = CLASSES[plant]["model"]
    classes = CLASSES[plant]["classes"]

    prediction = model.predict(image_batch)
    predicted_class = int(np.argmax(prediction[0]))
    predicted_confidence = float(np.max(prediction[0]))
    predicted_label = classes[predicted_class]

    return {
        "plant": plant,
        "prediction": predicted_label, 
        "confidence": predicted_confidence
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


