import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Button,
} from "@material-tailwind/react";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

const DocumentTable = ({ documents, onOpenModal,onCreate, page = 1, size = 5 }) => (
    <>
        <CardHeader
            variant="gradient"
            color="gray"
            className="mb-8 p-6 relative z-20 flex justify-between items-center"
        >
            <Typography variant="h6" color="white">
                Tài liệu
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
                        {["#", "Tên", "Năm", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {documents.map(({ id, name, year_id }, key) => {
                        const className = `py-3 px-5 ${key === documents.length - 1 ? "" : "border-b border-blue-gray-50"}`;
                        const stt = (page - 1) * size + key + 1;
                        return (
                            <tr key={id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>{truncateWords(name, 50)}</td>
                                <td className={className}>{year_id}</td>
                                <td className={className}>
                                    <IconButton
                                        variant="text"
                                        color="black"
                                        onClick={() =>
                                            onOpenModal(
                                                { id, name, year_id },
                                                "view"
                                            )
                                        }
                                    >
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

export default DocumentTable;
