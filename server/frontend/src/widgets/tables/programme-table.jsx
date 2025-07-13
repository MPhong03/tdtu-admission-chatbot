import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Button,
} from "@material-tailwind/react";
import { EyeIcon } from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const ProgrammeTable = ({ programmes, onOpenModal, onCreate, onDelete, page = 1, size = 5 }) => (
    <>
        <CardHeader
            variant="gradient"
            color="gray"
            className="mb-8 p-6 relative z-20 flex justify-between items-center"
        >
            <Typography variant="h6" color="white">
                Chương trình/hệ
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
                        {["#", "Tên", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {programmes.map(({ _id, name }, key) => {
                        const className = `py-3 px-5 ${key === programmes.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={_id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>{truncateWords(name, 50)}</td>
                                <td className={className}>
                                    <div className="flex flex-row items-center gap-2">
                                        <IconButton
                                            variant="text"
                                            color="black"
                                            onClick={() => onOpenModal(programmes[key])}
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </IconButton>
                                        <IconButton
                                            variant="text"
                                            color="red"
                                            onClick={() => onDelete && onDelete(programmes[key])}
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

export default ProgrammeTable;
