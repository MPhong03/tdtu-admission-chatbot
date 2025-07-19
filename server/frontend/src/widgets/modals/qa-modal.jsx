import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogBody,
    DialogFooter,
    IconButton,
    Typography,
    Button,
    Tabs,
    TabsHeader,
    TabsBody,
    Tab,
    TabPanel,
    Card,
    Chip,
    Textarea,
} from "@material-tailwind/react";
import {
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    DocumentTextIcon,
    CodeBracketIcon,
    CubeIcon,
    PaperAirplaneIcon,
    PencilIcon,
    CheckIcon,
} from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import api from "@/configs/api";
import { toast } from "react-toastify";

const QAModal = ({ open, onClose, history, onUpdateHistory }) => {
    const [activeTab, setActiveTab] = useState("info");
    const [adminAnswer, setAdminAnswer] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Reset state when modal opens/closes or history changes
    useEffect(() => {
        if (open && history) {
            setAdminAnswer(history.adminAnswer || "");
            setIsEditing(false);
            setActiveTab("info");
        }
    }, [open, history]);

    const handleSubmitAdminAnswer = async () => {
        if (!adminAnswer.trim()) {
            toast.error("Vui lòng nhập nội dung phản hồi");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/histories/${history._id}/reply`, {
                answer: adminAnswer.trim()
            });

            if (response.data.Code === 1) {
                toast.success(history.adminAnswer ? "Cập nhật phản hồi thành công" : "Thêm phản hồi thành công");
                setIsEditing(false);
                
                // Update the history object with new admin answer
                const updatedHistory = {
                    ...history,
                    adminAnswer: adminAnswer.trim(),
                    adminAnswerAt: new Date().toISOString(),
                    isAdminReviewed: true
                };

                // Call callback to update parent component if provided
                if (onUpdateHistory) {
                    onUpdateHistory(updatedHistory);
                }
            } else {
                toast.error(response.data.Message || "Có lỗi xảy ra");
            }
        } catch (error) {
            console.error("Error submitting admin answer:", error);
            toast.error("Lỗi hệ thống khi gửi phản hồi");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setAdminAnswer(history?.adminAnswer || "");
        setIsEditing(false);
    };

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="xl"
            className="rounded-xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gray-900 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 rounded-lg">
                        <ChatBubbleLeftRightIcon className="h-6 w-6"/>
                    </div>
                    <div>
                        <Typography variant="h5" className="font-bold">
                            Chi tiết cuộc hội thoại
                        </Typography>
                        <Typography variant="small" className="text-white/80 font-normal">
                            Thông tin chi tiết về tương tác Q&A
                        </Typography>
                    </div>
                </div>
                <IconButton
                    variant="text"
                    color="white"
                    onClick={onClose}
                    className="hover:bg-white/10 transition-colors duration-200 relative z-10"
                >
                    <XMarkIcon className="h-6 w-6" />
                </IconButton>
            </div>

            {/* Content */}
            <DialogBody className="overflow-y-auto max-h-[75vh] p-0">
                <Tabs value={activeTab} className="bg-white">
                    <TabsHeader className="bg-gray-50 rounded-none border-b border-blue-gray-100">
                        <Tab
                            value="info"
                            onClick={() => setActiveTab("info")}
                        >
                            <div className="flex flex-row items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5" />
                                <span>Thông tin chính</span>
                            </div>
                        </Tab>

                        <Tab
                            value="advanced"
                            onClick={() => setActiveTab("advanced")}
                        >
                            <div className="flex flex-row items-center gap-2">
                                <CodeBracketIcon className="h-5 w-5" />
                                <span>Dữ liệu kỹ thuật</span>
                            </div>
                        </Tab>
                    </TabsHeader>

                    <TabsBody className="p-6">
                        {history ? (
                            <>
                                <TabPanel value="info" className="space-y-6">
                                    {/* User & Status Info */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card className="p-4 shadow-md border border-blue-gray-100 bg-blue-50/30">
                                            <div className="flex items-center gap-3 mb-3">
                                                <UserIcon className="h-5 w-5 text-blue-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Thông tin người dùng
                                                </Typography>
                                            </div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div>
                                                    <Typography className="text-sm font-semibold text-blue-gray-900">
                                                        {history.userId?.username || "(unknown)"}
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        {history.userId?.email || "(unknown)"}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card className="p-4 shadow-md border border-blue-gray-100 bg-green-50/30">
                                            <div className="flex items-center gap-3 mb-3">
                                                <ClockIcon className="h-5 w-5 text-green-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Trạng thái & thời gian
                                                </Typography>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Typography className="text-sm font-medium text-blue-gray-700">
                                                        Trạng thái:
                                                    </Typography>
                                                    <Chip
                                                        variant="ghost"
                                                        color={history.status === 'success' ? 'green' : 'red'}
                                                        size="sm"
                                                        value={history.status}
                                                        className="font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <Typography className="text-sm font-medium text-blue-gray-700">
                                                        Thời gian:
                                                    </Typography>
                                                    <Typography className="text-sm text-blue-gray-600">
                                                        {new Date(history.createdAt).toLocaleString()}
                                                    </Typography>
                                                </div>
                                                {history.isAdminReviewed && (
                                                    <div className="flex items-center justify-between">
                                                        <Typography className="text-sm font-medium text-blue-gray-700">
                                                            Admin đã phản hồi:
                                                        </Typography>
                                                        <Chip
                                                            variant="ghost"
                                                            color="blue"
                                                            size="sm"
                                                            value="Đã xử lý"
                                                            className="font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Question */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-blue-50 p-4 border-b border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Câu hỏi của người dùng
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-white border-l-4 border-blue-500 p-4 rounded-r-lg">
                                                <Typography className="text-sm text-blue-gray-800 whitespace-pre-wrap leading-relaxed">
                                                    {history.question}
                                                </Typography>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Chatbot Answer */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-green-50 p-4 border-b border-green-100">
                                            <div className="flex items-center gap-3">
                                                <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Phản hồi từ chatbot
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-white border-l-4 border-green-500 p-4 rounded-r-lg">
                                                <div className="prose prose-sm max-w-none text-blue-gray-800">
                                                    <ReactMarkdown>{history.answer || ""}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Admin Reply Section */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <UserIcon className="h-5 w-5 text-purple-500" />
                                                    <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                        Phản hồi của Admin
                                                    </Typography>
                                                </div>
                                                {history.adminAnswer && !isEditing && (
                                                    <Button
                                                        size="sm"
                                                        variant="text"
                                                        color="purple"
                                                        onClick={handleEditClick}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                        Chỉnh sửa
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            {!isEditing ? (
                                                <div className="bg-white border-l-4 border-purple-500 p-4 rounded-r-lg">
                                                    {history.adminAnswer ? (
                                                        <>
                                                            <div className="prose prose-sm max-w-none text-blue-gray-800">
                                                                <ReactMarkdown>{history.adminAnswer}</ReactMarkdown>
                                                            </div>
                                                            {history.adminAnswerAt && (
                                                                <Typography className="text-xs text-blue-gray-500 mt-3 pt-3 border-t border-blue-gray-100">
                                                                    Cập nhật lúc: {new Date(history.adminAnswerAt).toLocaleString()}
                                                                </Typography>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Typography className="text-blue-gray-400 mb-4">
                                                                Chưa có phản hồi từ admin
                                                            </Typography>
                                                            <Button
                                                                color="purple"
                                                                variant="gradient"
                                                                onClick={() => setIsEditing(true)}
                                                                className="flex items-center gap-2 mx-auto"
                                                            >
                                                                <PaperAirplaneIcon className="h-4 w-4" />
                                                                Thêm phản hồi
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <Textarea
                                                        label="Phản hồi của bạn"
                                                        value={adminAnswer}
                                                        onChange={(e) => setAdminAnswer(e.target.value)}
                                                        placeholder="Nhập phản hồi cho người dùng..."
                                                        rows={6}
                                                        className="w-full"
                                                    />
                                                    <div className="flex items-center gap-3">
                                                        <Button
                                                            color="purple"
                                                            variant="gradient"
                                                            onClick={handleSubmitAdminAnswer}
                                                            disabled={loading}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {loading ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    Đang gửi...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckIcon className="h-4 w-4" />
                                                                    {history.adminAnswer ? "Cập nhật" : "Gửi phản hồi"}
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            color="blue-gray"
                                                            onClick={handleCancelEdit}
                                                            disabled={loading}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </TabPanel>

                                <TabPanel value="advanced" className="space-y-6">
                                    <Card className="shadow-md border border-amber-200 bg-amber-50/50 overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-6 w-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <Typography variant="h6" className="text-amber-800 font-semibold mb-2">
                                                        Thông tin kỹ thuật
                                                    </Typography>
                                                    <Typography variant="small" className="text-amber-700 leading-relaxed">
                                                        Phần này chứa dữ liệu kỹ thuật chi tiết về cách hệ thống xử lý câu hỏi. 
                                                        Nếu bạn không phải là nhân viên kỹ thuật, bạn có thể bỏ qua phần này và 
                                                        tập trung vào tab <span className="font-semibold">"Thông tin chính"</span> để 
                                                        phản hồi người dùng một cách hiệu quả.
                                                    </Typography>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                    {/* Cypher Query */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                                            <div className="flex items-center gap-3">
                                                <CodeBracketIcon className="h-5 w-5 text-purple-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Cypher Query
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                                                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                                                    {history.cypher || "(no cypher query)"}
                                                </pre>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Context Nodes */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-orange-50 p-4 border-b border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <CubeIcon className="h-5 w-5 text-orange-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Context Nodes
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                                <pre className="text-xs text-blue-gray-800 font-mono whitespace-pre-wrap">
                                                    {JSON.stringify(JSON.parse(history.contextNodes || "[]"), null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </Card>
                                </TabPanel>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <ChatBubbleLeftRightIcon className="h-16 w-16 text-blue-gray-300 mb-4" />
                                <Typography variant="h6" className="text-blue-gray-500 mb-2">
                                    Không có dữ liệu
                                </Typography>
                                <Typography variant="small" className="text-blue-gray-400">
                                    Không thể hiển thị thông tin chi tiết
                                </Typography>
                            </div>
                        )}
                    </TabsBody>
                </Tabs>
            </DialogBody>

            {/* Footer */}
            {/* <DialogFooter className="bg-gray-50 px-6 py-4 border-t border-blue-gray-100">
                <Button
                    variant="gradient"
                    color="blue-gray"
                    onClick={onClose}
                    className="flex items-center gap-2"
                >
                    <XMarkIcon className="h-4 w-4" />
                    Đóng
                </Button>
            </DialogFooter> */}
        </Dialog>
    );
};

export default QAModal;
