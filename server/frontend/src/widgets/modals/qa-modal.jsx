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
    Progress,
    Alert,
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
    CogIcon,
    ChartBarIcon,
    BoltIcon,
    MagnifyingGlassIcon,
    ListBulletIcon,
    InformationCircleIcon
} from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import api from "@/configs/api";
import { toast } from "react-toastify";
import remarkGfm from 'remark-gfm';
import './markdown.css';

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

    const getQuestionTypeColor = (type) => {
        switch (type) {
            case 'simple_admission': return 'green';
            case 'complex_admission': return 'blue';
            case 'off_topic': return 'orange';
            case 'inappropriate': return 'red';
            default: return 'gray';
        }
    };

    const getQuestionTypeLabel = (type) => {
        switch (type) {
            case 'simple_admission': return 'Câu hỏi đơn giản';
            case 'complex_admission': return 'Câu hỏi phức tạp';
            case 'off_topic': return 'Ngoài chủ đề';
            case 'inappropriate': return 'Không phù hợp';
            default: return type;
        }
    };

    const getProcessingMethodLabel = (method) => {
        switch (method) {
            case 'rag_simple': return 'RAG Đơn giản';
            case 'agent_complex': return 'Agent Phức tạp';
            case 'rule_based': return 'Dựa trên quy tắc';
            case 'llm_social': return 'LLM Xã hội';
            case 'fallback': return 'Phương pháp dự phòng';
            default: return method;
        }
    };

    const parseEnrichmentDetails = (details) => {
        try {
            return JSON.parse(details || '[]');
        } catch {
            return [];
        }
    };

    const parseAgentSteps = (steps) => {
        try {
            return JSON.parse(steps || '[]');
        } catch {
            return [];
        }
    };

    // Info Helper Component
    const InfoHelper = ({ title, description, variant = "default" }) => (
        <Alert 
            color={variant === "technical" ? "amber" : "blue"}
            variant="ghost"
            className="mb-4 border-l-4"
            icon={<InformationCircleIcon className="h-5 w-5" />}
        >
            <Typography variant="h6" className="font-semibold mb-1">
                {title}
            </Typography>
            <Typography variant="small" className="opacity-80">
                {description}
            </Typography>
        </Alert>
    );

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="xl"
            className="rounded-xl shadow-2xl overflow-hidden max-w-6xl"
        >
            {/* Header */}
            <div className="bg-gray-900 text-white rounded-t-lg px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ChatBubbleLeftRightIcon className="h-6 w-6"/>
                    <div>
                        <Typography variant="h5" className="font-bold">
                            Chi tiết cuộc hội thoại
                        </Typography>
                        <Typography variant="small" className="text-white/80 font-normal">
                            Phân tích toàn diện quá trình xử lý câu hỏi và hiệu suất hệ thống
                        </Typography>
                    </div>
                </div>
                <IconButton
                    variant="text"
                    color="white"
                    onClick={onClose}
                    className="hover:bg-white/10 transition-colors duration-200"
                >
                    <XMarkIcon className="h-6 w-6" />
                </IconButton>
            </div>

            {/* Content */}
            <DialogBody className="overflow-y-auto max-h-[80vh] p-0">
                <Tabs value={activeTab} className="bg-white">
                    <TabsHeader className="bg-gray-50 rounded-none border-b border-blue-gray-100">
                        <Tab value="info" onClick={() => setActiveTab("info")}>
                            <div className="flex flex-row items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5" />
                                <span>Thông tin chính</span>
                            </div>
                        </Tab>
                        <Tab value="processing" onClick={() => setActiveTab("processing")}>
                            <div className="flex flex-row items-center gap-2">
                                <CogIcon className="h-5 w-5" />
                                <span>Quá trình xử lý</span>
                            </div>
                        </Tab>
                        <Tab value="metrics" onClick={() => setActiveTab("metrics")}>
                            <div className="flex flex-row items-center gap-2">
                                <ChartBarIcon className="h-5 w-5" />
                                <span>Chỉ số & Đánh giá</span>
                            </div>
                        </Tab>
                        <Tab value="advanced" onClick={() => setActiveTab("advanced")}>
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
                                            <div className="space-y-2">
                                                <div>
                                                    <Typography className="text-sm font-semibold text-blue-gray-900">
                                                        {history.userId?.username || "(unknown)"}
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        {history.userId?.email || "(unknown)"}
                                                    </Typography>
                                                </div>
                                                <Typography className="text-xs text-blue-gray-500">
                                                    Session ID: {history.visitorId}
                                                </Typography>
                                            </div>
                                        </Card>

                                        <Card className="p-4 shadow-md border border-blue-gray-100 bg-green-50/30">
                                            <div className="flex items-center gap-3 mb-3">
                                                <ClockIcon className="h-5 w-5 text-green-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Trạng thái xử lý
                                                </Typography>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Typography className="text-sm font-medium text-blue-gray-700">
                                                        Kết quả:
                                                    </Typography>
                                                    <Chip
                                                        variant="ghost"
                                                        color={history.status === 'success' ? 'green' : 'red'}
                                                        size="sm"
                                                        value={history.status === 'success' ? 'Thành công' : 'Lỗi'}
                                                        className="font-medium"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Typography className="text-sm font-medium text-blue-gray-700">
                                                        Thời gian:
                                                    </Typography>
                                                    <Typography className="text-sm text-blue-gray-600">
                                                        {history.processingTime?.toFixed(2)}s
                                                    </Typography>
                                                </div>
                                                <Typography className="text-sm font-medium text-blue-gray-700">
                                                    Tạo lúc: {new Date(history.createdAt).toLocaleString('vi-VN')}
                                                </Typography>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Question Classification */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                                            <div className="flex items-center gap-3">
                                                <BoltIcon className="h-5 w-5 text-indigo-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Phân loại tự động
                                                </Typography>
                                            </div>
                                            <Typography variant="small" className="text-blue-gray-600 mt-1">
                                                AI phân tích và xác định loại câu hỏi để chọn phương pháp xử lý phù hợp
                                            </Typography>
                                        </div>
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Typography className="text-sm font-medium text-blue-gray-700 mb-2">
                                                        Loại câu hỏi:
                                                    </Typography>
                                                    <Chip
                                                        variant="ghost"
                                                        color={getQuestionTypeColor(history.questionType)}
                                                        value={getQuestionTypeLabel(history.questionType)}
                                                        className="font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <Typography className="text-sm font-medium text-blue-gray-700 mb-2">
                                                        Độ tin cậy phân loại:
                                                    </Typography>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={history.classificationConfidence * 100}
                                                            color="blue"
                                                            className="flex-1"
                                                        />
                                                        <Typography className="text-sm font-medium text-blue-gray-900">
                                                            {(history.classificationConfidence * 100).toFixed(1)}%
                                                        </Typography>
                                                    </div>
                                                </div>
                                            </div>
                                            {history.classificationReasoning && (
                                                <div>
                                                    <Typography className="text-sm font-medium text-blue-gray-700 mb-2">
                                                        Lý do phân loại:
                                                    </Typography>
                                                    <Typography className="text-sm text-blue-gray-600 bg-gray-50 p-3 rounded-lg">
                                                        {history.classificationReasoning}
                                                    </Typography>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Question */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-blue-50 p-4 border-b border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Câu hỏi gốc
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
                                                    Phản hồi từ AI
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-white border-l-4 border-green-500 p-4 rounded-r-lg">
                                                <div className="prose prose-sm max-w-none text-blue-gray-800">
                                                    <pre className="whitespace-pre-wrap font-sans">{history.answer || ""}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Admin Reply Section */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <UserIcon className="h-5 w-5 text-purple-500" />
                                                        <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                            Phản hồi bổ sung từ Admin
                                                        </Typography>
                                                    </div>
                                                </div>
                                                {history.adminAnswer && !isEditing && (
                                                    <Button
                                                        size="sm"
                                                        variant="text"
                                                        color="purple"
                                                        onClick={() => setIsEditing(true)}
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
                                                            <Typography className="text-sm text-blue-gray-800 whitespace-pre-wrap">
                                                                {history.adminAnswer}
                                                            </Typography>
                                                            {history.adminAnswerAt && (
                                                                <Typography className="text-xs text-blue-gray-500 mt-3 pt-3 border-t border-blue-gray-100">
                                                                    Cập nhật: {new Date(history.adminAnswerAt).toLocaleString('vi-VN')}
                                                                </Typography>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Typography className="text-blue-gray-400 mb-4">
                                                                Chưa có phản hồi bổ sung từ admin
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
                                                        placeholder="Nhập phản hồi bổ sung cho người dùng..."
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
                                                            <CheckIcon className="h-4 w-4" />
                                                            {history.adminAnswer ? "Cập nhật" : "Gửi phản hồi"}
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            color="blue-gray"
                                                            onClick={() => setIsEditing(false)}
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

                                <TabPanel value="processing" className="space-y-6">
                                    <InfoHelper 
                                        title="Quá trình xử lý chi tiết"
                                        description="Theo dõi từng bước AI xử lý câu hỏi: từ phân tích, tìm kiếm thông tin ban đầu, đến các bước làm giàu dữ liệu (enrichment) để cải thiện chất lượng trả lời."
                                    />

                                    {/* Processing Method */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-cyan-50 p-4 border-b border-cyan-100">
                                            <div className="flex items-center gap-3">
                                                <CogIcon className="h-5 w-5 text-cyan-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Phương pháp xử lý được chọn
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <Typography className="text-sm font-medium text-blue-gray-700">
                                                    Phương pháp:
                                                </Typography>
                                                <Chip
                                                    variant="ghost"
                                                    color="cyan"
                                                    value={getProcessingMethodLabel(history.processingMethod)}
                                                    className="font-medium"
                                                />
                                            </div>
                                            {history.enrichmentSteps > 0 && (
                                                <>
                                                    <Typography variant="small" className="text-blue-gray-600 mb-3">
                                                        Thống kê các bước làm giàu dữ liệu:
                                                    </Typography>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                                                            <Typography className="text-2xl font-bold text-cyan-600">
                                                                {history.enrichmentSteps}
                                                            </Typography>
                                                            <Typography className="text-xs text-blue-gray-600">
                                                                Bước enrichment
                                                            </Typography>
                                                        </div>
                                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                                            <Typography className="text-2xl font-bold text-green-600">
                                                                {history.enrichmentResults?.reduce((a, b) => a + b, 0) || 0}
                                                            </Typography>
                                                            <Typography className="text-xs text-blue-gray-600">
                                                                Kết quả tìm được
                                                            </Typography>
                                                        </div>
                                                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                                                            <Typography className="text-2xl font-bold text-purple-600">
                                                                {history.enrichmentQueries?.length || 0}
                                                            </Typography>
                                                            <Typography className="text-xs text-blue-gray-600">
                                                                Truy vấn thực hiện
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Agent Steps */}
                                    {history.processingMethod === 'agent_complex' && (
                                        <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                            <div className="bg-orange-50 p-4 border-b border-orange-100">
                                                <div className="flex items-center gap-3">
                                                    <ListBulletIcon className="h-5 w-5 text-orange-500" />
                                                    <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                        Các bước xử lý phức tạp
                                                    </Typography>
                                                </div>
                                                <Typography variant="small" className="text-blue-gray-600 mt-1">
                                                    Chi tiết từng bước AI agent thực hiện để xử lý câu hỏi phức tạp
                                                </Typography>
                                            </div>
                                            <div className="p-4">
                                                <div className="space-y-3">
                                                    {parseAgentSteps(history.agentSteps).map((step, index) => (
                                                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                                <Typography className="text-xs font-bold text-orange-600">
                                                                    {index + 1}
                                                                </Typography>
                                                            </div>
                                                            <div className="flex-1">
                                                                <Typography className="text-sm font-medium text-blue-gray-900 mb-1">
                                                                    {step.step?.replace(/_/g, ' ').toUpperCase() || `Bước ${index + 1}`}
                                                                </Typography>
                                                                <Typography className="text-xs text-blue-gray-600">
                                                                    {step.description || "Không có mô tả"}
                                                                </Typography>
                                                                {step.timestamp && (
                                                                    <Typography className="text-xs text-blue-gray-400 mt-1">
                                                                        {step.timestamp}ms
                                                                    </Typography>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Enrichment Details */}
                                    {history.enrichmentSteps > 0 && (
                                        <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                            <div className="bg-green-50 p-4 border-b border-green-100">
                                                <div className="flex items-center gap-3">
                                                    <MagnifyingGlassIcon className="h-5 w-5 text-green-500" />
                                                    <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                        Chi tiết các bước Enrichment
                                                    </Typography>
                                                </div>
                                                <Typography variant="small" className="text-blue-gray-600 mt-1">
                                                    Khi AI phát hiện thông tin chưa đủ, nó sẽ tìm kiếm thêm dữ liệu để cải thiện chất lượng trả lời
                                                </Typography>
                                            </div>
                                            <div className="p-4">
                                                <div className="space-y-4">
                                                    {parseEnrichmentDetails(history.enrichmentDetails)
                                                        .filter(detail => detail.step?.includes('enrichment'))
                                                        .map((detail, index) => (
                                                            <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <Typography className="text-sm font-medium text-green-800">
                                                                        Enrichment {index + 1}
                                                                    </Typography>
                                                                    <div className="flex items-center gap-2">
                                                                        <Chip
                                                                            variant="ghost"
                                                                            color="green"
                                                                            size="sm"
                                                                            value={`${detail.resultCount || 0} kết quả`}
                                                                            className="font-medium"
                                                                        />
                                                                        <Typography className="text-xs text-green-600">
                                                                            {detail.timestamp}ms
                                                                        </Typography>
                                                                    </div>
                                                                </div>
                                                                <Typography className="text-sm text-blue-gray-700 mb-2">
                                                                    {detail.description}
                                                                </Typography>
                                                                {detail.cypher && (
                                                                    <div className="bg-gray-900 rounded p-2 overflow-x-auto">
                                                                        <pre className="text-xs text-green-400 font-mono">
                                                                            {detail.cypher}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </TabPanel>

                                <TabPanel value="metrics" className="space-y-6">
                                    <InfoHelper 
                                        title="Đánh giá chất lượng và hiệu suất"
                                        description="Theo dõi các chỉ số quan trọng: độ tin cậy của context (thông tin có đủ để trả lời không), thời gian xử lý, và tình trạng xác thực của câu trả lời."
                                    />

                                    {/* Context Score Evolution */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-blue-50 p-4 border-b border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <ChartBarIcon className="h-5 w-5 text-blue-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Điểm Context Score - Độ đầy đủ thông tin
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="mb-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Typography className="text-sm font-medium text-blue-gray-700">
                                                        Điểm cuối cùng:
                                                    </Typography>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={history.contextScore * 100}
                                                            color={history.contextScore >= 0.7 ? 'green' : history.contextScore >= 0.5 ? 'orange' : 'red'}
                                                            className="w-32"
                                                        />
                                                        <Typography className="text-lg font-bold text-blue-gray-900">
                                                            {(history.contextScore * 100).toFixed(1)}%
                                                        </Typography>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Context Score History */}
                                            <div className="space-y-3">
                                                <Typography className="text-sm font-medium text-blue-gray-700">
                                                    Quá trình cải thiện điểm:
                                                </Typography>
                                                {history.contextScoreHistory.map((score, index) => (
                                                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <Typography className="text-xs font-bold text-blue-600">
                                                                {index + 1}
                                                            </Typography>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Typography className="text-sm font-medium text-blue-gray-900">
                                                                    {index === 0 ? 'Truy vấn ban đầu' : `Sau enrichment ${index}`}
                                                                </Typography>
                                                                <div className="flex items-center gap-2">
                                                                    <Progress
                                                                        value={score * 100}
                                                                        color={score >= 0.7 ? 'green' : score >= 0.5 ? 'orange' : 'red'}
                                                                        className="w-20"
                                                                    />
                                                                    <Typography className="text-sm font-bold text-blue-gray-900">
                                                                        {(score * 100).toFixed(1)}%
                                                                    </Typography>
                                                                </div>
                                                            </div>
                                                            {history.contextScoreReasons[index] && (
                                                                <Typography className="text-xs text-blue-gray-600">
                                                                    {history.contextScoreReasons[index]}
                                                                </Typography>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Performance Metrics */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                                            <div className="flex items-center gap-3">
                                                <BoltIcon className="h-5 w-5 text-purple-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Chỉ số hiệu suất tổng quan
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                                    <Typography className="text-2xl font-bold text-purple-600">
                                                        {history.processingTime?.toFixed(2)}s
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        Thời gian xử lý
                                                    </Typography>
                                                </div>
                                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                    <Typography className="text-2xl font-bold text-blue-600">
                                                        {(history.classificationConfidence * 100).toFixed(1)}%
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        Tin cậy phân loại
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-500 mt-1">
                                                        {history.classificationConfidence > 0.8 ? 'Cao' : history.classificationConfidence > 0.6 ? 'Trung bình' : 'Thấp'}
                                                    </Typography>
                                                </div>
                                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                                    <Typography className="text-2xl font-bold text-green-600">
                                                        {(history.contextScore * 100).toFixed(1)}%
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        Context Score
                                                    </Typography>
                                                    <Typography className="text-xs text-green-500 mt-1">
                                                        {history.contextScore > 0.7 ? 'Tốt' : history.contextScore > 0.5 ? 'Trung bình' : 'Kém'}
                                                    </Typography>
                                                </div>
                                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                                    <Typography className="text-2xl font-bold text-orange-600">
                                                        {history.enrichmentSteps || 0}
                                                    </Typography>
                                                    <Typography className="text-xs text-blue-gray-600">
                                                        Enrichment Steps
                                                    </Typography>
                                                    <Typography className="text-xs text-orange-500 mt-1">
                                                        {history.enrichmentSteps > 2 ? 'Nhiều' : history.enrichmentSteps > 0 ? 'Vừa phải' : 'Không cần'}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Verification Status */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-yellow-50 p-4 border-b border-yellow-100">
                                            <div className="flex items-center gap-3">
                                                <CheckIcon className="h-5 w-5 text-yellow-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Trạng thái xác thực câu trả lời
                                                </Typography>
                                            </div>
                                            <Typography variant="small" className="text-blue-gray-600 mt-1">
                                                Hệ thống tự động nhận xét để đảm bảo tính chính xác của câu trả lời
                                            </Typography>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between">
                                                <Typography className="text-sm font-medium text-blue-gray-700">
                                                    Trạng thái xác thực:
                                                </Typography>
                                                <Chip
                                                    variant="ghost"
                                                    color={history.isVerified ? 'green' : 'orange'}
                                                    size="sm"
                                                    value={history.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                                                    className="font-medium"
                                                />
                                            </div>
                                            {history.isVerified && (
                                                <>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <Typography className="text-sm font-medium text-blue-gray-700">
                                                            Điểm xác thực:
                                                        </Typography>
                                                        <Typography className="text-sm font-bold text-green-600">
                                                            {(history.verificationScore * 100).toFixed(1)}%
                                                        </Typography>
                                                    </div>
                                                    {history.verificationReason && (
                                                        <div className="mt-3">
                                                            <Typography className="text-sm font-medium text-blue-gray-700 mb-2">
                                                                Lý do xác thực:
                                                            </Typography>
                                                            <Typography className="text-sm text-blue-gray-600 bg-gray-50 p-3 rounded-lg">
                                                                {history.verificationReason}
                                                            </Typography>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </Card>
                                </TabPanel>

                                <TabPanel value="advanced" className="space-y-6">
                                    <InfoHelper 
                                        variant="technical"
                                        title="Dữ liệu kỹ thuật cho nhân viên IT"
                                        description="Thông tin chi tiết về các truy vấn database, context nodes, và dữ liệu thô để debug và tối ưu hệ thống. Phần này dành cho nhân viên kỹ thuật."
                                    />

                                    {/* Main Cypher Query */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                                            <div className="flex items-center gap-3">
                                                <CodeBracketIcon className="h-5 w-5 text-purple-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Main Cypher Query
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

                                    {/* Enrichment Queries */}
                                    {history.enrichmentQueries && history.enrichmentQueries.length > 0 && (
                                        <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                            <div className="bg-green-50 p-4 border-b border-green-100">
                                                <div className="flex items-center gap-3">
                                                    <MagnifyingGlassIcon className="h-5 w-5 text-green-500" />
                                                    <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                        Enrichment Queries
                                                    </Typography>
                                                </div>
                                                <Typography variant="small" className="text-blue-gray-600 mt-1">
                                                    Các truy vấn bổ sung được thực hiện khi hệ thống phát hiện cần thêm thông tin
                                                </Typography>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {history.enrichmentQueries.map((query, index) => (
                                                    <div key={index}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <Typography className="text-sm font-medium text-green-700">
                                                                Enrichment Query {index + 1}
                                                            </Typography>
                                                            <Chip
                                                                variant="ghost"
                                                                color="green"
                                                                size="sm"
                                                                value={`${history.enrichmentResults[index] || 0} kết quả`}
                                                                className="font-medium"
                                                            />
                                                        </div>
                                                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                                                {query}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* Context Nodes */}
                                    <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                        <div className="bg-orange-50 p-4 border-b border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <CubeIcon className="h-5 w-5 text-orange-500" />
                                                <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                    Context Nodes (Raw Data)
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

                                    {/* Full Enrichment Details */}
                                    {history.enrichmentDetails && (
                                        <Card className="shadow-md border border-blue-gray-100 overflow-hidden">
                                            <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                                                <div className="flex items-center gap-3">
                                                    <DocumentTextIcon className="h-5 w-5 text-indigo-500" />
                                                    <Typography variant="h6" className="text-blue-gray-900 font-semibold">
                                                        Full Enrichment Details (JSON)
                                                    </Typography>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                                    <pre className="text-xs text-blue-gray-800 font-mono whitespace-pre-wrap">
                                                        {JSON.stringify(parseEnrichmentDetails(history.enrichmentDetails), null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Debug Information */}
                                    {/* <Card className="shadow-md border border-amber-200 bg-amber-50/50 overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-6 w-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <Typography variant="h6" className="text-amber-800 font-semibold mb-2">
                                                        Thông tin Debug
                                                    </Typography>
                                                    <Typography variant="small" className="text-amber-700 leading-relaxed mb-3">
                                                        Các thông tin kỹ thuật này giúp nhân viên IT debug và tối ưu hệ thống:
                                                    </Typography>
                                                    <div className="space-y-2 text-sm text-amber-800">
                                                        <div className="flex justify-between">
                                                            <span>Processing Time:</span>
                                                            <span className="font-mono">{history.processingTime}s</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Method Used:</span>
                                                            <span className="font-mono">{history.processingMethod}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Total Enrichment Steps:</span>
                                                            <span className="font-mono">{history.enrichmentSteps}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Final Context Score:</span>
                                                            <span className="font-mono">{(history.contextScore * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Classification Confidence:</span>
                                                            <span className="font-mono">{(history.classificationConfidence * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Verification Status:</span>
                                                            <span className="font-mono">{history.isVerified ? 'Verified' : 'Pending'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card> */}
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
        </Dialog>
    );
};

export default QAModal;
