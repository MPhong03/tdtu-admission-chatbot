import React from "react";
import {
    CardHeader,
    CardBody,
    Typography,
    IconButton,
    Button,
} from "@material-tailwind/react";
import { EyeIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { truncateWords } from "@/utils/tools";

const fallbackImage = "/img/logo.jpg";

const MajorTable = ({ majors, onOpenModal, onCreate, onDelete, page = 1, size = 5 }) => (
    <>
        <CardHeader
            variant="gradient"
            color="gray"
            className="mb-8 p-6 relative z-20 flex justify-between items-center"
        >
            <Typography variant="h6" color="white">
                Ngành học
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
                        {["#", "Ảnh", "Tên", "Mô tả", "Action"].map((el) => (
                            <th key={el} className="border-b border-blue-gray-50 py-3 px-5 text-left">
                                <Typography variant="small" className="text-[11px] font-bold uppercase text-blue-gray-400">
                                    {el}
                                </Typography>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {majors.map(({ _id, name, description, images }, key) => {
                        const className = `py-3 px-5 ${key === majors.length - 1 ? "" : "border-b border-blue-gray-50"}`;
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
                            <tr key={_id}>
                                <td className={className}>{stt}</td>
                                <td className={className}>
                                    {firstImage ? (
                                        <img
                                            src={firstImage}
                                            alt={name}
                                            className="w-14 h-14 object-cover rounded"
                                            style={{ minWidth: 64, minHeight: 64, maxWidth: 64, maxHeight: 64 }}
                                            onError={e => {
                                                e.target.onerror = null;
                                                e.target.src = fallbackImage;
                                            }}
                                        />
                                    ) : (
                                        <span className="text-gray-400 italic">Không có ảnh</span>
                                    )}
                                </td>
                                <td className={className}>{truncateWords(name, 50)}</td>
                                <td className={className}>{truncateWords(description, 50)}</td>
                                <td className={className}>
                                    <div className="flex flex-row items-center gap-2">
                                        <IconButton
                                            variant="text"
                                            color="black"
                                            onClick={() => onOpenModal(majors[key])}
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </IconButton>
                                        <IconButton
                                            variant="text"
                                            color="red"
                                            onClick={() => onDelete && onDelete(majors[key])}
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

export default MajorTable;