import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Button,
} from "@material-tailwind/react";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/solid";
import { TrashIcon } from "@heroicons/react/24/outline";
import { truncateWords } from "@/utils/tools";

const TuitionTable = ({ tuitions, onOpenModal, onCreate, onDelete, page = 1, size = 5 }) => (
    <>
        <CardHeader
            variant="gradient"
            color="gray"
            className="mb-8 p-6 relative z-20 flex justify-between items-center"
        >
            <Typography variant="h6" color="white">
                Học phí
            </Typography>
            <Button
                color="blue"
                onClick={onCreate}
                className="flex items-center gap-2"
                size="sm"
            >
                <PlusIcon className="h-5 w-5" />
                Thêm mới
            </Button>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
            <table className="w-full min-w-[640px] table-auto">
                <thead>
                    <tr>
                        {["#", "Tên", "Chương trình", "Năm", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tuitions.map(({ id, name, programme_id, year_id }, key) => {
                        const className = `py-3 px-5 ${key === tuitions.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>{truncateWords(name, 50)}</td>
                                <td className={className}>{programme_id}</td>
                                <td className={className}>{year_id}</td>
                                <td className={className}>
                                    <div className="flex flex-row items-center gap-2">
                                        <IconButton
                                            variant="text"
                                            color="black"
                                            onClick={() => onOpenModal(tuitions[key], "view")}
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </IconButton>
                                        <IconButton
                                            variant="text"
                                            color="red"
                                            onClick={() => onDelete && onDelete(tuitions[key])}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </IconButton>
                                    </div>
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
