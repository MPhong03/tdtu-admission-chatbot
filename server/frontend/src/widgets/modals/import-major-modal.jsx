import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Typography,
    Alert,
    Card,
    CardBody,
    Progress,
    Tabs,
    TabsHeader,
    TabsBody,
    Tab,
    TabPanel,
} from "@material-tailwind/react";
import {
    ArrowUpTrayIcon,
    DocumentArrowUpIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CloudArrowUpIcon,
    DocumentTextIcon,
    TableCellsIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "@/configs/api";
import toast from "react-hot-toast";

const template = "/downloads/major_template.xlsx";

const ImportMajorModal = ({ open, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState("upload");
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Reset state khi đóng modal
    const handleClose = () => {
        setFile(null);
        setUploading(false);
        setUploadProgress(0);
        setResult(null);
        setError(null);
        setActiveTab("upload");
        onClose();
    };

    // Xử lý chọn file
    const handleFileSelect = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            // Kiểm tra định dạng file
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];
            
            if (!allowedTypes.includes(selectedFile.type)) {
                setError("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
                return;
            }
            
            // Kiểm tra kích thước file (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError("Kích thước file không được vượt quá 10MB");
                return;
            }
            
            setFile(selectedFile);
            setError(null);
        }
    };

    // Xử lý drag & drop
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            // Simulate file input change
            const fakeEvent = {
                target: { files: [droppedFile] }
            };
            handleFileSelect(fakeEvent);
        }
    };

    // Xử lý upload
    const handleUpload = async () => {
        if (!file) {
            setError("Vui lòng chọn file Excel");
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await api.post('/v2/excels/import/major-programmes', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.data.Code === 1) {
                setResult(response.data.Data);
                setActiveTab("result");
                toast.success("Import thành công!");
                
                // Gọi callback để refresh data
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setError(response.data.Message || "Có lỗi xảy ra khi import file");
            }
        } catch (err) {
            console.error("Import error:", err);
            setError(err.response?.data?.Message || "Có lỗi xảy ra khi import file");
        } finally {
            setUploading(false);
        }
    };

    // Tab content components
    const UploadTab = () => (
        <div className="space-y-6">
            {/* Upload Area */}
            <Card className="border-2 border-dashed border-blue-gray-200 hover:border-gray-800 transition-colors">
                <CardBody className="p-8">
                    <div
                        className="text-center cursor-pointer"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CloudArrowUpIcon className="h-8 w-8 text-gray-800" />
                        </div>
                        <Typography variant="h6" className="mb-2 text-blue-gray-800">
                            Chọn hoặc kéo thả file Excel
                        </Typography>
                        <Typography className="text-sm text-blue-gray-600 mb-4">
                            Hỗ trợ định dạng .xlsx, .xls (tối đa 10MB)
                        </Typography>
                        <Button
                            variant="outlined"
                            color="gray"
                            className="flex items-center gap-2 mx-auto border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
                        >
                            <DocumentArrowUpIcon className="h-4 w-4" />
                            Chọn file
                        </Button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </CardBody>
            </Card>

            {/* File Info */}
            {file && (
                <Alert color="gray" className="flex items-center gap-3 border-gray-300 bg-gray-50">
                    {/* <DocumentTextIcon className="h-5 w-5 text-gray-700" /> */}
                    <div>
                        <Typography variant="small" className="font-semibold text-gray-700">
                            File đã chọn: {file.name}
                        </Typography>
                        <Typography variant="small" className="text-gray-700">
                            Kích thước: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                    </div>
                </Alert>
            )}

            {/* Error */}
            {error && (
                <Alert color="red" className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <Typography variant="small">
                        {error}
                    </Typography>
                </Alert>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Typography variant="small" className="font-semibold text-blue-gray-700">
                            Đang xử lý...
                        </Typography>
                        <Typography variant="small" className="text-blue-gray-600">
                            {uploadProgress}%
                        </Typography>
                    </div>
                    <Progress value={uploadProgress} color="gray" className="h-2" />
                </div>
            )}
        </div>
    );

    const GuideTab = () => (
        <div className="space-y-6">
            {/* Template Download */}
            <Card className="border border-green-200 bg-green-50">
                <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <TableCellsIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <Typography variant="h6" className="text-green-800">
                                Bước 1: Tải file mẫu
                            </Typography>
                            <Typography variant="small" className="text-green-700">
                                Sử dụng file mẫu để đảm bảo định dạng chính xác
                            </Typography>
                        </div>
                    </div>
                    <Button
                        variant="outlined"
                        color="gray"
                        className="flex items-center gap-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = template;
                            link.download = 'major_template.xlsx';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success("Tải file mẫu thành công!");
                        }}
                    >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Tải file mẫu Excel
                    </Button>
                </CardBody>
            </Card>

            {/* Instructions */}
            <Card>
                <CardBody className="p-6">
                    <Typography variant="h6" className="mb-4 text-blue-gray-800">
                        Bước 2: Hướng dẫn soạn thảo file Excel
                    </Typography>
                    
                    <div className="space-y-4">
                        <div className="border-l-4 border-gray-800 pl-4">
                            <Typography variant="small" className="font-semibold mb-2">
                                Các cột bắt buộc:
                            </Typography>
                            <ul className="text-sm text-blue-gray-700 space-y-1">
                                <li>- <strong>major_name:</strong> Tên ngành học</li>
                                <li>- <strong>programme_name:</strong> Tên chương trình đào tạo</li>
                                <li>- <strong>year_name:</strong> Năm áp dụng (phân cách bởi dấu ;)</li>
                                <li>- <strong>major_code:</strong> Mã ngành</li>
                                <li>- <strong>name:</strong> Tên chương trình chi tiết</li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-gray-600 pl-4">
                            <Typography variant="small" className="font-semibold mb-2">
                                Các cột tùy chọn:
                            </Typography>
                            <ul className="text-sm text-blue-gray-700 space-y-1">
                                <li>- <strong>description:</strong> Mô tả ngành học</li>
                                <li>- <strong>reasons:</strong> Lý do nên chọn ngành</li>
                                <li>- <strong>images:</strong> Danh sách hình ảnh (JSON array)</li>
                                <li>- <strong>tab:</strong> Tab hiển thị</li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-gray-500 pl-4">
                            <Typography variant="small" className="font-semibold mb-2">
                                Thuộc tính tùy chỉnh:
                            </Typography>
                            <ul className="text-sm text-blue-gray-700 space-y-1">
                                <li>- Sử dụng tiền tố <strong>CUSTOM_</strong> cho các cột tùy chỉnh</li>
                                <li>- Ví dụ: <strong>CUSTOM_Học phí</strong>, <strong>CUSTOM_Thời gian đào tạo</strong></li>
                            </ul>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Example */}
            <Card className="bg-blue-gray-50">
                <CardBody className="p-6">
                    <Typography variant="h6" className="mb-4 text-blue-gray-800">
                        Ví dụ dữ liệu:
                    </Typography>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse border border-blue-gray-300">
                            <thead>
                                <tr className="bg-blue-gray-100">
                                    <th className="border border-blue-gray-300 p-2 text-left">major_name</th>
                                    <th className="border border-blue-gray-300 p-2 text-left">programme_name</th>
                                    <th className="border border-blue-gray-300 p-2 text-left">year_name</th>
                                    <th className="border border-blue-gray-300 p-2 text-left">major_code</th>
                                    <th className="border border-blue-gray-300 p-2 text-left">name</th>
                                    <th className="border border-blue-gray-300 p-2 text-left">CUSTOM_Học phí</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-blue-gray-300 p-2">Khoa học máy tính</td>
                                    <td className="border border-blue-gray-300 p-2">Tiêu chuẩn</td>
                                    <td className="border border-blue-gray-300 p-2">2024;2025</td>
                                    <td className="border border-blue-gray-300 p-2">IT001</td>
                                    <td className="border border-blue-gray-300 p-2">Khoa học máy tính - Tiêu chuẩn</td>
                                    <td className="border border-blue-gray-300 p-2">15-18 triệu/năm</td>
                                </tr>
                                <tr>
                                    <td className="border border-blue-gray-300 p-2">Khoa học máy tính</td>
                                    <td className="border border-blue-gray-300 p-2">Tiên tiến</td>
                                    <td className="border border-blue-gray-300 p-2">2024</td>
                                    <td className="border border-blue-gray-300 p-2">FIT001</td>
                                    <td className="border border-blue-gray-300 p-2">Khoa học máy tính - Tiên tiến</td>
                                    <td className="border border-blue-gray-300 p-2">20-25 triệu/năm</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
        </div>
    );

    const ResultTab = () => (
        <div className="space-y-6">
            {result && (
                <>
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <Typography variant="h5" className="mb-2 text-green-800">
                            Import thành công!
                        </Typography>
                        <Typography className="text-blue-gray-600">
                            Dữ liệu đã được xử lý và cập nhật vào hệ thống
                        </Typography>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border border-green-200 bg-green-50">
                            <CardBody className="p-6 text-center">
                                <Typography variant="h4" className="text-green-800 mb-2">
                                    {result.inserted || 0}
                                </Typography>
                                <Typography variant="small" className="text-green-700">
                                    Bản ghi mới được thêm
                                </Typography>
                            </CardBody>
                        </Card>

                        <Card className="border border-amber-200 bg-amber-50">
                            <CardBody className="p-6 text-center">
                                <Typography variant="h4" className="text-amber-800 mb-2">
                                    {result.skipped || 0}
                                </Typography>
                                <Typography variant="small" className="text-amber-700">
                                    Bản ghi đã tồn tại (bỏ qua)
                                </Typography>
                            </CardBody>
                        </Card>
                    </div>

                    <Alert color="gray" className="flex items-center gap-3 border-gray-300 bg-gray-50">
                        <InformationCircleIcon className="h-5 w-5" />
                        <div>
                            <Typography variant="small" className="font-semibold">
                                Lưu ý:
                            </Typography>
                            <Typography variant="small" className="text-gray-700">
                                Các bản ghi đã tồn tại sẽ được bỏ qua để tránh trùng lặp dữ liệu.
                            </Typography>
                        </div>
                    </Alert>
                </>
            )}
        </div>
    );

    return (
        <Dialog open={open} handler={handleClose} size="lg" className="max-h-[90vh] overflow-hidden">
            <DialogHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <ArrowUpTrayIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <Typography variant="h5" className="text-white font-bold">
                                Import danh sách ngành học
                            </Typography>
                            <Typography variant="small" className="text-gray-100">
                                Nhập dữ liệu ngành học từ file Excel
                            </Typography>
                        </div>
                    </div>
                    <Button
                        variant="text"
                        color="white"
                        size="sm"
                        onClick={handleClose}
                        className="p-2 hover:bg-white hover:bg-opacity-10"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </Button>
                </div>
            </DialogHeader>

            <DialogBody className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <Tabs value={activeTab} className="w-full">
                    <TabsHeader className="bg-blue-gray-50 p-1">
                        <Tab
                            value="upload"
                            onClick={() => setActiveTab("upload")}
                            className={`flex items-center gap-2 ${activeTab === "upload" ? "text-gray-800 bg-white" : "text-blue-gray-600"}`}
                        >
                            <CloudArrowUpIcon className="h-4 w-4" />
                            Upload File
                        </Tab>
                        <Tab
                            value="guide"
                            onClick={() => setActiveTab("guide")}
                            className={`flex items-center gap-2 ${activeTab === "guide" ? "text-gray-800 bg-white" : "text-blue-gray-600"}`}
                        >
                            <DocumentTextIcon className="h-4 w-4" />
                            Hướng dẫn
                        </Tab>
                        {result && (
                            <Tab
                                value="result"
                                onClick={() => setActiveTab("result")}
                                className={`flex items-center gap-2 ${activeTab === "result" ? "text-gray-800 bg-white" : "text-blue-gray-600"}`}
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                Kết quả
                            </Tab>
                        )}
                    </TabsHeader>

                    <TabsBody className="mt-4">
                        <TabPanel value="upload" className="p-0">
                            <UploadTab />
                        </TabPanel>
                        <TabPanel value="guide" className="p-0">
                            <GuideTab />
                        </TabPanel>
                        {result && (
                            <TabPanel value="result" className="p-0">
                                <ResultTab />
                            </TabPanel>
                        )}
                    </TabsBody>
                </Tabs>
            </DialogBody>

            <DialogFooter className="border-t border-blue-gray-100 px-6 py-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {activeTab === "upload" && (
                            <Typography variant="small" className="text-blue-gray-600">
                                Định dạng hỗ trợ: .xlsx, .xls (tối đa 10MB)
                            </Typography>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outlined"
                            color="blue-gray"
                            onClick={handleClose}
                            disabled={uploading}
                        >
                            {result ? "Đóng" : "Hủy"}
                        </Button>
                        {activeTab === "upload" && (
                            <Button
                                color="gray"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpTrayIcon className="h-4 w-4" />
                                        Import
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogFooter>
        </Dialog>
    );
};

export default ImportMajorModal;