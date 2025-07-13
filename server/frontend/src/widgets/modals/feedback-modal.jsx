import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogBody,
    DialogFooter,
    Typography,
    Button,
    Spinner,
    Card,
    CardBody,
    Menu,
    MenuHandler,
    MenuList,
    MenuItem,
    Chip,
    Tooltip,
} from "@material-tailwind/react";
import {
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    StarIcon,
    CalendarDaysIcon,
    ChevronDownIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationCircleIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    QuestionMarkCircleIcon,
    ChatBubbleBottomCenterTextIcon,
    CommandLineIcon,
    DocumentTextIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import api from "@/configs/api";

const InfoItem = ({
    label,
    value,
    icon: Icon,
    variant = "default",
    tooltip = null,
    copyable = false,
    placeholder = "(Không có thông tin)",
    className = ""
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value || !copyable) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Đã sao chép vào clipboard");
        } catch (err) {
            toast.error("Không thể sao chép");
        }
    };

    const getVariantStyles = () => {
        switch (variant) {
            case "code":
                return {
                    container: "bg-gray-50 rounded-lg p-4 border border-gray-200",
                    label: "text-gray-700 font-medium text-sm",
                    value: "text-sm text-green-400 font-mono whitespace-pre-wrap"
                };
            case "highlighted":
                return {
                    container: "bg-blue-50 rounded-lg p-4 border border-blue-200",
                    label: "text-blue-700 font-medium text-sm",
                    value: "text-blue-900 font-medium"
                };
            case "status":
                return {
                    container: "bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200",
                    label: "text-gray-700 font-medium text-sm",
                    value: "text-gray-900 font-semibold"
                };
            case "large":
                return {
                    container: "bg-white rounded-lg p-6 border border-gray-200 shadow-sm",
                    label: "text-gray-600 font-medium text-sm uppercase tracking-wider",
                    value: "text-gray-900 text-base leading-relaxed mt-3"
                };
            default:
                return {
                    container: "space-y-2",
                    label: "text-gray-600 font-medium text-sm uppercase tracking-wider",
                    value: "text-gray-900 leading-relaxed"
                };
        }
    };

    const styles = getVariantStyles();

    const renderValue = () => {
        if (!value) {
            return (
                <Typography className={`${styles.value} text-gray-500 italic`}>
                    {placeholder}
                </Typography>
            );
        }

        if (variant === "code") {
            return (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto relative mt-4">
                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                        {value || "(no cypher query)"}
                    </pre>

                    {/* Copy Button */}
                    {copyable && (
                        <Button
                            size="sm"
                            variant="text"
                            ripple={false}
                            className="absolute top-2 right-2 w-8 h-8 p-2 flex items-center justify-center"
                            onClick={handleCopy}
                        >
                            <span className="relative w-4 h-4">
                                <CheckCircleIcon
                                    className={`absolute inset-0 h-4 w-4 text-green-500 transition-opacity duration-200 ${copied ? "opacity-100" : "opacity-0"
                                        }`}
                                />
                                <DocumentTextIcon
                                    className={`absolute inset-0 h-4 w-4 text-gray-300 transition-opacity duration-200 ${copied ? "opacity-0" : "opacity-100"
                                        }`}
                                />
                            </span>
                        </Button>

                    )}
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between">
                <Typography className={styles.value}>
                    {value}
                </Typography>
                {copyable && (
                    <Button
                        size="sm"
                        variant="text"
                        className="p-2 hover:bg-gray-100 ml-2"
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                            <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                        )}
                    </Button>
                )}
            </div>
        );
    };

    const labelContent = (
        <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gray-500" />}
            <Typography className={styles.label}>
                {label}
            </Typography>
        </div>
    );

    return (
        <div className={`${styles.container} ${className}`}>
            {labelContent}
            {renderValue()}
        </div>
    );
};

