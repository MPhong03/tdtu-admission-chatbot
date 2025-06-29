import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import QATable from "@/widgets/tables/history/qa-table";
import QAModal from "@/widgets/modals/qa-modal";
import Pagination from "@/widgets/tables/pagination";
import LoadingTable from "@/widgets/tables/components/loadingtable";

export function QAPage() {
    const [histories, setHistories] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const size = 5;

    const fetchHistories = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/histories?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setHistories(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching Q&A history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistories(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (history) => {
        setSelectedHistory(history);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedHistory(null);
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <QATable
                    histories={histories}
                    onOpenModal={handleOpenModal}
                    page={page}
                    size={size}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>

            <QAModal
                open={openModal}
                onClose={handleCloseModal}
                history={selectedHistory}
            />
        </div>
    );
}

export default QAPage;
