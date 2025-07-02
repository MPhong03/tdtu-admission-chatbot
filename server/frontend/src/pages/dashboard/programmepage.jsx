import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import ProgrammeTable from "@/widgets/tables/programme/programme-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/pagination";
import ProgrammeModal from "@/widgets/modals/programme-modal";
import ConfirmDialog from "@/widgets/dialogs/confirm-dialog";
import toast from "react-hot-toast";

export function ProgrammePage() {
    const [programmes, setProgrammes] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedProgramme, setSelectedProgramme] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false);

    // Confirm dialog state
    const [confirmDelete, setConfirmDelete] = useState({ open: false, programme: null });

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

    const handleOpenModal = (Programme, mode = "view") => {
        setSelectedProgramme(Programme || null);
        setModalMode(mode);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedProgramme(null);
        if (refresh) fetchProgrammes(page);
    };

    // ==== Xử lý xoá programme ====
    const handleDeleteProgramme = (programme) => {
        if (!programme || (!programme.id && !programme._id)) return;
        setConfirmDelete({
            open: true,
            programme,
        });
    };

    const handleConfirmDelete = async () => {
        const programme = confirmDelete.programme;
        if (!programme || (!programme.id && !programme._id)) {
            setConfirmDelete({ open: false, programme: null });
            return;
        }
        const id = programme.id || programme._id;
        try {
            const res = await api.delete(`/v2/programmes/${id}`);
            if (res.data.Code === 1) {
                toast.success("Xoá chương trình/hệ thành công!");
                // Nếu chương trình/hệ bị xoá là chương trình/hệ cuối cùng của trang, chuyển về trang trước
                if (programmes.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchProgrammes(page);
                }
            } else {
                throw new Error(res.data.Message || "Xoá chương trình/hệ thất bại");
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi khi xoá chương trình/hệ!");
        }
        setConfirmDelete({ open: false, programme: null });
    };

    const handleCancelDelete = () => {
        setConfirmDelete({ open: false, programme: null });
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <ProgrammeTable
                    programmes={programmes}
                    onOpenModal={(prog) => handleOpenModal(prog, "view")}
                    onCreate={() => handleOpenModal(null, "create")}
                    onDelete={handleDeleteProgramme}
                    page={page}
                    size={size}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>

            <ProgrammeModal
                open={openModal}
                onClose={handleCloseModal}
                programmeId={modalMode === "view" && selectedProgramme ? selectedProgramme?.id : undefined}
                title={modalMode === "create" ? "Thêm mới tài liệu" : selectedProgramme?.name || "Chi tiết tài liệu"}
            />

            {/* Dialog confirm xóa */}
            <ConfirmDialog
                open={confirmDelete.open}
                title="Xác nhận xoá chương trình/hệ"
                content={
                    confirmDelete.programme
                        ? <>Bạn có chắc chắn muốn xoá chương trình/hệ "<b>{confirmDelete.programme.name}</b>"?</>
                        : "Bạn có chắc chắn muốn xoá mục này?"
                }
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                confirmText="Xoá"
                cancelText="Hủy"
                confirmColor="red"
            />
        </div>
    );
}

export default ProgrammePage;
