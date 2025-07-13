import React, { useEffect, useState } from "react";
import {
    Dialog, DialogBody, DialogFooter, IconButton, Typography, Button, Input, Select, Option, Spinner,
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon, DocumentTextIcon, CalendarIcon, AcademicCapIcon, LinkIcon } from "@heroicons/react/24/solid";
import { Editor } from "@tinymce/tinymce-react";
import api from "@/configs/api";
import toast from "react-hot-toast";
import RichTextEditor from "@/widgets/shared/rich-text-editor";

const PAGE_SIZE = 50;

const TuitionModal = ({ open, onClose, tuitionId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        programme_id: "",
        year_id: "",
        url: "",
        content: "",
    });
    const [years, setYears] = useState([]);
    const [programmes, setProgrammes] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const isCreate = !tuitionId;

    // Reset form + load dropdown khi mở
    useEffect(() => {
        if (!open) return;

        if (isCreate) {
            setForm({ name: "", programme_id: "", year_id: "", url: "", content: "" });
        }

        const fetchDropdowns = async () => {
            setLoadingData(true);
            try {
                const [yearsRes, progsRes] = await Promise.all([
                    api.get(`/v2/years?page=1&size=${PAGE_SIZE}`),
                    api.get(`/v2/programmes?page=1&size=${PAGE_SIZE}`),
                ]);
                if (yearsRes.data.Code === 1) setYears(yearsRes.data.Data.items || []);
                else setYears([]);

                if (progsRes.data.Code === 1) setProgrammes(progsRes.data.Data.items || []);
                else setProgrammes([]);
            } catch {
                setYears([]);
                setProgrammes([]);
            } finally {
                setLoadingData(false);
            }
        };

        fetchDropdowns();
    }, [open]);

    // Load chi tiết học phí nếu có tuitionId
    useEffect(() => {
        if (!open || !tuitionId || loadingData) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/v2/tuitions/${tuitionId}`);
                const data = res.data.Data || {};
                setForm({
                    name: data.name || "",
                    programme_id: data.programme_id ? String(data.programme_id) : "",
                    year_id: data.year_id ? String(data.year_id) : "",
                    url: data.url || "",
                    content: data.content || "",
                });
            } catch {
                toast.error("Không tải được học phí!");
                setForm({ name: "", programme_id: "", year_id: "", url: "", content: "" });
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [open, tuitionId, loadingData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectYear = (value) => setForm((prev) => ({ ...prev, year_id: String(value) }));
    const handleSelectProgramme = (value) => setForm((prev) => ({ ...prev, programme_id: String(value) }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (isCreate) {
                await api.post("/v2/tuitions", form);
                toast.success("Tạo học phí thành công!");
            } else {
                await api.put(`/v2/tuitions/${tuitionId}`, form);
                toast.success("Cập nhật học phí thành công!");
            }
            onClose(true);
        } catch {
            toast.error("Không thể lưu học phí. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            handler={onClose} 
            size="xl" 
            className="bg-transparent shadow-none"
        >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <DocumentTextIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <Typography variant="h5" className="font-bold">
                                    {title}
                                </Typography>
                                <Typography variant="small" className="text-gray-300 mt-1">
                                    {isCreate ? "Tạo mới thông tin học phí" : "Chỉnh sửa thông tin học phí"}
                                </Typography>
                            </div>
                        </div>
                        <IconButton 
                            variant="text" 
                            color="white" 
                            onClick={onClose} 
                            className="hover:bg-white/10 rounded-xl transition-all duration-200"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </IconButton>
                    </div>
                </div>

                {/* Body */}
                <DialogBody className="p-0" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                    {(loading || loadingData) ? (
                        <div className="flex flex-col justify-center items-center h-64 bg-gray-50">
                            <Spinner color="blue" className="h-8 w-8" />
                            <Typography variant="small" className="text-gray-600 mt-3">
                                Đang tải dữ liệu...
                            </Typography>
                        </div>
                    ) : (
                        <div className="p-8 space-y-8">
                            {/* Basic Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-800 font-semibold">
                                        Thông tin cơ bản
                                    </Typography>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium">
                                            Tên học phí <span className="text-red-500">*</span>
                                        </Typography>
                                        <Input
                                            size="lg"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="!border-gray-300 focus:!border-blue-500"
                                            labelProps={{
                                                className: "hidden",
                                            }}
                                            placeholder="Nhập tên học phí..."
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium flex items-center gap-2">
                                            <LinkIcon className="h-4 w-4" />
                                            URL tham chiếu
                                        </Typography>
                                        <Input
                                            size="lg"
                                            name="url"
                                            value={form.url}
                                            onChange={handleChange}
                                            className="!border-gray-300 focus:!border-blue-500"
                                            labelProps={{
                                                className: "hidden",
                                            }}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Program & Year Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                        <AcademicCapIcon className="h-4 w-4 text-green-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-800 font-semibold">
                                        Phân loại
                                    </Typography>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium">
                                            Chương trình <span className="text-red-500">*</span>
                                        </Typography>
                                        <Select
                                            size="lg"
                                            value={form.programme_id}
                                            onChange={handleSelectProgramme}
                                            disabled={loadingData}
                                            className="!border-gray-300"
                                            labelProps={{
                                                className: "hidden",
                                            }}
                                        >
                                            {programmes.map((p) => (
                                                <Option key={p.id} value={String(p.id)}>
                                                    {p.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            Năm học <span className="text-red-500">*</span>
                                        </Typography>
                                        <Select
                                            size="lg"
                                            value={form.year_id}
                                            onChange={handleSelectYear}
                                            disabled={loadingData}
                                            className="!border-gray-300"
                                            labelProps={{
                                                className: "hidden",
                                            }}
                                        >
                                            {years.map((y) => (
                                                <Option key={y.id} value={String(y.id)}>
                                                    {y.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                                    <div className="p-1.5 bg-purple-100 rounded-lg">
                                        <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-800 font-semibold">
                                        Nội dung chi tiết
                                    </Typography>
                                </div>
                                
                                <RichTextEditor
                                        value={form.content}
                                        onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                                    />
                            </div>
                        </div>
                    )}
                </DialogBody>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-8 py-6">
                    <div className="flex justify-end gap-3">
                        <Button 
                            variant="outlined" 
                            color="gray"
                            onClick={() => onClose(false)} 
                            className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200"
                            disabled={loading}
                        >
                            Hủy bỏ
                        </Button>
                        <Button 
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="h-4 w-4" />
                                    Đang lưu...
                                </div>
                            ) : (
                                isCreate ? "Tạo mới" : "Cập nhật"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default TuitionModal;
