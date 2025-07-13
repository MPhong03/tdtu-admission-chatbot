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
    ClockIcon
} from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

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
                <table className="w-full min-w-[800px] table-auto">
                    <thead>
                        <tr className="border-b border-blue-gray-100">
                            {[
                                { label: "#", width: "w-12" },
                                { label: "Người dùng", width: "w-48" },
                                { label: "Câu hỏi", width: "w-80" },
                                { label: "Câu trả lời", width: "w-80" },
                                { label: "Trạng thái", width: "w-32" },
                                { label: "Thời gian", width: "w-40" },
                                { label: "Thao tác", width: "w-24" }
                            ].map((col) => (
                                <th key={col.label} className={`${col.width} py-4 px-6 text-left bg-gray-50/50`}>
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
                        {histories.map(({ _id, userId, chatId, question, answer, status, createdAt }, key) => {
                            const isLast = key === histories.length - 1;
                            const stt = (page - 1) * size + key + 1;

                            return (
                                <tr
                                    key={_id}
                                    className={`hover:bg-gray-50/50 transition-colors duration-200 ${!isLast ? "border-b border-blue-gray-50" : ""
                                        }`}
                                >
                                    <td className="py-4 px-6">
                                        <Typography className="text-sm text-gray-900 font-medium">
                                            {stt}
                                        </Typography>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <Typography variant="small" className="font-semibold text-blue-gray-900">
                                                    {userId?.username || "(unknown)"}
                                                </Typography>
                                                <Typography className="text-xs font-normal text-blue-gray-500">
                                                    {userId?.email || ""}
                                                </Typography>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                            <Typography variant="small" className="font-medium text-blue-gray-800">
                                                {truncateWords(question, 20)}
                                            </Typography>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                                            <Typography variant="small" className="font-medium text-blue-gray-800">
                                                {truncateWords(answer, 20)}
                                            </Typography>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <Chip
                                            variant="ghost"
                                            color={status === "success" ? "green" : "red"}
                                            size="sm"
                                            value={status}
                                            className="font-medium"
                                        />
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="h-4 w-4 text-blue-gray-400" />
                                            <div>
                                                <Typography variant="small" className="font-medium text-blue-gray-800">
                                                    {new Date(createdAt).toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="small" className="text-xs text-blue-gray-500">
                                                    {new Date(createdAt).toLocaleTimeString()}
                                                </Typography>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <IconButton
                                            variant="text"
                                            color="blue-gray"
                                            size="sm"
                                            className="hover:bg-blue-gray-50 transition-colors duration-200"
                                            onClick={() => onOpenModal(histories[key])}
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
