import React, { useState } from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Button,
    Input,
    Chip,
} from "@material-tailwind/react";
import {
    EyeIcon,
    PlusIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon
} from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";
import api from "@/configs/api";
import toast from "react-hot-toast";
import ImportMajorModal from "@/widgets/modals/import-major-modal";

const fallbackImage = "/img/logo.jpg";

const MajorTable = ({
    majors,
    onOpenModal,
    onCreate,
    onDelete,
    onRefresh,
    page = 1,
    size = 5,
    keyword = "",
    onSearch
}) => {
    const [searchInput, setSearchInput] = useState(keyword);
    const [exportLoading, setExportLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false); // State cho modal import

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        onSearch("");
    };

    // Xử lý Export
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const response = await api.get('/v2/excels/export/major-programmes', {
                responseType: 'blob'
            });

            // Lấy tên file từ Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'major-programmes.xlsx';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            // Tạo URL blob và download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Xuất file thành công!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Lỗi khi xuất file!");
        } finally {
            setExportLoading(false);
        }
    };

    // Xử lý Import - Mở modal
    const handleImport = () => {
        setImportModalOpen(true);
    };

    // Xử lý khi import thành công
    const handleImportSuccess = () => {
        if (onRefresh) {
            onRefresh(); // Refresh data sau khi import thành công
        }
        toast.success("Import dữ liệu thành công!");
    };

    return (
        <>
            <CardHeader variant="gradient" color="gray" className="mb-8 p-6 relative z-20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <BookOpenIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <Typography variant="h6" color="white" className="mb-1">
                                Ngành học
                            </Typography>
                            <Typography variant="small" color="white" className="opacity-80">
                                Quản lý danh sách ngành đào tạo
                            </Typography>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        {/* Search Form */}
                        <div className="w-full sm:w-80">
                            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        size="sm"
                                        placeholder="Tìm kiếm ngành học..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="!border-white/20 bg-white/10 text-white placeholder:text-white/70 focus:!border-white/50"
                                        labelProps={{
                                            className: "hidden",
                                        }}
                                        containerProps={{
                                            className: "min-w-0",
                                        }}
                                    />
                                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-4 w-4 text-white/70" />
                                </div>
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outlined"
                                    className="border-white/50 text-white hover:bg-white/10 whitespace-nowrap"
                                >
                                    Tìm
                                </Button>
                                {keyword && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="text"
                                        onClick={handleClearSearch}
                                        className="text-white hover:bg-white/10 whitespace-nowrap"
                                    >
                                        Xóa
                                    </Button>
                                )}
                            </form>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {/* Import Button */}
                            <Button
                                size="sm"
                                variant="outlined"
                                onClick={handleImport}
                                className="border-white/50 text-white hover:bg-white/10 whitespace-nowrap min-w-[90px] flex items-center justify-center gap-2"
                            >
                                <ArrowUpTrayIcon className="h-4 w-4" />
                                Import
                            </Button>

                            {/* Export Button */}
                            <Button
                                size="sm"
                                variant="outlined"
                                onClick={handleExport}
                                disabled={exportLoading}
                                className="border-white/50 text-white hover:bg-white/10 whitespace-nowrap min-w-[90px] flex items-center justify-center gap-2"
                            >
                                {exportLoading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                        <span>Đang xuất...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        Export
                                    </>
                                )}
                            </Button>

                            {/* Add New Button */}
                            <Button
                                color="white"
                                onClick={onCreate}
                                className="flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-50 whitespace-nowrap"
                                size="sm"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Thêm mới
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardBody className="px-0 pt-0 pb-2">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[768px] table-auto">
                        <thead>
                            <tr className="bg-gray-50/50">
                                {["#", "Hình ảnh", "Thông tin ngành", "Mô tả", "Thao tác"].map((el) => (
                                    <th key={el} className="border-b border-blue-gray-100 py-4 px-6 text-left">
                                        <Typography variant="small" className="text-xs font-bold uppercase text-blue-gray-600 tracking-wider">
                                            {el}
                                        </Typography>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {majors.length > 0 ? (
                                majors.map(({ _id, name, description, images }, key) => {
                                    const className = `py-4 px-6 transition-colors hover:bg-gray-50/50 ${key === majors.length - 1 ? "" : "border-b border-blue-gray-50"
                                        }`;
                                    const stt = (page - 1) * size + key + 1;

                                    let imgArr = [];
                                    if (typeof images === "string") {
                                        try {
                                            imgArr = JSON.parse(images);
                                        } catch {
                                            imgArr = [];
                                        }
                                    } else if (Array.isArray(images)) {
                                        imgArr = images;
                                    }
                                    const firstImage = imgArr.length > 0 ? imgArr[0] : null;

                                    return (
                                        <tr key={_id} className="hover:bg-blue-50/30">
                                            <td className={className}>
                                                <div className="flex items-center gap-3">
                                                    {stt}
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center justify-center">
                                                    {firstImage ? (
                                                        <div className="relative group">
                                                            <img
                                                                src={firstImage}
                                                                alt={name}
                                                                className="w-16 h-16 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                                                                onError={e => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = fallbackImage;
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <BookOpenIcon className="h-8 w-8 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <Typography variant="small" className="font-semibold text-blue-gray-800 leading-tight">
                                                            {truncateWords(name, 40)}
                                                        </Typography>
                                                        <Typography variant="small" className="text-blue-gray-500 text-xs">
                                                            Ngành đào tạo
                                                        </Typography>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="max-w-xs">
                                                    <Typography className="text-sm text-blue-gray-700 leading-relaxed">
                                                        {description ? truncateWords(description, 20) : (
                                                            <span className="text-gray-400 italic">Chưa có mô tả</span>
                                                        )}
                                                    </Typography>
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-2">
                                                    <IconButton
                                                        variant="text"
                                                        color="black"
                                                        onClick={() => onOpenModal(majors[key])}
                                                        className="hover:bg-black-50"
                                                        size="sm"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        variant="text"
                                                        color="red"
                                                        onClick={() => onDelete && onDelete(majors[key])}
                                                        className="hover:bg-red-50"
                                                        size="sm"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-16 px-6 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                <BookOpenIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <div>
                                                <Typography variant="h6" className="text-blue-gray-400 mb-1">
                                                    {keyword ? "Không tìm thấy kết quả" : "Chưa có ngành học nào"}
                                                </Typography>
                                                <Typography variant="small" className="text-blue-gray-400">
                                                    {keyword
                                                        ? `Không có ngành học nào khớp với "${keyword}"`
                                                        : "Hãy thêm ngành học đầu tiên"
                                                    }
                                                </Typography>
                                            </div>
                                            {!keyword && (
                                                <Button
                                                    color="blue"
                                                    onClick={onCreate}
                                                    className="flex items-center gap-2 mt-2"
                                                    size="sm"
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                    Thêm ngành mới
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardBody>

            {/* Import Modal */}
            <ImportMajorModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={handleImportSuccess}
            />
        </>
    );
};

export default MajorTable;