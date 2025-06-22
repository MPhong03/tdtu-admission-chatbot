import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
} from "@material-tailwind/react";
import { EyeIcon } from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

const TuitionTable = ({ tuitions, onOpenModal, page = 1, size = 5 }) => (
    <>
        <CardHeader variant="gradient" color="gray" className="mb-8 p-6 relative z-20">
            <Typography variant="h6" color="white">
                Học phí
            </Typography>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
            <table className="w-full min-w-[640px] table-auto">
                <thead>
                    <tr>
                        {["#", "Tên", "Link", "Năm", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tuitions.map(({ _id, name, url, year_id }, key) => {
                        const className = `py-3 px-5 ${key === tuitions.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={_id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>{truncateWords(name, 50)}</td>
                                <td className={className}>{truncateWords(url, 50)}</td>
                                <td className={className}>{year_id}</td>
                                <td className={className}>
                                    <IconButton variant="text" color="black" onClick={() => onOpenModal(tuitions[key])}>
                                        <EyeIcon className="h-5 w-5" />
                                    </IconButton>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </CardBody>
    </>
);

export default TuitionTable;
