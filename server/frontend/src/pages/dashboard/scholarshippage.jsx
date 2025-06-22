import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import ScholarshipTable from "@/widgets/tables/scholarship/scholarship-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/pagination";

export function ScholarshipPage() {
    const [scholarships, setScholarships] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const size = 5;

    const fetchScholarships = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/v2/scholarships?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setScholarships(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching Q&A scholarship:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScholarships(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (scholarship) => {
        // setSelectedHistory(scholarship);
        // setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedHistory(null);
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <ScholarshipTable
                    scholarships={scholarships}
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

            {/* <QAModal
                open={openModal}
                onClose={handleCloseModal}
                scholarship={selectedHistory}
            /> */}
        </div>
    );
}

export default ScholarshipPage;
