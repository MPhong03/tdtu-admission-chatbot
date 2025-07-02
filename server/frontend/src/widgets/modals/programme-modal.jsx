import React, { useEffect, useState } from "react";
import {
    Dialog, DialogBody, DialogFooter, IconButton, Typography, Button, Input, Select, Option, Spinner
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Editor } from '@tinymce/tinymce-react';
import api from "@/configs/api";
import toast from "react-hot-toast";

const ProgrammeModal = ({ open, onClose, programmeId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
    });
    const [mode, setMode] = useState(programmeId ? "view" : "create");

    // Khi years đã có, mới load programme detail (nếu có programmeId)
    useEffect(() => {
        if (!open) return;
        // Chỉ load nếu đã có years xong
        if (programmeId) {
            setLoading(true);
            api.get(`/v2/programmes/${programmeId}`)
                .then(res => {
                    const doc = res.data.Data || {};
                    setForm({
                        name: doc.name || "",
                    });
                    setMode("view");
                })
                .catch(() => {
                    toast.error("Không tải được chương trình/hệ");
                    setForm({
                        name: "",
                    });
                    setMode("create");
                })
                .finally(() => setLoading(false));
        } else {
            setForm({
                name: "",
            });
            setMode("create");
        }
    }, [open, programmeId]);

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (mode === "create") {
                await api.post("/v2/programmes", form);
                toast.success("Tạo chương trình/hệ thành công!");
            } else if (mode === "edit" && programmeId) {
                await api.put(`/v2/programmes/${programmeId}`, form);
                toast.success("Cập nhật chương trình/hệ thành công!");
            }
            onClose(true);
        } catch (e) {
            toast.error("Không thể lưu chương trình/hệ. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => setMode("edit");

    const formView = (
        <form className="flex flex-wrap -mx-4">
            {/* Tên chương trình/hệ */}
            <div className="w-full px-4 mb-4">
                <Input
                    label="Tên chương trình/hệ"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={mode === "view"}
                />
            </div>
        </form>
    );

    return (
        <Dialog open={open} handler={onClose} size="md" className="rounded-xl shadow-xl">
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

export default ProgrammeModal;