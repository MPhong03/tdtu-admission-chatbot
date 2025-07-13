import React from "react";
import {
    CardHeader,
    CardBody,
    Typography
} from "@material-tailwind/react";

const UserTable = ({ users, page = 1, size = 5 }) => (
    <>
        <CardHeader variant="gradient" color="gray" className="mb-8 p-6 relative z-20">
            <Typography variant="h6" color="white">
                Danh sách người dùng
            </Typography>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
            <table className="w-full min-w-[640px] table-auto">
                <thead>
                    <tr>
                        {["#", "Tên người dùng", "Email", "Ngày tham gia"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map(({ _id, username, email, createdAt }, key) => {
                        const className = `py-3 px-5 ${key === users.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={_id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>
                                    <Typography variant="small" className="font-semibold">
                                        {username || "(unknown)"}
                                    </Typography>
                                </td>
                                <td className={className}>
                                    <Typography className="text-sm text-blue-gray-700">{email}</Typography>
                                </td>
                                <td className={className}>
                                    <Typography className="text-sm text-blue-gray-700">
                                        {new Date(createdAt).toLocaleDateString()}
                                    </Typography>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </CardBody>
    </>
);

export default UserTable;
