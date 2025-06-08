import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
} from "@material-tailwind/react";
import { EyeIcon } from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

const QATable = ({ histories, onOpenModal, page = 1, size = 5 }) => (
    <>
        <CardHeader variant="gradient" color="gray" className="mb-8 p-6">
            <Typography variant="h6" color="white">
                Lịch sử Q&A
            </Typography>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
            <table className="w-full min-w-[640px] table-auto">
                <thead>
                    <tr>
                        {["#", "Người dùng", "Chat", "Câu hỏi", "Câu trả lời", "Trạng thái", "Thời gian", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {histories.map(({ _id, userId, chatId, question, answer, status, createdAt }, key) => {
                        const className = `py-3 px-5 ${key === histories.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={_id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>
                                    <div>
                                        <Typography variant="small" className="font-semibold">
                                            {userId?.username || "(unknown)"}
                                        </Typography>
                                        <Typography className="text-xs font-normal text-blue-gray-500">
                                            {userId?.email || ""}
                                        </Typography>
                                    </div>
                                </td>
                                <td className={className}>{chatId?.name || "-"}</td>
                                <td className={className}>{truncateWords(question, 20)}</td>
                                <td className={className}>{truncateWords(answer, 20)}</td>
                                <td className={className}>{status}</td>
                                <td className={className}>{new Date(createdAt).toLocaleString()}</td>
                                <td className={className}>
                                    <IconButton variant="text" color="black" onClick={() => onOpenModal(histories[key])}>
                                        <EyeIcon className="h-5 w-5" />
                                    </IconButton>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </CardBody>
    </>
);

export default QATable;
