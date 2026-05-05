import { useRef, useState } from "react";

const ImageDropzone = ({ file, onFileChange }) => {
    const inputRef = useRef(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const previewUrl = file ? URL.createObjectURL(file) : null; 

    const handleDragOver = (e) => {
        e.preventDefault(); // required — tells the browser this is a valid drop target
        setIsDraggingOver(true);
    }

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
    }

    const handleDrop = (e) => {
        e.preventDefault(); // prevents the browser from navigating to the dropped file
        setIsDraggingOver(false);
        const dropped = e.dataTransfer.files[0]
        if (dropped && dropped.type.startsWith('image/')) {
            onFileChange(dropped)
        }
    }
}