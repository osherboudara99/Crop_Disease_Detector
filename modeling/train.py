import tensorflow as tf
from tensorflow.keras import layers, models
from pathlib import Path
from dataclasses import dataclass
import os

# Shared config and dataset helpers live here so notebooks can import directly from train.py.
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "modeling" / "models"


@dataclass(frozen=True)
class ModelConfig:
    name: str
    data_dir: Path
    model_dir: Path
    epochs: int = 50
    image_size: int = 256
    batch_size: int = 32
    rgb_channels: int = 3
    seed: int = 12
    shuffle: bool = True


CROP_CONFIGS = {
    "potato": ModelConfig(
        name="potato",
        data_dir=DATA_DIR / "potato",
        model_dir=MODEL_DIR / "potato",
    ),
    "tomato": ModelConfig(
        name="tomato",
        data_dir=DATA_DIR / "tomato",
        model_dir=MODEL_DIR / "tomato",
    ),
    "pepper": ModelConfig(
        name="pepper",
        data_dir=DATA_DIR / "pepper",
        model_dir=MODEL_DIR / "pepper",
    ),
}


def load_dataset(model_config: ModelConfig) -> tf.data.Dataset:
    return tf.keras.preprocessing.image_dataset_from_directory(
        model_config.data_dir,
        shuffle=model_config.shuffle,
        seed=model_config.seed,
        image_size=(model_config.image_size, model_config.image_size),
        batch_size=model_config.batch_size,
    )


def get_dataset_partitions_tf(
    ds: tf.data.Dataset,
    train_split: float = 0.8,
    val_split: float = 0.1,
    test_split: float = 0.1,
    shuffle: bool = True,
    seed: int = 12,
    shuffle_size: int = 10000,
) -> tuple[tf.data.Dataset, tf.data.Dataset, tf.data.Dataset]:
    if abs(train_split + val_split + test_split - 1.0) > 1e-6:
        raise ValueError("train_split, val_split, and test_split must sum to 1.0")

    ds_size = len(ds)
    if shuffle:
        ds = ds.shuffle(shuffle_size, seed=seed)

    train_size = int(ds_size * train_split)
    val_size = int(ds_size * val_split)

    train_ds = ds.take(train_size)
    validation_ds = ds.skip(train_size).take(val_size)
    test_ds = ds.skip(train_size + val_size)
    return train_ds, validation_ds, test_ds



def optimization_and_augmentation(train_ds: tf.data.Dataset, 
                                  validation_ds: tf.data.Dataset, 
                                  test_ds: tf.data.Dataset,
                                  model_config: ModelConfig) -> tuple[tf.data.Dataset, tf.data.Dataset, tf.data.Dataset]:
    data_augmentation_pipeline = models.Sequential([
        layers.RandomFlip('horizontal_and_vertical'), 
        layers.RandomRotation(0.1),  
        layers.RandomZoom(0.1),     
    ])

    train_ds = train_ds.cache()
    train_ds = train_ds.shuffle(
        1000,
        seed=model_config.seed,
        reshuffle_each_iteration=True,
    )
    train_ds = train_ds.map(
        lambda x, y: (data_augmentation_pipeline(x, training=True), y),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)

    # Fix: do not shuffle validation/test so evaluation stays deterministic.
    validation_ds = validation_ds.cache().prefetch(buffer_size=tf.data.AUTOTUNE)
    test_ds = test_ds.cache().prefetch(buffer_size=tf.data.AUTOTUNE)

    return train_ds, validation_ds, test_ds


def build_model(model_config: ModelConfig, class_names: list[str], verbose: bool = False) -> tf.keras.Model:
    resize_rescale_pipeline = models.Sequential([
        layers.Resizing(model_config.image_size, model_config.image_size), 
        layers.Rescaling(1/255), 
    ])

    input_shape = (model_config.image_size, model_config.image_size, model_config.rgb_channels)

    model = models.Sequential([
        layers.Input(shape=input_shape),
        resize_rescale_pipeline,
        layers.Conv2D(filters=32, kernel_size=(3,3), activation='relu'),
        layers.MaxPooling2D(pool_size=(2,2)),
        layers.Conv2D(filters=64, kernel_size=(3,3), activation='relu'),
        layers.MaxPooling2D(pool_size=(2,2)),
        layers.Conv2D(filters=64, kernel_size=(3,3), activation='relu'),
        layers.MaxPooling2D(pool_size=(2,2)),
        layers.Conv2D(filters=64, kernel_size=(3,3), activation='relu'),
        layers.MaxPooling2D(pool_size=(2,2)),
        layers.Flatten(),
        layers.Dropout(0.3),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(64, activation='relu'),
        layers.Dense(32, activation='relu'),
        layers.Dense(len(class_names), activation='softmax')
    ])

    if verbose:
        print(model.summary())

    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=False), 
        metrics=['accuracy']
    )

    return model 

def fit_model(model: tf.keras.Model, 
              train_ds: tf.data.Dataset, 
              validation_ds: tf.data.Dataset, 
              model_config: ModelConfig) -> tf.keras.callbacks.History:
    history = model.fit(
        train_ds,
        validation_data=validation_ds,
        epochs=model_config.epochs
    )

    return history

def evaluate_model(model: tf.keras.Model, test_ds: tf.data.Dataset) -> tuple[float, float]:
    loss, accuracy = model.evaluate(test_ds)
    return loss, accuracy

def save_model(model: tf.keras.Model, model_config: ModelConfig) -> None:
    model_dir = model_config.model_dir
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    existing_versions = [
        int(path.name)
        for path in model_dir.iterdir()
        if path.is_dir() and path.name.isdigit()
    ]

    if not existing_versions:
        version = 1
    else:
        version = max(existing_versions) + 1
    
    model.save(model_dir / str(version))


def main() -> None:
    for crop, model_config in CROP_CONFIGS.items():
        print(f"Training model for {crop}...")
        dataset = load_dataset(model_config)
        train_ds, validation_ds, test_ds = get_dataset_partitions_tf(
            dataset,
            shuffle=model_config.shuffle,
            seed=model_config.seed,
        )
        train_ds, validation_ds, test_ds = optimization_and_augmentation(
            train_ds,
            validation_ds,
            test_ds,
            model_config,
        )
        class_names = dataset.class_names
        model = build_model(model_config, class_names)
        history = fit_model(model, train_ds, validation_ds, model_config)
        loss, accuracy = evaluate_model(model, test_ds)
        print(f"{crop} - Test Loss: {loss:.4f}, Test Accuracy: {accuracy:.4f}")
        save_model(model, model_config)

if __name__ == "__main__":
    main()
