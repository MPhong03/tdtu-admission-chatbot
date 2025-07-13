import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import DocumentTable from "@/widgets/tables/document-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/components/pagination";
import DocumentModal from "@/widgets/modals/document-modal";
import ConfirmDialog from "@/widgets/dialogs/confirm-dialog";
import toast from "react-hot-toast";

export function DocumentPage() {
    const [documents, setDocuments] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false);

    // Confirm dialog state
    const [confirmDelete, setConfirmDelete] = useState({ open: false, document: null });

    const size = 5;

    const fetchDocuments = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/v2/documents?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setDocuments(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching Q&A document:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleOpenModal = (document, mode = "view") => {
        setSelectedDocument(document || null);
        setModalMode(mode);
        setOpenModal(true);
    };

    const handleCloseModal = (refresh = false) => {
        setOpenModal(false);
        setSelectedDocument(null);
        if (refresh) fetchDocuments(page);
    };

    // ==== Xử lý xoá document ====
    const handleDeleteDocument = (document) => {
        if (!document || (!document.id && !document._id)) return;
        setConfirmDelete({
            open: true,
            document,
        });
    };

    const handleConfirmDelete = async () => {
        const document = confirmDelete.document;
        if (!document || (!document.id && !document._id)) {
            setConfirmDelete({ open: false, document: null });
            return;
        }
        const id = document.id || document._id;
        try {
            const res = await api.delete(`/v2/documents/${id}`);
            if (res.data.Code === 1) {
                toast.success("Xoá tài liệu thành công!");
                // Nếu tài liệu bị xoá là tài liệu cuối cùng của trang, chuyển về trang trước
                if (documents.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchDocuments(page);
                }
            } else {
                throw new Error(res.data.Message || "Xoá tài liệu thất bại");
            }
        } catch (err) {
            toast.error(err.message || "Có lỗi khi xoá tài liệu!");
        }
        setConfirmDelete({ open: false, document: null });
    };

    const handleCancelDelete = () => {
        setConfirmDelete({ open: false, document: null });
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <DocumentTable
                    documents={documents}
                    onOpenModal={(doc) => handleOpenModal(doc, "view")}
                    onCreate={() => handleOpenModal(null, "create")}
                    onDelete={handleDeleteDocument}
                    page={page}
                    size={size}
                />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>

            <DocumentModal
                open={openModal}
                onClose={handleCloseModal}
                documentId={modalMode === "view" && selectedDocument ? selectedDocument?.id : undefined}
                title={modalMode === "create" ? "Thêm mới tài liệu" : selectedDocument?.name || "Chi tiết tài liệu"}
            />

            {/* Dialog confirm xóa */}
            <ConfirmDialog
                open={confirmDelete.open}
                title="Xác nhận xoá chương trình/hệ"
                content={
                    confirmDelete.document
                        ? <>Bạn có chắc chắn muốn xoá chương trình/hệ "<b>{confirmDelete.document.name}</b>"?</>
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

export default DocumentPage;
