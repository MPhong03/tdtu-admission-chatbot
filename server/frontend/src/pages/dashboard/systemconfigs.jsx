import { useState, useEffect, useCallback } from "react";
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
    Alert,
    Chip,
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
} from "@material-tailwind/react";
import api from "@/configs/api";
import { 
    Cog6ToothIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon,
    ClockIcon,
    XMarkIcon 
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

export function SystemConfigs() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const [success, setSuccess] = useState({});
    const [errors, setErrors] = useState({});
    const [hasChanges, setHasChanges] = useState({});
    const [lastSaved, setLastSaved] = useState({});
    const [confirmSave, setConfirmSave] = useState({ open: false, key: null, configName: null });

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get("/systemconfigs");
            if (res.data?.Code === 1) {
                setConfigs(res.data.Data);
                const editingState = res.data.Data.reduce((acc, item) => {
                    acc[item.key] = item.value;
                    return acc;
                }, {});
                setEditing(editingState);
                setHasChanges({});
                setErrors({});
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

    const clearSuccessAfterDelay = useCallback((key) => {
        setTimeout(() => {
            setSuccess((prev) => ({ ...prev, [key]: false }));
        }, 3000);
    }, []);

    const handleChange = (key, value) => {
        setEditing((prev) => ({ ...prev, [key]: value }));
        
        const originalValue = configs.find(cfg => cfg.key === key)?.value;
        const hasChanged = value !== originalValue;
        
        setHasChanges((prev) => ({ ...prev, [key]: hasChanged }));
        setSuccess((prev) => ({ ...prev, [key]: false }));
        setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const handleSaveClick = (key) => {
        const config = configs.find(cfg => cfg.key === key);
        setConfirmSave({
            open: true,
            key: key,
            configName: config?.name || `Config ${configs.findIndex(cfg => cfg.key === key) + 1}`
        });
    };

    const handleConfirmSave = async () => {
        const { key } = confirmSave;
        setConfirmSave({ open: false, key: null, configName: null });
        
        if (key) {
            await handleSave(key);
        }
    };

    const handleCancelSave = () => {
        setConfirmSave({ open: false, key: null, configName: null });
    };

    const handleSave = async (key) => {
        setSaving((prev) => ({ ...prev, [key]: true }));
        setErrors((prev) => ({ ...prev, [key]: false }));
        
        try {
            const res = await api.put(`/systemconfigs/${key}`, {
                value: editing[key],
            });
            
            if (res.data?.Code === 1) {
                toast.success("Cập nhật thành công");
                setSuccess((prev) => ({ ...prev, [key]: true }));
                setHasChanges((prev) => ({ ...prev, [key]: false }));
                setLastSaved((prev) => ({ ...prev, [key]: new Date() }));
                
                // Update configs state to reflect the new saved value
                setConfigs(prev => prev.map(cfg => 
                    cfg.key === key ? { ...cfg, value: editing[key] } : cfg
                ));
                
                clearSuccessAfterDelay(key);
            } else {
                throw new Error(res.data?.Message || "Cập nhật thất bại");
            }
        } catch (err) {
            const errorMessage = err.message || "Lỗi cập nhật";
            toast.error(errorMessage);
            setErrors((prev) => ({ ...prev, [key]: errorMessage }));
            setSuccess((prev) => ({ ...prev, [key]: false }));
        } finally {
            setSaving((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleReset = (key) => {
        const originalValue = configs.find(cfg => cfg.key === key)?.value;
        setEditing((prev) => ({ ...prev, [key]: originalValue }));
        setHasChanges((prev) => ({ ...prev, [key]: false }));
        setSuccess((prev) => ({ ...prev, [key]: false }));
        setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const getStatusIndicator = (key) => {
        if (saving[key]) {
            return (
                <Tooltip content="Đang lưu...">
                    <Spinner className="h-4 w-4 text-black" />
                </Tooltip>
            );
        }
        
        if (success[key]) {
            return (
                <Tooltip content="Đã lưu thành công">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </Tooltip>
            );
        }
        
        if (errors[key]) {
            return (
                <Tooltip content={`Lỗi: ${errors[key]}`}>
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                </Tooltip>
            );
        }
        
        if (hasChanges[key]) {
            return (
                <Tooltip content="Có thay đổi chưa lưu">
                    <ClockIcon className="h-5 w-5 text-amber-500" />
                </Tooltip>
            );
        }
        
        return null;
    };

    const formatLastSaved = (timestamp) => {
        if (!timestamp) return null;
        const now = new Date();
        const diff = Math.floor((now - timestamp) / 1000); // seconds
        
        if (diff < 60) return `${diff}s trước`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
        return timestamp.toLocaleDateString();
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const pendingChangesCount = Object.values(hasChanges).filter(Boolean).length;

    return (
        <div className="mx-auto my-20 flex max-w-screen-lg flex-col gap-8 px-4">
            {/* Pending Changes Alert */}
            {pendingChangesCount > 0 && (
                <Alert 
                    color="amber" 
                    variant="ghost"
                    className="border-l-4 border-amber-500"
                    icon={<ClockIcon className="h-5 w-5" />}
                >
                    <Typography variant="small" className="font-medium">
                        Bạn có {pendingChangesCount} thay đổi chưa lưu. 
                        Hãy nhấn "Lưu" để xác nhận các thay đổi.
                    </Typography>
                </Alert>
            )}

            <Card shadow={true} className="p-4">
                <CardHeader
                    floated={false}
                    shadow={false}
                    className="mb-6 flex items-center gap-4 border-b bg-white pb-6"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/10">
                        <Cog6ToothIcon className="h-7 w-7 text-black" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="h4" color="black" className="mb-1">
                            Cấu hình hệ thống
                        </Typography>
                        <Typography variant="small" color="gray" className="flex items-center gap-2">
                            Quản lý và chỉnh sửa các thông số hệ thống
                            {configs.length > 0 && (
                                <Chip 
                                    value={`${configs.length} cấu hình`} 
                                    size="sm" 
                                    variant="ghost" 
                                    color="gray"
                                />
                            )}
                        </Typography>
                    </div>
                    <Tooltip content="Tải lại cấu hình">
                        <IconButton
                            variant="outlined"
                            color="black"
                            onClick={fetchConfigs}
                            disabled={loading}
                            className="border-black/20 hover:bg-black/5"
                        >
                            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                        </IconButton>
                    </Tooltip>
                </CardHeader>

                <CardBody className="px-0">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="text-center">
                                <Spinner color="black" className="h-12 w-12 mb-4" />
                                <Typography color="gray">Đang tải cấu hình...</Typography>
                            </div>
                        </div>
                    ) : configs.length === 0 ? (
                        <div className="text-center py-16">
                            <Cog6ToothIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <Typography variant="h6" color="gray" className="mb-2">
                                Không có cấu hình nào
                            </Typography>
                            <Typography variant="small" color="gray">
                                Hệ thống chưa có cấu hình nào được thiết lập
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-6 px-6">
                            {configs.map((item, index) => (
                                <div 
                                    key={item.key} 
                                    className={`bg-gray-50/50 rounded-lg p-6 transition-all duration-200 ${
                                        hasChanges[item.key] ? 'ring-2 ring-amber-200 bg-amber-50/30' : ''
                                    } ${
                                        success[item.key] ? 'ring-2 ring-green-200 bg-green-50/30' : ''
                                    } ${
                                        errors[item.key] ? 'ring-2 ring-red-200 bg-red-50/30' : ''
                                    }`}
                                >
                                    <div className="flex flex-col gap-4">
                                        {/* Header with title and status */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Typography variant="small" color="black" className="font-semibold">
                                                    {item.name || `Config ${index + 1}`}
                                                </Typography>
                                                <Typography variant="small" color="gray" className="text-xs">
                                                    Key: {item.key}
                                                </Typography>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIndicator(item.key)}
                                                {lastSaved[item.key] && (
                                                    <Typography variant="small" color="gray" className="text-xs">
                                                        {formatLastSaved(lastSaved[item.key])}
                                                    </Typography>
                                                )}
                                            </div>
                                        </div>

                                        {/* Input and buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                            <div className="flex-1">
                                                <Input
                                                    label="Giá trị"
                                                    value={editing[item.key] ?? ""}
                                                    onChange={(e) => handleChange(item.key, e.target.value)}
                                                    crossOrigin=""
                                                    disabled={saving[item.key]}
                                                    error={!!errors[item.key]}
                                                    success={success[item.key]}
                                                    className="!border-t-blue-gray-200 focus:!border-t-black"
                                                    labelProps={{
                                                        className: "before:content-none after:content-none",
                                                    }}
                                                />
                                                {errors[item.key] && (
                                                    <Typography variant="small" color="red" className="mt-1 text-xs">
                                                        {errors[item.key]}
                                                    </Typography>
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-2 sm:min-w-fit">
                                                <Button
                                                    size="sm"
                                                    color="black"
                                                    onClick={() => handleSaveClick(item.key)}
                                                    loading={saving[item.key]}
                                                    disabled={
                                                        saving[item.key] || 
                                                        !hasChanges[item.key]
                                                    }
                                                    className="min-w-[80px]"
                                                >
                                                    {saving[item.key] ? "Đang lưu..." : "Lưu"}
                                                </Button>
                                                
                                                {hasChanges[item.key] && (
                                                    <Tooltip content="Hoàn tác thay đổi">
                                                        <IconButton
                                                            size="sm"
                                                            variant="outlined"
                                                            color="gray"
                                                            onClick={() => handleReset(item.key)}
                                                            disabled={saving[item.key]}
                                                        >
                                                            <XMarkIcon className="h-4 w-4" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Confirm Save Dialog */}
            <Dialog open={confirmSave.open} handler={handleCancelSave}>
                <DialogHeader>
                    <Typography variant="h6">Xác nhận lưu cấu hình</Typography>
                </DialogHeader>
                <DialogBody>
                    <Typography>
                        Bạn có chắc chắn muốn lưu thay đổi cho cấu hình <strong>"{confirmSave.configName}"</strong>?
                    </Typography>
                    <Typography variant="small" color="gray" className="mt-2">
                        Thay đổi này sẽ ảnh hưởng đến hoạt động của hệ thống.
                    </Typography>
                </DialogBody>
                <DialogFooter>
                    <Button variant="text" color="gray" onClick={handleCancelSave} className="mr-2">
                        Hủy
                    </Button>
                    <Button color="black" onClick={handleConfirmSave}>
                        Xác nhận lưu
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}

export default SystemConfigs;