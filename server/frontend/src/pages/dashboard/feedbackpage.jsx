// FeedbackPage.jsx - Optimized Version
import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import FeedbackTable from "@/widgets/tables/feedback-table";
import Pagination from "@/widgets/tables/components/pagination";
import FeedbackModal from "@/widgets/modals/feedback-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

export function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        fetchFeedbacks(page, statusFilter);
    }, [page, statusFilter]);

    const fetchFeedbacks = async (currentPage = 1, status = "") => {
        setLoading(true);
        try {
            let url = `/feedbacks/admin/all-feedbacks?page=${currentPage}&size=${PAGE_SIZE}`;
            if (status) {
                url += `&status=${status}`;
            }
            const res = await api.get(url);
            if (res.data.Code === 1) {
                setFeedbacks(res.data.Data.items);
                setTotalPages(res.data.Data.pagination.totalPages);
            }
        } catch (err) {
            toast.error("Không thể tải phản hồi");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (id) => {
        setSelectedFeedbackId(id);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedFeedbackId(null);
    };

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status);
        setPage(1); // Reset to first page when filtering
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Main Content Card */}
                <Card className="bg-white border border-gray-200 shadow-lg mt-12">
                    {loading && <LoadingTable text="Đang tải phản hồi" />}
                    <FeedbackTable
                        feedbacks={feedbacks}
                        onView={handleOpenModal}
                        page={page}
                        size={PAGE_SIZE}
                        statusFilter={statusFilter}
                        onStatusFilterChange={handleStatusFilterChange}
                    />
                    <div className="px-6 py-4 bg-white border-t border-gray-200">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </Card>

                <FeedbackModal
                    open={openModal}
                    onClose={handleCloseModal}
                    feedbackId={selectedFeedbackId}
                />
            </div>
        </div>
    );
}

export default FeedbackPage;