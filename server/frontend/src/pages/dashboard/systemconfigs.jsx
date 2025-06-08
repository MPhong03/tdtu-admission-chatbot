import { useState, useEffect } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Input,
    Typography,
    Spinner,
    Tooltip,
    IconButton,
} from "@material-tailwind/react";
import api from "@/configs/api";
import { Cog6ToothIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

export function SystemConfigs() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const [success, setSuccess] = useState({});

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get("/systemconfigs");
            if (res.data?.Code === 1) {
                setConfigs(res.data.Data);
                setEditing(
                    res.data.Data.reduce((acc, item) => {
                        acc[item.key] = item.value;
                        return acc;
                    }, {})
                );
            } else {
                toast.error("Không thể tải cấu hình");
            }
        } catch (err) {
            toast.error("Lỗi khi tải cấu hình");
        } finally {
            setLoading(false);
            setSuccess({});
        }
    };

    const handleChange = (key, value) => {
        setEditing((prev) => ({ ...prev, [key]: value }));
        setSuccess((prev) => ({ ...prev, [key]: false }));
    };

    const handleSave = async (key) => {
        setSaving((prev) => ({ ...prev, [key]: true }));
        try {
            const res = await api.put(`/systemconfigs/${key}`, {
                value: editing[key],
            });
            if (res.data?.Code === 1) {
                toast.success("Cập nhật thành công");
                setSuccess((prev) => ({ ...prev, [key]: true }));
            } else {
                toast.error("Cập nhật thất bại");
                setSuccess((prev) => ({ ...prev, [key]: false }));
            }
        } catch (err) {
            toast.error("Lỗi cập nhật");
            setSuccess((prev) => ({ ...prev, [key]: false }));
        } finally {
            setSaving((prev) => ({ ...prev, [key]: false }));
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    return (
        <div className="mx-auto my-20 flex max-w-screen-md flex-col gap-8 px-4">
            <Card shadow={true} className="p-4">
                <CardHeader
                    floated={false}
                    shadow={false}
                    className="mb-2 flex items-center gap-3 border-b bg-white pb-4"
                >
                    <Cog6ToothIcon className="h-8 w-8 text-black" />
                    <div>
                        <Typography variant="h5" color="black">
                            Cấu hình hệ thống
                        </Typography>
                        <Typography variant="small" color="gray" className="text-xs">
                            Quản lý và chỉnh sửa các thông số hệ thống
                        </Typography>
                    </div>
                    <div className="ml-auto">
                        <Tooltip content="Tải lại">
                            <IconButton
                                variant="text"
                                color="black"
                                onClick={fetchConfigs}
                                disabled={loading}
                            >
                                <ArrowPathIcon className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} />
                            </IconButton>
                        </Tooltip>
                    </div>
                </CardHeader>

                <CardBody className="divide-y divide-blue-gray-100">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Spinner color="black" className="h-10 w-10" />
                        </div>
                    ) : configs.length === 0 ? (
                        <Typography className="text-center text-gray-600 py-8">
                            Không có cấu hình nào
                        </Typography>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {configs.map((item) => (
                                <div key={item.key} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <Input
                                        label={item.name || "Value"}
                                        value={editing[item.key] ?? ""}
                                        onChange={(e) => handleChange(item.key, e.target.value)}
                                        crossOrigin=""
                                        className="flex-1"
                                        disabled={saving[item.key]}
                                    />
                                    <div className="flex flex-row items-center gap-2">
                                        <Button
                                            size="sm"
                                            color="black"
                                            className="sm:ml-2"
                                            onClick={() => handleSave(item.key)}
                                            loading={saving[item.key]}
                                            disabled={saving[item.key] || editing[item.key] === configs.find(cfg => cfg.key === item.key)?.value}
                                        >
                                            Lưu
                                        </Button>
                                        {success[item.key] && (
                                            <Tooltip content="Đã lưu thành công">
                                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

export default SystemConfigs;