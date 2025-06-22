import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import MajorTable from "@/widgets/tables/major/major-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/pagination";
import MajorModal from "@/widgets/modals/major-modal";

export function MajorPage() {
    const [majors, setMajors] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedMajor, setSelectedMajor] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false); 

    const size = 5;

    const fetchMajors = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/v2/majors?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setMajors(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching Q&A major:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMajors(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (major, mode = "view") => {
        setSelectedMajor(major || null);
        setModalMode(mode);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedMajor(null);
        if (refresh) fetchMajors(page);
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <MajorTable
                    majors={majors}
                    onOpenModal={handleOpenModal}
                    onCreate={() => setOpenModal(true)}
                    page={page}
                    size={size}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>

            <MajorModal
                open={openModal}
                onClose={handleCloseModal}
                onSubmit={(m) => console.log(m)}
                majorId={selectedMajor?.id}
                // title={modalMode === "create" ? "Thêm mới tài liệu" : selectedMajor?.name || "Chi tiết tài liệu"}
            />
        </div>
    );
}

export default MajorPage;
