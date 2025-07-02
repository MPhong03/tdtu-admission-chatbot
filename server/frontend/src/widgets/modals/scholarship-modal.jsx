import React, { useEffect, useState } from "react";
import {
    Dialog, DialogBody, DialogFooter, IconButton, Typography, Button, Input, Select, Option, Spinner
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Editor } from '@tinymce/tinymce-react';
import api from "@/configs/api";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

const ScholarshipModal = ({ open, onClose, scholarshipId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        year_id: "",
        url: "",
        content: "",
    });
    const [mode, setMode] = useState(scholarshipId ? "view" : "create");
    const [years, setYears] = useState([]);
    const [yearsLoading, setYearsLoading] = useState(false);

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

    useEffect(() => {
        console.log(scholarshipId);
        if (!open) return;
        if (yearsLoading) return;
        if (scholarshipId) {
            setLoading(true);
            api.get(`/v2/scholarships/${scholarshipId}`)
                .then(res => {
                    const data = res.data.Data || {};
                    setForm({
                        name: data.name || "",
                        year_id: data.year_id ? String(data.year_id) : "",
                        url: data.url || "",
                        content: data.content || "",
                    });
                    setMode("view");
                })
                .catch(() => {
                    toast.error("Không tải được học bổng!");
                    setForm({ name: "", year_id: "", url: "", content: "" });
                    setMode("create");
                })
                .finally(() => setLoading(false));
        } else {
            setForm({ name: "", year_id: "", url: "", content: "" });
            setMode("create");
        }
    }, [open, scholarshipId, yearsLoading]);

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
                await api.post("/v2/scholarships", form);
                toast.success("Tạo học bổng thành công!");
            } else if (mode === "edit" && scholarshipId) {
                await api.put(`/v2/scholarships/${scholarshipId}`, form);
                toast.success("Cập nhật học bổng thành công!");
            }
            onClose(true);
        } catch (e) {
            toast.error("Không thể lưu học bổng. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => setMode("edit");

    const formView = (
        <form className="flex flex-wrap -mx-4">
            <div className="w-full md:w-1/2 px-4 mb-4">
                <Input
                    label="Tên học bổng"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={mode === "view"}
                />
            </div>
            <div className="w-full md:w-1/2 px-4 mb-4">
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
            <div className="w-full px-4 mb-4">
                <Input
                    label="URL"
                    name="url"
                    value={form.url}
                    onChange={handleChange}
                    disabled={mode === "view"}
                />
            </div>
            <div className="w-full px-4 mb-4">
                <label className="block mb-1 font-medium">Nội dung</label>
                <div style={{ background: 'white', borderRadius: 8 }}>
                    <Editor
                        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                        value={form.content}
                        init={{
                            height: 300,
                            menubar: false,
                            plugins: ['link', 'lists', 'code'],
                            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | code',
                        }}
                        disabled={mode === "view"}
                        onEditorChange={value => setForm(prev => ({ ...prev, content: value }))}
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

export default ScholarshipModal;
