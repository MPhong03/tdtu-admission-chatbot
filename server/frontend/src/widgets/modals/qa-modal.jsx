import React from "react";
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
} from "@material-tailwind/react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";

const QAModal = ({ open, onClose, history }) => {
    const [activeTab, setActiveTab] = React.useState("info");

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

            <DialogBody className="overflow-y-auto max-h-[70vh] p-0">
                <Tabs value={activeTab} className="bg-white">
                    <TabsHeader className="bg-gray-100 rounded-none">
                        <Tab value="info" onClick={() => setActiveTab("info")}>
                            Thông tin chính
                        </Tab>
                        <Tab value="advanced" onClick={() => setActiveTab("advanced")}>
                            Nâng cao
                        </Tab>
                    </TabsHeader>
                    <TabsBody className="p-6">
                        {history ? (
                            <>
                                <TabPanel value="info" className="space-y-6">
                                    <div className="flex flex-wrap gap-4">
                                        {/* Cột Người dùng */}
                                        <div className="flex-1 min-w-[280px] max-w-full sm:w-1/2 space-y-2">
                                            <Typography variant="h6" color="blue-gray">
                                                Người dùng
                                            </Typography>
                                            <div>
                                                <Typography className="text-sm text-gray-800">
                                                    <span className="font-semibold text-gray-700">Tên:</span> {history.userId?.username || "(unknown)"}
                                                </Typography>
                                                <Typography className="text-sm text-gray-800">
                                                    <span className="font-semibold text-gray-700">Email:</span> {history.userId?.email || "(unknown)"}
                                                </Typography>
                                            </div>
                                        </div>

                                        {/* Cột Đoạn chat */}
                                        <div className="flex-1 min-w-[280px] max-w-full sm:w-1/2 space-y-2">
                                            {/* <Typography variant="h6" color="blue-gray">
                                                Đoạn chat
                                            </Typography>
                                            <Typography className="text-sm text-gray-800">
                                                {history.chatId?.name || "-"}
                                            </Typography> */}
                                            <div>
                                                <Typography className="text-sm font-semibold text-gray-700">Thời gian:</Typography>
                                                <Typography className="text-sm text-gray-600">{new Date(history.createdAt).toLocaleString()}</Typography>
                                            </div>
                                            <div>
                                                <Typography className="text-sm font-semibold text-gray-700">Trạng thái:</Typography>
                                                <Typography className={`text-sm font-semibold ${history.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {history.status}
                                                </Typography>
                                            </div>
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
                                </TabPanel>

                                <TabPanel value="advanced" className="space-y-4">
                                    <Card className="p-4 shadow-md border border-gray-200">
                                        <Typography variant="h6" color="blue-gray" className="mb-2">
                                            Cypher
                                        </Typography>
                                        <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap">{history.cypher || "(no cypher)"}</pre>
                                    </Card>

                                    <Card className="p-4 shadow-md border border-gray-200">
                                        <Typography variant="h6" color="blue-gray" className="mb-2">
                                            Context Nodes
                                        </Typography>
                                        <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap overflow-x-auto">
                                            {JSON.stringify(JSON.parse(history.contextNodes || "[]"), null, 2)}
                                        </pre>
                                    </Card>
                                </TabPanel>
                            </>
                        ) : (
                            <Typography className="text-gray-700">Không có dữ liệu để hiển thị</Typography>
                        )}
                    </TabsBody>
                </Tabs>
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
