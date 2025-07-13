import React from "react";
import { Editor } from "@tinymce/tinymce-react";

const RichTextEditor = ({
    value,
    onChange,
    height = 500,
}) => {
    return (
        <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
            value={value}
            init={{
                height,
                menubar: false,
                plugins: ["link", "lists", "code"],
                toolbar:
                    "undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | code",
            }}
            onEditorChange={onChange}
        />
    );
};

export default RichTextEditor;