const FeedbackModal = ({ open, onClose, feedbackId }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    const statusOptions = [
        {
            value: "pending",
            label: "Chờ xử lý",
            color: "amber",
            icon: ClockIcon
        },
        {
            value: "reviewed",
            label: "Đã xem xét",
            color: "blue",
            icon: ExclamationCircleIcon
        },
        {
            value: "resolved",
            label: "Đã giải quyết",
            color: "green",
            icon: CheckCircleIcon
        },
    ];

    const handleChangeStatus = async (newStatus) => {
        if (!data || newStatus === data.status) return;
        try {
            const res = await api.patch(`/feedbacks/${data._id}/status`, { status: newStatus });
            if (res.data.Code === 1) {
                toast.success("Cập nhật trạng thái thành công");
                setData({ ...data, status: newStatus });
            } else {
                toast.error("Không thể cập nhật trạng thái");
            }
        } catch (err) {
            toast.error("Lỗi khi cập nhật trạng thái");
        }
    };

    useEffect(() => {
        const fetchDetail = async () => {
            if (!feedbackId) return;
            setLoading(true);
            try {
                const res = await api.get(`/feedbacks/${feedbackId}`);
                if (res.data.Code === 1) {
                    setData(res.data.Data);
                } else {
                    toast.error("Không thể tải chi tiết phản hồi");
                }
            } catch {
                toast.error("Lỗi khi tải chi tiết phản hồi");
            } finally {
                setLoading(false);
            }
        };

        if (open) fetchDetail();
    }, [feedbackId, open]);

    const user = data?.userId;
    const currentStatus = statusOptions.find((s) => s.value === data?.status);

    const getRatingStars = (rating) => {
        if (!rating) return <span className="text-gray-500">Chưa đánh giá</span>;

        const stars = Array.from({ length: 5 }, (_, i) => (
            <StarIcon
                key={i}
                className={`h-4 w-4 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
            />
        ));

        return (
            <div className="flex items-center gap-1">
                {stars}
                <span className="text-gray-800 text-sm ml-2 font-medium">({rating}/5)</span>
            </div>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const StatusDropdown = () => (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <Typography className="text-gray-600 font-medium text-sm uppercase tracking-wider">
                    Trạng thái
                </Typography>
            </div>
            <Menu placement="bottom-start" container={null}>
                <MenuHandler>
                    <Button
                        variant="outlined"
                        size="sm"
                        className="flex items-center gap-2 capitalize w-fit border-gray-300 text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                        {currentStatus?.icon && (
                            <currentStatus.icon className="h-4 w-4" />
                        )}
                        {currentStatus?.label || data.status}
                        <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                </MenuHandler>
                <MenuList className="bg-white border border-gray-200 shadow-lg z-[9999]">
                    {statusOptions.map((option) => (
                        <MenuItem
                            key={option.value}
                            onClick={() => handleChangeStatus(option.value)}
                            className={`flex items-center gap-2 text-gray-900 hover:bg-gray-100 transition-colors ${option.value === data.status ? "bg-gray-100" : ""
                                }`}
                        >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </div>
    );

    const RatingDisplay = () => (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <Typography className="text-gray-600 font-medium text-sm uppercase tracking-wider">
                    Đánh giá
                </Typography>
            </div>
            {getRatingStars(data.rating)}
        </div>
    );

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="xl"
            className="rounded-xl shadow-2xl"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-700 rounded-lg">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <Typography variant="h5" className="text-white font-semibold">
                            Chi tiết phản hồi
                        </Typography>
                        <Typography variant="small" className="text-gray-300">
                            Thông tin chi tiết về phản hồi người dùng
                        </Typography>
                    </div>
                </div>
                <Button
                    variant="text"
                    onClick={onClose}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                    <XMarkIcon className="h-5 w-5" />
                </Button>
            </div>

            {/* Body */}
            <DialogBody className="px-6 py-6 bg-gray-50" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Spinner color="blue" className="h-8 w-8" />
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* User Info Section */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <UserIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-900 font-semibold">
                                        Thông tin người dùng
                                    </Typography>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoItem
                                        label="Tên người dùng"
                                        value={user?.username}
                                        icon={UserIcon}
                                        copyable={true}
                                        tooltip="Tên đăng nhập của người dùng"
                                    />
                                    <InfoItem
                                        label="Email"
                                        value={user?.email}
                                        icon={EnvelopeIcon}
                                        copyable={true}
                                        tooltip="Địa chỉ email của người dùng"
                                    />
                                    <InfoItem
                                        label="Ngày đăng ký"
                                        value={formatDate(user?.createdAt)}
                                        icon={CalendarDaysIcon}
                                        tooltip="Thời gian tạo tài khoản"
                                    />
                                </div>
                            </CardBody>
                        </Card>

                        {/* Feedback Info Section */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                    <Typography variant="h6" className="text-gray-900 font-semibold">
                                        Thông tin phản hồi
                                    </Typography>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <StatusDropdown />
                                    <RatingDisplay />
                                </div>

                                <div className="space-y-4">
                                    <InfoItem
                                        label="Thời gian gửi"
                                        value={formatDate(data.createdAt)}
                                        icon={CalendarDaysIcon}
                                        variant="highlighted"
                                        tooltip="Thời gian người dùng gửi phản hồi"
                                    />

                                    <InfoItem
                                        label="Câu hỏi"
                                        value={data.question}
                                        icon={QuestionMarkCircleIcon}
                                        variant="large"
                                        copyable={true}
                                        tooltip="Câu hỏi mà người dùng đã đặt"
                                        placeholder="Không có câu hỏi"
                                    />

                                    <InfoItem
                                        label="Câu trả lời"
                                        value={data.answer}
                                        icon={ChatBubbleBottomCenterTextIcon}
                                        variant="large"
                                        copyable={true}
                                        tooltip="Câu trả lời mà hệ thống đã cung cấp"
                                        placeholder="Không có câu trả lời"
                                    />

                                    <InfoItem
                                        label="Cypher Query"
                                        value={data.cypher}
                                        icon={CommandLineIcon}
                                        variant="code"
                                        copyable={true}
                                        tooltip="Câu lệnh Cypher được sử dụng để truy vấn dữ liệu"
                                        placeholder="// Không có mã Cypher"
                                    />

                                    <InfoItem
                                        label="Nhận xét của người dùng"
                                        value={data.comment}
                                        icon={DocumentTextIcon}
                                        variant="large"
                                        copyable={true}
                                        tooltip="Nhận xét và góp ý của người dùng"
                                        placeholder="Người dùng không để lại nhận xét"
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                            <ExclamationCircleIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <Typography className="text-gray-600 text-lg">
                            Không có dữ liệu
                        </Typography>
                        <Typography className="text-gray-500 text-sm mt-2">
                            Vui lòng thử lại sau
                        </Typography>
                    </div>
                )}
            </DialogBody>

            {/* Footer */}
            <DialogFooter className="bg-gray-100 px-6 py-4 rounded-b-lg border-t border-gray-200">
                <Button
                    onClick={onClose}
                    variant="outlined"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                    Đóng
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default FeedbackModal;