import numpy as np 
from numpy.typing import NDArray
from io import BytesIO
from PIL import Image


def read_file_as_image(data: bytes) -> NDArray[np.uint8]:
    image = Image.open(BytesIO(data))
    return np.array(image)