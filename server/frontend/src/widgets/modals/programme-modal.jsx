import React, { useEffect, useState } from "react";
import {
    Dialog, DialogBody, DialogFooter, IconButton, Typography, Button, Input, Spinner
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import api from "@/configs/api";
import toast from "react-hot-toast";

const ProgrammeModal = ({ open, onClose, programmeId, title }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "" });
    const isCreate = !programmeId;

    // Reset form và load chi tiết (nếu có)
    useEffect(() => {
        if (!open) return;

        if (isCreate) {
            setForm({ name: "" });
            return;
        }

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/v2/programmes/${programmeId}`);
                const data = res.data.Data.p || {};
                setForm({ name: data.name || "" });
            } catch {
                toast.error("Không tải được chương trình/hệ!");
                setForm({ name: "" });
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [open, programmeId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (isCreate) {
                await api.post("/v2/programmes", form);
                toast.success("Tạo chương trình/hệ thành công!");
            } else {
                await api.put(`/v2/programmes/${programmeId}`, form);
                toast.success("Cập nhật chương trình/hệ thành công!");
            }
            onClose(true);
        } catch {
            toast.error("Không thể lưu chương trình/hệ. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} handler={onClose} size="md" className="rounded-xl shadow-xl">
            <div className="bg-gray-900 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <Typography variant="h5" className="font-semibold flex items-center gap-2">
                    <EyeIcon className="h-6 w-6" /> {title}
                </Typography>
                <IconButton variant="text" color="white" onClick={onClose} className="hover:bg-white/10">
                    <XMarkIcon className="h-6 w-6" />
                </IconButton>
            </div>

            <DialogBody className="px-6 py-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Spinner color="blue" />
                    </div>
                ) : (
                    <form className="flex flex-wrap -mx-4">
                        <div className="w-full px-4 mb-4">
                            <Input
                                label="Tên chương trình/hệ"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </form>
                )}
            </DialogBody>

            <DialogFooter className="bg-gray-100 px-8 py-4 rounded-b-lg">
                {!loading && (
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