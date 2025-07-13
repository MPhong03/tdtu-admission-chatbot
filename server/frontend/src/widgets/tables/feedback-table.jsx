// FeedbackTable.jsx - Optimized Version
import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Tooltip,
    Chip,
    Menu,
    MenuHandler,
    MenuList,
    MenuItem,
    Button,
} from "@material-tailwind/react";
import { 
    EyeIcon, 
    ChatBubbleLeftRightIcon,
    FunnelIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { format } from "date-fns";

const FeedbackTable = ({ feedbacks, onView, page = 1, size = 10, statusFilter, onStatusFilterChange }) => {
    const statusOptions = [
        { value: "", label: "Tất cả trạng thái" },
        { value: "pending", label: "Chờ xử lý" },
        { value: "reviewed", label: "Đã xem xét" },
        { value: "resolved", label: "Đã giải quyết" },
    ];
    const getStatusChip = (status) => {
        const statusConfig = {
            pending: { color: "amber", label: "Chờ xử lý" },
            reviewed: { color: "blue", label: "Đã xem xét" },
            resolved: { color: "green", label: "Đã giải quyết" },
        };
        
        const config = statusConfig[status] || { color: "gray", label: status };
        
        return (
            <Chip
                size="sm"
                variant="ghost"
                color={config.color}
                value={config.label}
                className="text-xs font-medium"
            />
        );
    };

    const getRatingDisplay = (rating) => {
        if (!rating) return <span className="text-gray-500">-</span>;
        
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const colorClass = rating >= 4 ? "text-yellow-600" : rating >= 3 ? "text-green-600" : "text-red-600";
        
        return (
            <div className="flex items-center gap-1">
                <span className={`text-sm ${colorClass}`}>{stars}</span>
                <span className="text-gray-600 text-xs">({rating}/5)</span>
            </div>
        );
    };

    return (
        <>
            <CardHeader className="mb-0 p-6 bg-gray-900 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-900 rounded-lg">
                            <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <Typography variant="h6" className="text-white font-semibold">
                                Phản hồi người dùng
                            </Typography>
                            <Typography variant="small" className="text-gray-200">
                                {feedbacks?.length || 0} phản hồi
                            </Typography>
                        </div>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="h-4 w-4 text-gray-200" />
                        <Menu placement="bottom-end">
                            <MenuHandler>
                                <Button
                                    variant="outlined"
                                    size="sm"
                                    className="flex items-center gap-2 border-gray-300 text-white hover:bg-gray-800"
                                >
                                    {statusOptions.find(opt => opt.value === statusFilter)?.label || "Tất cả trạng thái"}
                                    <ChevronDownIcon className="h-4 w-4" />
                                </Button>
                            </MenuHandler>
                            <MenuList className="bg-white border border-gray-200 shadow-lg">
                                {statusOptions.map((option) => (
                                    <MenuItem
                                        key={option.value}
                                        onClick={() => onStatusFilterChange(option.value)}
                                        className={`text-gray-900 hover:bg-gray-100 ${
                                            option.value === statusFilter ? "bg-gray-100 font-medium" : ""
                                        }`}
                                    >
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                    </div>
                </div>
            </CardHeader>

            <CardBody className="px-0 pt-0 pb-2 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[768px] table-auto">
                        <thead>
                            <tr className="border-b border-gray-200">
                                {[
                                    "#",
                                    "Câu hỏi",
                                    "Đánh giá",
                                    "Trạng thái",
                                    "Ngày tạo",
                                    "",
                                ].map((el) => (
                                    <th
                                        key={el}
                                        className="py-4 px-6 text-left"
                                    >
                                        <Typography
                                            variant="small"
                                            className="text-xs font-bold uppercase text-gray-600 tracking-wider"
                                        >
                                            {el}
                                        </Typography>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks?.map((item, index) => {
                                const stt = (page - 1) * size + index + 1;
                                return (
                                    <tr 
                                        key={item._id} 
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                                    >
                                        <td className="py-4 px-6">
                                            <Typography className="text-sm text-gray-900 font-medium">
                                                {stt}
                                            </Typography>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="max-w-[300px]">
                                                <Typography className="text-sm text-gray-900 truncate">
                                                    {item.question}
                                                </Typography>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {getRatingDisplay(item.rating)}
                                        </td>
                                        <td className="py-4 px-6">
                                            {getStatusChip(item.status)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <Typography className="text-sm text-gray-900">
                                                {format(new Date(item.createdAt), "dd/MM/yyyy")}
                                            </Typography>
                                            <Typography className="text-xs text-gray-500">
                                                {format(new Date(item.createdAt), "HH:mm")}
                                            </Typography>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Tooltip content="Xem chi tiết" placement="top">
                                                <IconButton
                                                    variant="text"
                                                    size="sm"
                                                    onClick={() => onView(item._id)}
                                                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </IconButton>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardBody>
        </>
    );
};

export default FeedbackTable;