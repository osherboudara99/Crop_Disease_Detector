from fastapi import FastAPI, UploadFile, File
import uvicorn
from api.utils import read_file_as_image
import tensorflow as tf
import numpy as np

app = FastAPI() 

MODEL = tf.keras.models.load_model("../models/potato/1")
CLASSES = {
    "Pepper": [
        "Bacterial spot",
        "Healthy",
    ],
    "Tomato": [
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
    "Potato": [
        "Early blight",
        "Late blight",
        "Healthy",
    ],
}

@app.get("/health")
async def health() -> str:
    return "Hello, I am healthy!"


@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):
    image = read_file_as_image(await file.read()) 

    # Expand dimensions to match the input shape of the model
    image_batch = np.expand_dims(image, axis=0)
    prediction = MODEL.predict(image_batch)
    pass


if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)


