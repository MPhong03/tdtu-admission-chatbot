import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import ProgrammeTable from "@/widgets/tables/programme/programme-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/pagination";

export function ProgrammePage() {
    const [programmes, setProgrammes] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const size = 5;

    const fetchProgrammes = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/v2/programmes?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setProgrammes(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching Q&A programme:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgrammes(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (programme) => {
        // setSelectedHistory(programme);
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
                <ProgrammeTable
                    programmes={programmes}
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
                programme={selectedHistory}
            /> */}
        </div>
    );
}

export default ProgrammePage;
