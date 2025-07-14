import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import MajorTable from "@/widgets/tables/major-table";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/components/pagination";
import MajorModal from "@/widgets/modals/major-modal";
import ConfirmDialog from "@/widgets/dialogs/confirm-dialog";
import toast from "react-hot-toast";

export function MajorPage() {
    const [majors, setMajors] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedMajor, setSelectedMajor] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    // Confirm dialog state
    const [confirmDelete, setConfirmDelete] = useState({ open: false, major: null });

    const size = 5;

    const fetchMajors = async (currentPage, searchKeyword = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: size,
                ...(searchKeyword && { keyword: searchKeyword })
            });
            
            const res = await api.get(`/v2/majors?${params}`);
            if (res.data.Code === 1) {
                setMajors(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching majors:", error);
            toast.error("Lỗi khi tải danh sách ngành");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMajors(page, keyword);
    }, [page, keyword]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleSearch = (searchKeyword) => {
        setKeyword(searchKeyword);
        setPage(1); // Reset to first page when searching
    };

    const handleOpenModal = (major, mode = "view") => {
        setSelectedMajor(major || null);
        setModalMode(mode);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedMajor(null);
        if (refresh) fetchMajors(page, keyword);
    };

    // ==== Xử lý xoá major ====
    const handleDeleteMajor = (major) => {
        if (!major || (!major.id && !major._id)) return;
        setConfirmDelete({
            open: true,
            major,
        });
    };

    const handleConfirmDelete = async () => {
        const major = confirmDelete.major;
        if (!major || (!major.id && !major._id)) {
            setConfirmDelete({ open: false, major: null });
            return;
        }
        const id = major.id || major._id;
        try {
            const res = await api.delete(`/v2/majors/${id}`);
            if (res.data.Code === 1) {
                toast.success("Xoá ngành thành công!");
                // Nếu ngành bị xoá là ngành cuối cùng của trang, chuyển về trang trước
                if (majors.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchMajors(page, keyword);
                }
            } else {
                throw new Error(res.data.Message || "Xoá ngành thất bại");
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi khi xoá ngành!");
        }
        setConfirmDelete({ open: false, major: null });
    };

    const handleCancelDelete = () => {
        setConfirmDelete({ open: false, major: null });
    };

    // ==== Ráp API vào onSubmit của MajorModal ====
    const handleSubmitMajor = async (data) => {
        try {
            if (!selectedMajor) {
                // CREATE
                const res = await api.post("/v2/majors", data);
                if (res.data.Code === 1) {
                    toast.success("Tạo ngành thành công!");
                    handleCloseModal(true);
                } else {
                    throw new Error(res.data.Message || "Tạo ngành thất bại");
                }
            } else {
                // UPDATE
                const res = await api.put(`/v2/majors/${selectedMajor.id}`, data);
                if (res.data.Code === 1) {
                    toast.success("Cập nhật ngành thành công!");
                    handleCloseModal(true);
                } else {
                    throw new Error(res.data.Message || "Cập nhật ngành thất bại");
                }
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi xảy ra!");
            throw err;
        }
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card className="shadow-lg">
                {loading && <LoadingTable text="Đang tải" />}
                <MajorTable
                    majors={majors}
                    onOpenModal={handleOpenModal}
                    onCreate={() => setOpenModal(true)}
                    onDelete={handleDeleteMajor}
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

            <MajorModal
                open={openModal}
                onClose={handleCloseModal}
                onSubmit={handleSubmitMajor}
                majorId={selectedMajor?.id}
            />

            {/* Dialog confirm xóa */}
            <ConfirmDialog
                open={confirmDelete.open}
                title="Xác nhận xoá ngành học"
                content={
                    confirmDelete.major
                        ? <>Bạn có chắc chắn muốn xoá ngành "<b>{confirmDelete.major.name}</b>"?</>
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

export default MajorPage;