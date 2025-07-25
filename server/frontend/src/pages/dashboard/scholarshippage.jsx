import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import ScholarshipTable from "@/widgets/tables/scholarship-table";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/components/pagination";
import ScholarshipModal from "@/widgets/modals/scholarship-modal";
import ConfirmDialog from "@/widgets/dialogs/confirm-dialog";
import toast from "react-hot-toast";

export function ScholarshipPage() {
    const [scholarships, setScholarships] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedScholarship, setSelectedScholarship] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [confirmDelete, setConfirmDelete] = useState({ open: false, scholarship: null });
    const size = 5;

    const fetchScholarships = async (currentPage, searchKeyword = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                size: size,
                ...(searchKeyword && { keyword: searchKeyword })
            });
            
            const res = await api.get(`/v2/scholarships?${params}`);
            if (res.data.Code === 1) {
                setScholarships(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching scholarships:", error);
            toast.error("Lỗi khi tải danh sách học bổng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScholarships(page, keyword);
    }, [page, keyword]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleSearch = (searchKeyword) => {
        setKeyword(searchKeyword);
        setPage(1); // Reset to first page when searching
    };

    const handleOpenModal = (scholarship, mode = "view") => {
        setSelectedScholarship(scholarship || null);
        setModalMode(mode);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedScholarship(null);
        if (refresh) fetchScholarships(page, keyword);
    };

    const handleDeleteScholarship = (scholarship) => {
        setConfirmDelete({ open: true, scholarship });
    };

    const handleConfirmDelete = async () => {
        const scholarship = confirmDelete.scholarship;
        const id = scholarship.id || scholarship._id;
        try {
            const res = await api.delete(`/v2/scholarships/${id}`);
            if (res.data.Code === 1) {
                toast.success("Xóa học bổng thành công!");
                if (scholarships.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchScholarships(page, keyword);
                }
            } else {
                throw new Error(res.data.Message || "Xóa học bổng thất bại");
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi khi xóa học bổng!");
        }
        setConfirmDelete({ open: false, scholarship: null });
    };

    const handleCancelDelete = () => {
        setConfirmDelete({ open: false, scholarship: null });
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card className="shadow-lg">
                {loading && <LoadingTable text="Đang tải" />}
                <ScholarshipTable
                    scholarships={scholarships}
                    onOpenModal={(s) => handleOpenModal(s, "view")}
                    onCreate={() => handleOpenModal(null, "create")}
                    onDelete={handleDeleteScholarship}
                    page={page}
                    size={size}
                    keyword={keyword}
                    onSearch={handleSearch}
                />
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </Card>

            <ScholarshipModal
                open={openModal}
                onClose={handleCloseModal}
                scholarshipId={modalMode === "view" && selectedScholarship ? selectedScholarship.id : undefined}
                title={modalMode === "create" ? "Thêm mới học bổng" : selectedScholarship?.name || "Chi tiết học bổng"}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                title="Xác nhận xoá học bổng"
                content={confirmDelete.scholarship ?
                    <>Bạn có chắc chắn muốn xoá học bổng "<b>{confirmDelete.scholarship.name}</b>"?</> :
                    "Bạn có chắc chắn muốn xoá mục này?"}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                confirmText="Xoá"
                cancelText="Hủy"
                confirmColor="red"
            />
        </div>
    );
}

export default ScholarshipPage;
