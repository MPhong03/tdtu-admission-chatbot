import React, { useState } from "react";
import { 
    CardHeader, 
    CardBody, 
    Typography, 
    IconButton, 
    Button, 
    Input,
    Chip,
    Tooltip
} from "@material-tailwind/react";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/solid";
import { 
    TrashIcon, 
    MagnifyingGlassIcon, 
    GiftIcon, 
    CalendarIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";
import { truncateWords } from "@/utils/tools";

const ScholarshipTable = ({ 
    scholarships, 
    onOpenModal, 
    onCreate, 
    onDelete, 
    page = 1, 
    size = 5, 
    keyword = "", 
    onSearch 
}) => {
    const [searchInput, setSearchInput] = useState(keyword);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        onSearch("");
    };

    const handleExternalLink = (url) => {
        if (url) {
            // Ensure URL has protocol
            const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
            window.open(formattedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <>
            <CardHeader variant="gradient" color="gray" className="mb-8 p-6 relative z-20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <GiftIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <Typography variant="h6" color="white" className="mb-1">
                                Học bổng
                            </Typography>
                            <Typography variant="small" color="white" className="opacity-80">
                                Quản lý thông tin học bổng và cơ hội tài trợ
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
                                        placeholder="Tìm kiếm học bổng..."
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
            </CardHeader>
            
            <CardBody className="px-0 pt-0 pb-2">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[768px] table-auto">
                        <thead>
                            <tr className="bg-gray-50/50">
                                {["#", "Thông tin học bổng", "Liên kết", "Năm học", "Thao tác"].map((el) => (
                                    <th key={el} className="border-b border-blue-gray-100 py-4 px-6 text-left">
                                        <Typography variant="small" className="text-xs font-bold uppercase text-blue-gray-600 tracking-wider">
                                            {el}
                                        </Typography>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {scholarships.length > 0 ? (
                                scholarships.map(({ _id, name, url, year_id }, key) => {
                                    const className = `py-4 px-6 transition-colors hover:bg-gray-50/50 ${
                                        key === scholarships.length - 1 ? "" : "border-b border-blue-gray-50"
                                    }`;
                                    const stt = (page - 1) * size + key + 1;
                                    return (
                                        <tr key={_id} className="hover:bg-blue-50/30">
                                            <td className={className}>
                                                <div className="flex items-center gap-3">
                                                    {stt}
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <Typography variant="small" className="font-semibold text-blue-gray-800 leading-tight">
                                                            {truncateWords(name, 45)}
                                                        </Typography>
                                                        <Typography variant="small" className="text-blue-gray-500 text-xs">
                                                            Tài liệu học bổng
                                                        </Typography>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-2">
                                                    {url ? (
                                                        <div className="flex items-center gap-2">
                                                            <Tooltip content="Mở liên kết trong tab mới">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outlined"
                                                                    color="blue"
                                                                    onClick={() => handleExternalLink(url)}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs"
                                                                >
                                                                    <LinkIcon className="h-3 w-3" />
                                                                    <span className="hidden sm:inline">
                                                                        {truncateWords(url.replace(/^https?:\/\//, ''), 20)}
                                                                    </span>
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    ) : (
                                                        <Chip
                                                            value="Chưa có link"
                                                            size="sm"
                                                            variant="ghost"
                                                            color="gray"
                                                            className="rounded-full"
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4 text-blue-gray-500" />
                                                    <Typography variant="small" className="text-blue-gray-700 font-medium">
                                                        {year_id || "N/A"}
                                                    </Typography>
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-2">
                                                    <IconButton
                                                        variant="text"
                                                        color="black"
                                                        onClick={() => onOpenModal(scholarships[key], "view")}
                                                        className="hover:bg-black-50"
                                                        size="sm"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        variant="text"
                                                        color="red"
                                                        onClick={() => onDelete && onDelete(scholarships[key])}
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
                                                <GiftIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <div>
                                                <Typography variant="h6" className="text-blue-gray-400 mb-1">
                                                    {keyword ? "Không tìm thấy kết quả" : "Chưa có học bổng nào"}
                                                </Typography>
                                                <Typography variant="small" className="text-blue-gray-400">
                                                    {keyword 
                                                        ? `Không có học bổng nào khớp với "${keyword}"` 
                                                        : "Hãy thêm thông tin học bổng đầu tiên"
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
                                                    Thêm học bổng mới
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
        </>
    );
};

export default ScholarshipTable;
