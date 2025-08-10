import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Chip,
    Avatar,
} from "@material-tailwind/react";
import {
    EyeIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    CheckBadgeIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

// Helper function để hiển thị verification status
const getVerificationDisplay = (history) => {
    if (!history.isVerified) {
        return {
            icon: <ExclamationTriangleIcon className="h-4 w-4" />,
            color: "orange",
            label: "Chưa xác thực",
            tooltip: "Câu trả lời chưa được xác thực bởi AI"
        };
    }

    switch (history.verificationResult) {
        case 'correct':
            return {
                icon: <CheckCircleIcon className="h-4 w-4" />,
                color: "green",
                label: "Đúng",
                tooltip: `Đã xác thực đúng (${(history.verificationScore * 100).toFixed(1)}%)`
            };
        case 'incorrect':
            return {
                icon: <XCircleIcon className="h-4 w-4" />,
                color: "red",
                label: "Sai",
                tooltip: `Đã xác thực sai (${(history.verificationScore * 100).toFixed(1)}%)`
            };
        case 'pending':
            return {
                icon: <ClockIcon className="h-4 w-4" />,
                color: "blue",
                label: "Đang chờ",
                tooltip: "Đang chờ xác thực"
            };
        case 'skipped':
            return {
                icon: <ExclamationTriangleIcon className="h-4 w-4" />,
                color: "gray",
                label: "Bỏ qua",
                tooltip: "Bỏ qua xác thực"
            };
        default:
            return {
                icon: <ExclamationTriangleIcon className="h-4 w-4" />,
                color: "orange",
                label: "Chưa xác thực",
                tooltip: "Trạng thái xác thực không xác định"
            };
    }
};

const QATable = ({ histories, onOpenModal, page = 1, size = 5 }) => (
    <>
        <CardHeader className="mb-0 p-6 bg-gray-900 border-b border-gray-200">
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <Typography variant="h5" color="white" className="font-bold">
                            Danh sách hỏi đáp
                        </Typography>
                        <Typography variant="small" className="text-white/80 font-normal">
                            Theo dõi tương tác người dùng với chatbot
                        </Typography>
                    </div>
                </div>
            </div>
        </CardHeader>

        <CardBody className="px-0 pt-0 pb-2">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] table-auto">
                    <thead>
                        <tr className="border-b border-blue-gray-100">
                            {[
                                { label: "#", width: "w-12" },
                                { label: "Người dùng", width: "w-44" },
                                { label: "Câu hỏi", width: "w-72" },
                                { label: "Câu trả lời", width: "w-72" },
                                { label: "Trạng thái", width: "w-32" },
                                { label: "Xác thực", width: "w-32" },
                                { label: "Admin", width: "w-24" },
                                { label: "Thời gian", width: "w-36" },
                                { label: "Thao tác", width: "w-20" }
                            ].map((col) => (
                                <th key={col.label} className={`${col.width} py-4 px-4 text-left bg-gray-50/50`}>
                                    <Typography
                                        variant="small"
                                        className="text-xs font-bold uppercase text-blue-gray-500 tracking-wider"
                                    >
                                        {col.label}
                                    </Typography>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {histories.map((history, key) => {
                            const isLast = key === histories.length - 1;
                            const stt = (page - 1) * size + key + 1;
                            const verificationDisplay = getVerificationDisplay(history);

                            return (
                                <tr
                                    key={history._id}
                                    className={`hover:bg-gray-50/50 transition-colors duration-200 ${!isLast ? "border-b border-blue-gray-50" : ""
                                        }`}
                                >
                                    <td className="py-4 px-4">
                                        <Typography className="text-sm text-gray-900 font-medium">
                                            {stt}
                                        </Typography>
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <Typography variant="small" className="font-semibold text-blue-gray-900">
                                                    {history.userId?.username || "(unknown)"}
                                                </Typography>
                                                <Typography className="text-xs font-normal text-blue-gray-500">
                                                    {history.userId?.email || ""}
                                                </Typography>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                            <Typography variant="small" className="font-medium text-blue-gray-800">
                                                {truncateWords(history.question, 15)}
                                            </Typography>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                            <Typography variant="small" className="font-medium text-blue-gray-800">
                                                {truncateWords(history.answer, 15)}
                                            </Typography>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        <Chip
                                            variant="ghost"
                                            color={history.status === "success" ? "green" : "red"}
                                            size="sm"
                                            value={history.status}
                                            className="font-medium"
                                        />
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2" title={verificationDisplay.tooltip}>
                                            {verificationDisplay.icon}
                                            <Chip
                                                variant="ghost"
                                                color={verificationDisplay.color}
                                                size="sm"
                                                value={verificationDisplay.label}
                                                className="font-medium"
                                            />
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        {history.isAdminReviewed && history.adminAnswer ? (
                                            <Chip
                                                variant="ghost"
                                                color="blue"
                                                size="sm"
                                                value="Đã phản hồi"
                                                className="font-medium"
                                            />
                                        ) : (
                                            <Chip
                                                variant="ghost"
                                                color="gray"
                                                size="sm"
                                                value="Chưa xử lý"
                                                className="font-medium"
                                            />
                                        )}
                                    </td>

                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="h-4 w-4 text-blue-gray-400" />
                                            <div>
                                                <Typography variant="small" className="font-medium text-blue-gray-800">
                                                    {new Date(history.createdAt).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="small" className="text-xs text-blue-gray-500">
                                                    {new Date(history.createdAt).toLocaleTimeString()}
                                                </Typography>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4">
                                        <IconButton
                                            variant="text"
                                            color="blue-gray"
                                            size="sm"
                                            className="hover:bg-blue-gray-50 transition-colors duration-200"
                                            onClick={() => onOpenModal(history)}
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                        </IconButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {histories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <ChatBubbleLeftRightIcon className="h-16 w-16 text-blue-gray-300 mb-4" />
                    <Typography variant="h6" className="text-blue-gray-500 mb-2">
                        Chưa có dữ liệu
                    </Typography>
                    <Typography variant="small" className="text-blue-gray-400">
                        Hệ thống chưa ghi nhận cuộc hội thoại nào
                    </Typography>
                </div>
            )}
        </CardBody>
    </>
);

export default QATable;
