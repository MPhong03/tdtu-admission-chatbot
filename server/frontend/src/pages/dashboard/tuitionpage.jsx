import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import TuitionTable from "@/widgets/tables/tuition-table";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/components/pagination";
import TuitionModal from "@/widgets/modals/tuition-modal";
import ConfirmDialog from "@/widgets/dialogs/confirm-dialog";
import toast from "react-hot-toast";

export function TuitionPage() {
    const [tuitions, setTuitions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedTuition, setSelectedTuition] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [confirmDelete, setConfirmDelete] = useState({ open: false, tuition: null });
    const size = 5;

    const fetchTuitions = async (currentPage, searchKeyword = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: size,
                ...(searchKeyword && { keyword: searchKeyword })
            });
            
            const res = await api.get(`/v2/tuitions?${params}`);
            if (res.data.Code === 1) {
                setTuitions(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching tuition data:", error);
            toast.error("Lỗi khi tải danh sách học phí");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTuitions(page, keyword);
    }, [page, keyword]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleSearch = (searchKeyword) => {
        setKeyword(searchKeyword);
        setPage(1); // Reset to first page when searching
    };

    const handleOpenModal = (tuition, mode = "view") => {
        setSelectedTuition(tuition || null);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedTuition(null);
        if (refresh) fetchTuitions(page, keyword);
    };

    const handleDeleteTuition = (tuition) => {
        if (!tuition || !tuition.id) return;
        setConfirmDelete({ open: true, tuition });
    };

    const handleConfirmDelete = async () => {
        const tuition = confirmDelete.tuition;
        if (!tuition || !tuition.id) {
            setConfirmDelete({ open: false, tuition: null });
            return;
        }
        try {
            const res = await api.delete(`/v2/tuitions/${tuition.id}`);
            if (res.data.Code === 1) {
                toast.success("Xoá học phí thành công!");
                if (tuitions.length === 1 && page > 1) setPage(page - 1);
                else fetchTuitions(page, keyword);
            } else {
                throw new Error(res.data.Message || "Xoá học phí thất bại!");
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi khi xoá học phí!");
        }
        setConfirmDelete({ open: false, tuition: null });
    };

    const handleCancelDelete = () => setConfirmDelete({ open: false, tuition: null });

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card className="shadow-lg">
                {loading && <LoadingTable text="Đang tải" />}
                <TuitionTable
                    tuitions={tuitions}
                    onOpenModal={handleOpenModal}
                    onCreate={() => handleOpenModal(null, "create")}
                    onDelete={handleDeleteTuition}
                    page={page}
                    size={size}
                    keyword={keyword}
                    onSearch={handleSearch}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>

            <TuitionModal
                open={openModal}
                onClose={handleCloseModal}
                tuitionId={selectedTuition?.id}
                title={
                    !selectedTuition ? "Thêm mới học phí" :
                    selectedTuition?.name || "Chi tiết học phí"
                }
            />

            <ConfirmDialog
                open={confirmDelete.open}
                title="Xác nhận xoá học phí"
                content={
                    confirmDelete.tuition ?
                        <>Bạn có chắc chắn muốn xoá học phí "<b>{confirmDelete.tuition.name}</b>"?</> :
                        "Bạn có chắc chắn muốn xoá mục này?"
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

export default TuitionPage;
