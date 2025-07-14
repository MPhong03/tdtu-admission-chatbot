import React, { useState } from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    Input,
    Button
} from "@material-tailwind/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const UserTable = ({ users, page = 1, size = 5, keyword = "", onSearch }) => {
    const [searchInput, setSearchInput] = useState(keyword);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        onSearch("");
    };

    return (
        <>
            <CardHeader variant="gradient" color="gray" className="mb-8 p-6 relative z-20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <Typography variant="h6" color="white">
                        Danh sách người dùng
                    </Typography>
                    <div className="w-full md:w-96">
                        <form onSubmit={handleSearchSubmit} className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    size="sm"
                                    placeholder="Tìm kiếm theo tên hoặc email..."
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
                                className="border-white/50 text-white hover:bg-white/10"
                            >
                                Tìm
                            </Button>
                            {keyword && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="text"
                                    onClick={handleClearSearch}
                                    className="text-white hover:bg-white/10"
                                >
                                    Xóa
                                </Button>
                            )}
                        </form>
                    </div>
                </div>
            </CardHeader>
            <CardBody className="px-0 pt-0 pb-2">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] table-auto">
                        <thead>
                            <tr className="bg-gray-50/50">
                                {["#", "Tên người dùng", "Email", "Ngày tham gia"].map((el) => (
                                    <th key={el} className="border-b border-blue-gray-100 py-4 px-6 text-left">
                                        <Typography variant="small" className="text-xs font-bold uppercase text-blue-gray-600 tracking-wider">
                                            {el}
                                        </Typography>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map(({ _id, username, email, createdAt }, key) => {
                                    const className = `py-4 px-6 transition-colors hover:bg-gray-50/50 ${key === users.length - 1 ? "" : "border-b border-blue-gray-50"
                                        }`;
                                    const stt = (page - 1) * size + key + 1;
                                    return (
                                        <tr key={_id} className="hover:bg-blue-50/30">
                                            <td className={className}>
                                                <Typography variant="small" className="font-medium text-blue-gray-600">
                                                    {stt}
                                                </Typography>
                                            </td>
                                            <td className={className}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                                        <Typography variant="small" className="text-white font-bold">
                                                            {username ? username.charAt(0).toUpperCase() : "?"}
                                                        </Typography>
                                                    </div>
                                                    <Typography variant="small" className="font-semibold text-blue-gray-800">
                                                        {username || "(unknown)"}
                                                    </Typography>
                                                </div>
                                            </td>
                                            <td className={className}>
                                                <Typography className="text-sm text-blue-gray-700 font-medium">
                                                    {email}
                                                </Typography>
                                            </td>
                                            <td className={className}>
                                                <Typography className="text-sm text-blue-gray-600">
                                                    {new Date(createdAt).toLocaleDateString("vi-VN")}
                                                </Typography>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-12 px-6 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <MagnifyingGlassIcon className="h-12 w-12 text-blue-gray-300" />
                                            <Typography variant="h6" className="text-blue-gray-400">
                                                {keyword ? "Không tìm thấy kết quả" : "Không có dữ liệu"}
                                            </Typography>
                                            <Typography variant="small" className="text-blue-gray-400">
                                                {keyword ? `Không có người dùng nào khớp với "${keyword}"` : "Danh sách người dùng trống"}
                                            </Typography>
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

export default UserTable;
