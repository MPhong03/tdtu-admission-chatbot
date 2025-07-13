import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogBody,
    DialogFooter,
    IconButton,
    Typography,
    Button,
    Input,
    Select,
    Option,
    Spinner,
} from "@material-tailwind/react";
import { DocumentIcon, XMarkIcon, CalendarIcon, LinkIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { Editor } from "@tinymce/tinymce-react";
import api from "@/configs/api";
import toast from "react-hot-toast";
import RichTextEditor from "@/widgets/shared/rich-text-editor";

const PAGE_SIZE = 20;

const DocumentModal = ({ open, onClose, documentId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        year_id: "",
        url: "",
        html: "",
    });
    const [years, setYears] = useState([]);
    const [yearsLoading, setYearsLoading] = useState(false);
    const isCreate = !documentId;

    // Load danh sách năm khi mở modal
    useEffect(() => {
        if (!open) return;

        if (!documentId) {
            setForm({
                name: "",
                year_id: "",
                url: "",
                html: "",
            });
        }

        const fetchYears = async () => {
            setYearsLoading(true);
            try {
                const res = await api.get(`/v2/years?page=1&size=${PAGE_SIZE}`);
                if (res.data.Code === 1) {
                    setYears(res.data.Data.items || []);
                } else {
                    setYears([]);
                }
            } catch {
                setYears([]);
            } finally {
                setYearsLoading(false);
            }
        };

        fetchYears();
    }, [open]);

    // Load chi tiết tài liệu khi có documentId
    useEffect(() => {
        if (!open || !documentId || yearsLoading) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/v2/documents/${documentId}`);
                const doc = res.data.Data || {};
                setForm({
                    name: doc.name || "",
                    year_id: doc.year_id ? String(doc.year_id) : "",
                    url: doc.url || "",
                    html: doc.html || "",
                });
            } catch {
                toast.error("Không tải được tài liệu");
                setForm({ name: "", year_id: "", url: "", html: "" });
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [open, documentId, yearsLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectYear = (value) => {
        setForm((prev) => ({ ...prev, year_id: String(value) }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (isCreate) {
                await api.post("/v2/documents", form);
                toast.success("Tạo tài liệu thành công!");
            } else {
                await api.put(`/v2/documents/${documentId}`, form);
                toast.success("Cập nhật tài liệu thành công!");
            }
            onClose(true); // Gọi callback refresh
        } catch {
            toast.error("Không thể lưu tài liệu. Vui lòng thử lại!");
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
                                <DocumentIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <Typography variant="h5" className="font-bold">
                                    {title}
                                </Typography>
                                <Typography variant="small" className="text-gray-300 mt-1">
                                    {isCreate ? "Thêm mới tài liệu hệ thống" : "Chỉnh sửa thông tin tài liệu"}
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
                    {loading ? (
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium">
                                            Tên tài liệu <span className="text-red-500">*</span>
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
                                            placeholder="Nhập tên tài liệu..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-gray-700 font-medium flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            Năm <span className="text-red-500">*</span>
                                        </Typography>
                                        <Select
                                            size="lg"
                                            value={form.year_id}
                                            onChange={handleSelectYear}
                                            disabled={yearsLoading}
                                            className="!border-gray-300"
                                            labelProps={{
                                                className: "hidden",
                                            }}
                                        >
                                            {yearsLoading ? (
                                                <Option value="" disabled>
                                                    <div className="flex items-center gap-2">
                                                        <Spinner className="h-4 w-4" />
                                                        Đang tải...
                                                    </div>
                                                </Option>
                                            ) : (
                                                years.map((y) => (
                                                    <Option key={y.id} value={String(y.id)}>
                                                        {y.name}
                                                    </Option>
                                                ))
                                            )}
                                        </Select>
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

                            {/* Content Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                                    <div className="p-1.5 bg-purple-100 rounded-lg">
                                        <DocumentIcon className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-800 font-semibold">
                                        Nội dung tài liệu
                                    </Typography>
                                </div>

                                <RichTextEditor
                                    value={form.html}
                                    onChange={(html) => setForm((prev) => ({ ...prev, html }))}
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

export default DocumentModal;