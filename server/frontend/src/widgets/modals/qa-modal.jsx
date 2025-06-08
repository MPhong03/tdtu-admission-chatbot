import React from "react";
import {
    Dialog,
    DialogBody,
    DialogFooter,
    IconButton,
    Typography,
    Button,
    Card,
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";

const QAModal = ({ open, onClose, history }) => {
    return (
        <Dialog open={open} handler={onClose} size="lg" className="rounded-lg shadow-xl">
            <div className="bg-gray-900 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <Typography variant="h5" className="font-semibold flex items-center gap-2">
                    <EyeIcon className="h-6 w-6" /> Chi tiết lịch sử chat
                </Typography>
                <IconButton variant="text" color="white" onClick={onClose} className="hover:bg-white/10">
                    <XMarkIcon className="h-6 w-6" />
                </IconButton>
            </div>

            <DialogBody className="overflow-y-auto max-h-[70vh] space-y-6 px-6 py-4">
                {history ? (
                    <>
                        <div className="space-y-2">
                            <Typography variant="h6" color="blue-gray">
                                Thông tin chung
                            </Typography>
                            <div>
                                <Typography className="text-sm font-semibold text-gray-700">Người dùng:</Typography>
                                <Typography className="text-sm text-gray-800">{history.userId?.username || "(unknown)"}</Typography>
                                <Typography className="text-sm text-gray-500">{history.userId?.email || ""}</Typography>
                            </div>
                            <div>
                                <Typography className="text-sm font-semibold text-gray-700">Chat:</Typography>
                                <Typography className="text-sm text-gray-800">{history.chatId?.name || "-"}</Typography>
                            </div>
                            <div>
                                <Typography className="text-sm font-semibold text-gray-700">Thời gian:</Typography>
                                <Typography className="text-sm text-gray-600">{new Date(history.createdAt).toLocaleString()}</Typography>
                            </div>
                        </div>

                        <Card className="p-4 shadow-md border border-gray-200">
                            <Typography variant="h6" color="blue-gray" className="mb-2">
                                Câu hỏi
                            </Typography>
                            <Typography className="text-sm text-gray-800 whitespace-pre-wrap">
                                {history.question}
                            </Typography>
                        </Card>

                        <Card className="p-4 shadow-md border border-gray-200">
                            <Typography variant="h6" color="blue-gray" className="mb-2">
                                Câu trả lời
                            </Typography>
                            <div className="prose max-w-none text-sm text-gray-800">
                                <ReactMarkdown>{history.answer || ""}</ReactMarkdown>
                            </div>
                        </Card>
                    </>
                ) : (
                    <Typography className="text-gray-700">Không có dữ liệu để hiển thị</Typography>
                )}
            </DialogBody>

            <DialogFooter className="bg-gray-100 px-8 py-4 rounded-b-lg">
                <Button variant="gradient" color="black" onClick={onClose}>
                    Đóng
                </Button>
            </DialogFooter>
        </Dialog>
    );
};

export default QAModal;
