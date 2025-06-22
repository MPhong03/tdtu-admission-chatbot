import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import DocumentTable from "@/widgets/tables/document/document-table";
// import QAModal from "@/widgets/modals/qa-modal";
import LoadingTable from "@/widgets/tables/components/loadingtable";
import Pagination from "@/widgets/tables/pagination";
import DocumentModal from "@/widgets/modals/document-modal";

export function DocumentPage() {
    const [documents, setDocuments] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [loading, setLoading] = useState(false);
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

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <DocumentTable
                    documents={documents}
                    onOpenModal={(doc) => handleOpenModal(doc, "view")}
                    onCreate={() => handleOpenModal(null, "create")}
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
        </div>
    );
}

export default DocumentPage;
