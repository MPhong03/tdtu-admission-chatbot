import React, { useEffect, useState } from "react";
import {
    Dialog, DialogBody, DialogFooter, IconButton, Typography, Button, Input, Select, Option, Spinner
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Editor } from '@tinymce/tinymce-react';
import api from "@/configs/api";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

const DocumentModal = ({ open, onClose, documentId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        year_id: "",
        url: "",
        html: "",
    });
    const [mode, setMode] = useState(documentId ? "view" : "create");
    const [years, setYears] = useState([]);
    const [yearsLoading, setYearsLoading] = useState(false);

    // Load years khi mở modal
    useEffect(() => {
        if (!open) return;
        setYearsLoading(true);
        api.get(`/v2/years?page=1&size=${PAGE_SIZE}`)
            .then(res => {
                if (res.data.Code === 1) setYears(res.data.Data.items || []);
                else setYears([]);
            })
            .catch(() => setYears([]))
            .finally(() => setYearsLoading(false));
    }, [open]);

    // Khi years đã có, mới load document detail (nếu có documentId)
    useEffect(() => {
        if (!open) return;
        // Chỉ load nếu đã có years xong
        if (yearsLoading) return;
        if (documentId) {
            setLoading(true);
            api.get(`/v2/documents/${documentId}`)
                .then(res => {
                    const doc = res.data.Data || {};
                    setForm({
                        name: doc.name || "",
                        year_id: doc.year_id ? String(doc.year_id) : "",
                        url: doc.url || "",
                        html: doc.html || "",
                    });
                    setMode("view");
                })
                .catch(() => {
                    toast.error("Không tải được tài liệu");
                    setForm({
                        name: "",
                        year_id: "",
                        url: "",
                        html: "",
                    });
                    setMode("create");
                })
                .finally(() => setLoading(false));
        } else {
            setForm({
                name: "",
                year_id: "",
                url: "",
                html: "",
            });
            setMode("create");
        }
    }, [open, documentId, yearsLoading]); // Lưu ý: phụ thuộc yearsLoading

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectYear = value => {
        setForm(prev => ({ ...prev, year_id: String(value) }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (mode === "create") {
                await api.post("/v2/documents", form);
                toast.success("Tạo tài liệu thành công!");
            } else if (mode === "edit" && documentId) {
                await api.put(`/v2/documents/${documentId}`, form);
                toast.success("Cập nhật tài liệu thành công!");
            }
            onClose(true);
        } catch (e) {
            toast.error("Không thể lưu tài liệu. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => setMode("edit");

    const formView = (
        <form className="flex flex-wrap -mx-4">
            {/* Tên tài liệu */}
            <div className="w-full md:w-1/3 px-4 mb-4">
                <Input
                    label="Tên tài liệu"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={mode === "view"}
                />
            </div>
            {/* Năm */}
            <div className="w-full md:w-1/3 px-4 mb-4">
                <Select
                    label="Năm"
                    value={form.year_id}
                    onChange={handleSelectYear}
                    disabled={yearsLoading || mode === "view"}
                    required
                >
                    {yearsLoading ? (
                        <Option value="">Đang tải...</Option>
                    ) : (
                        years.map(y => (
                            <Option key={y.id} value={String(y.id)}>{y.name}</Option>
                        ))
                    )}
                </Select>
            </div>
            {/* URL */}
            <div className="w-full md:w-1/3 px-4 mb-4">
                <Input
                    label="URL"
                    name="url"
                    value={form.url}
                    onChange={handleChange}
                    disabled={mode === "view"}
                />
            </div>
            {/* Nội dung */}
            <div className="w-full px-4 mb-4">
                <label className="block mb-1 font-medium">Nội dung</label>
                <div style={{ background: 'white', borderRadius: 8 }}>
                    <Editor
                        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                        value={form.html}
                        init={{
                            height: 300,
                            menubar: false,
                            plugins: ['link', 'lists', 'code'],
                            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | code',
                        }}
                        onEditorChange={value => setForm(prev => ({ ...prev, html: value }))}
                    />
                </div>
            </div>
        </form>
    );

    return (
        <Dialog open={open} handler={onClose} size="xl" className="rounded-xl shadow-xl">
            <div className="bg-gray-900 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <Typography variant="h5" className="font-semibold flex items-center gap-2">
                    <EyeIcon className="h-6 w-6" /> {title}
                </Typography>
                <div className="flex gap-2">
                    {mode === "view" && (
                        <IconButton variant="text" color="white" onClick={handleEdit} title="Chỉnh sửa">
                            <PencilIcon className="h-6 w-6" />
                        </IconButton>
                    )}
                    <IconButton variant="text" color="white" onClick={onClose} className="hover:bg-white/10">
                        <XMarkIcon className="h-6 w-6" />
                    </IconButton>
                </div>
            </div>
            <DialogBody className="px-6 py-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Spinner color="blue" />
                    </div>
                ) : (
                    <>{formView}</>
                )}
            </DialogBody>
            <DialogFooter className="bg-gray-100 px-8 py-4 rounded-b-lg">
                {(mode === "create" || mode === "edit") && !loading && (
                    <Button variant="gradient" color="blue" onClick={handleSubmit}>
                        Lưu
                    </Button>
                )}
                <Button variant="gradient" color="black" onClick={() => onClose(false)} className="ml-2">
                    Đóng
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default DocumentModal;