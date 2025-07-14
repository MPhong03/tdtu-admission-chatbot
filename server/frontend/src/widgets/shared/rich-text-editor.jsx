import React, { useState, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { 
    ArrowUpTrayIcon, 
    DocumentTextIcon, 
    XMarkIcon, 
    CheckCircleIcon, 
    ExclamationCircleIcon 
} from "@heroicons/react/24/solid";
import api from "@/configs/api";

const RichTextEditor = ({
    value,
    onChange,
    height = 500,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/html',
        'application/vnd.ms-word'
    ];

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const iconClass = "w-4 h-4 mr-2";
        
        switch (extension) {
            case 'pdf':
                return <DocumentTextIcon className={`${iconClass} text-red-500`} />;
            case 'docx':
            case 'doc':
                return <DocumentTextIcon className={`${iconClass} text-blue-500`} />;
            case 'html':
                return <DocumentTextIcon className={`${iconClass} text-orange-500`} />;
            default:
                return <DocumentTextIcon className={iconClass} />;
        }
    };

    const validateFile = (file) => {
        if (!allowedTypes.includes(file.type)) {
            return "Chỉ hỗ trợ file PDF, DOC, DOCX, HTML";
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            return "Kích thước file không được vượt quá 10MB";
        }
        return null;
    };

    const handleFileUpload = async (file) => {
        const error = validateFile(file);
        if (error) {
            setUploadStatus({ type: 'error', message: error });
            return;
        }

        setIsUploading(true);
        setUploadStatus(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/helpers/convert-document-to-html', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.Code === 1) {
                // Insert the HTML content into the editor
                const htmlContent = response.data.Data;
                const currentValue = value || '';
                const newValue = currentValue + htmlContent;
                onChange(newValue);
                
                setUploadStatus({ 
                    type: 'success', 
                    message: `Đã import thành công nội dung từ ${file.name}` 
                });
            } else {
                setUploadStatus({ 
                    type: 'error', 
                    message: response.data.Message || 'Có lỗi xảy ra khi xử lý file' 
                });
            }
        } catch (error) {
            setUploadStatus({ 
                type: 'error', 
                message: 'Không thể xử lý file. Vui lòng thử lại.' 
            });
        } finally {
            setIsUploading(false);
            // Clear status after 5 seconds
            setTimeout(() => setUploadStatus(null), 5000);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        // Reset input
        e.target.value = '';
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const dismissStatus = () => {
        setUploadStatus(null);
    };

    return (
        <div className="w-full space-y-4">
            {/* Upload Area */}
            <div 
                className={`
                    relative border-2 border-dashed rounded-lg p-4 transition-all duration-200
                    ${isDragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }
                    ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.html"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
                
                <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <ArrowUpTrayIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-600">
                            Kéo thả file vào đây hoặc
                        </span>
                        <button
                            onClick={openFileDialog}
                            disabled={isUploading}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isUploading ? 'Đang xử lý...' : 'Chọn file'}
                        </button>
                    </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                    Hỗ trợ: PDF, DOC, DOCX, HTML (tối đa 10MB)
                </div>
            </div>

            {/* Status Messages */}
            {uploadStatus && (
                <div className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${uploadStatus.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }
                `}>
                    <div className="flex items-center space-x-2">
                        {uploadStatus.type === 'success' ? (
                            <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                            <ExclamationCircleIcon className="w-4 h-4" />
                        )}
                        <span className="text-sm">{uploadStatus.message}</span>
                    </div>
                    <button
                        onClick={dismissStatus}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Editor */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    value={value}
                    init={{
                        height,
                        menubar: false,
                        plugins: [
                            "link", 
                            "lists", 
                            "code", 
                            "table",
                            // "image",
                            "paste",
                            "searchreplace",
                            "fullscreen",
                            "insertdatetime",
                            "wordcount"
                        ],
                        toolbar: [
                            "undo redo | formatselect | bold italic underline | forecolor backcolor",
                            "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent",
                            "link table | code fullscreen | searchreplace | insertdatetime wordcount"
                        ].join(" | "),
                        toolbar_mode: 'wrap',
                        paste_data_images: true,
                        paste_as_text: false,
                        paste_remove_styles: false,
                        paste_webkit_styles: "color font-size",
                        content_style: `
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #333;
                            }
                        `,
                        branding: false,
                        resize: true,
                        elementpath: false,
                        statusbar: true,
                        setup: (editor) => {
                            editor.on('init', () => {
                                editor.getContainer().style.transition = 'border-color 0.2s ease';
                            });
                        }
                    }}
                    onEditorChange={onChange}
                />
            </div>
        </div>
    );
};

export default RichTextEditor;
