import React, { useEffect, useState, useRef } from "react";
import {
    Dialog, DialogHeader, DialogBody, DialogFooter,
    Tabs, TabsHeader, TabsBody, Tab, TabPanel,
    Input, Button, IconButton, Typography, Checkbox,
    Accordion, AccordionHeader, AccordionBody, Textarea,
    Spinner, Alert, Dialog as ConfirmDialog, Card, CardBody,
} from "@material-tailwind/react";
import { PlusIcon, TrashIcon, DocumentTextIcon, AcademicCapIcon, EyeIcon } from "@heroicons/react/24/outline";
import Select from "react-select";
import api from "@/configs/api";

// ===== DynamicFieldList =====
function DynamicFieldList({ fields, onChange, error }) {
    // Danh sách từ khóa hệ thống không được sử dụng
    const RESERVED_KEYWORDS = [
        "major_code", "name", "description", "years", "programmeId",
        "programme_id", "programmes", "id", "major_id", "tab",
        "createdAt", "updatedAt"
    ];

    const [keywordErrors, setKeywordErrors] = useState({});

    const validateKeyword = (key, index) => {
        if (!key) return null;

        const normalizedKey = key.toLowerCase().trim();

        // Kiểm tra từ khóa hệ thống
        if (RESERVED_KEYWORDS.includes(normalizedKey)) {
            return "Tên trường này là từ khóa hệ thống, vui lòng chọn tên khác";
        }

        // Kiểm tra trùng lặp trong cùng form
        const duplicateIndex = fields.findIndex((field, idx) =>
            idx !== index && field.key.toLowerCase().trim() === normalizedKey
        );
        if (duplicateIndex !== -1) {
            return "Tên trường đã tồn tại, vui lòng chọn tên khác";
        }

        // Kiểm tra ký tự đặc biệt (chỉ cho phép chữ cái, số, dấu gạch dưới)
        if (!/^[a-zA-Z0-9_\u00C0-\u1EF9\s]+$/.test(key)) {
            return "Tên trường chỉ được chứa chữ cái, số, dấu gạch dưới và khoảng trắng";
        }

        return null;
    };

    const handleFieldChange = (idx, key, value) => {
        const copy = [...fields];
        copy[idx][key] = value;
        onChange(copy);

        // Validate nếu đang sửa key
        if (key === "key") {
            const errorMsg = validateKeyword(value, idx);
            setKeywordErrors(prev => ({
                ...prev,
                [idx]: errorMsg
            }));
        }
    };

    const handleAdd = () => {
        onChange([...fields, { key: "", value: "" }]);
    };

    const handleDelete = (idx) => {
        if (fields.length === 1) return;
        onChange(fields.filter((_, i) => i !== idx));

        // Xóa lỗi của field bị xóa
        setKeywordErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[idx];
            // Cập nhật lại index cho các field phía sau
            Object.keys(newErrors).forEach(key => {
                const numKey = parseInt(key);
                if (numKey > idx) {
                    newErrors[numKey - 1] = newErrors[numKey];
                    delete newErrors[numKey];
                }
            });
            return newErrors;
        });
    };

    // Kiểm tra xem có lỗi nào không
    const hasErrors = Object.values(keywordErrors).some(error => error !== null);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded"></div>
                <Typography variant="small" color="blue-gray" className="font-semibold">
                    Thuộc tính mở rộng chương trình
                </Typography>
            </div>

            <div className="space-y-3">
                {fields.map((field, idx) => (
                    <Card key={idx} className={`shadow-sm border transition-all ${keywordErrors[idx] ? 'border-red-300 bg-red-50' : 'border-blue-gray-100'
                        }`}>
                        <CardBody className="p-4">
                            <div className="flex gap-3 items-start">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Input
                                            label="Tên trường"
                                            value={field.key}
                                            onChange={e => handleFieldChange(idx, "key", e.target.value)}
                                            error={error && !field.key || !!keywordErrors[idx]}
                                            crossOrigin=""
                                            className="bg-white"
                                        />
                                        {keywordErrors[idx] && (
                                            <Typography color="red" className="text-xs mt-1 flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                {keywordErrors[idx]}
                                            </Typography>
                                        )}
                                    </div>
                                    <Input
                                        label="Giá trị"
                                        value={field.value}
                                        onChange={e => handleFieldChange(idx, "value", e.target.value)}
                                        crossOrigin=""
                                        className="bg-white"
                                    />
                                </div>
                                <IconButton
                                    color="red"
                                    onClick={() => handleDelete(idx)}
                                    disabled={fields.length === 1}
                                    size="sm"
                                    variant="text"
                                    className="mt-2"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </IconButton>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <Button
                    variant="outlined"
                    size="sm"
                    color="blue"
                    className="flex items-center gap-2 hover:bg-blue-50"
                    onClick={handleAdd}
                    disabled={hasErrors}
                >
                    <PlusIcon className="h-4 w-4" /> Thêm trường mới
                </Button>

                {hasErrors && (
                    <Typography color="red" className="text-sm flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        Vui lòng sửa lỗi trước khi thêm trường mới
                    </Typography>
                )}
            </div>
        </div>
    );
}

function ProgrammeMultiSelect({ programmes, selectedProgrammes, setSelectedProgrammes, error }) {
    const options = programmes.map(p => ({
        value: p.id,
        label: p.name,
        ...p
    }));

    const value = selectedProgrammes.map(idObj =>
        options.find(opt => opt.value === idObj.id)
    ).filter(Boolean);

    const handleChange = (selectedOptions) => {
        setSelectedProgrammes(selectedOptions ? selectedOptions.map(opt => ({
            id: opt.value,
            name: opt.label,
            ...opt
        })) : []);
    };

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: '44px',
            border: error ? '1px solid #f44336' : '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1'
            }
        }),
        menu: (provided) => ({
            ...provided,
            zIndex: 9999,
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: '#e0f2fe',
            borderRadius: '6px'
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#0369a1',
            fontWeight: '500'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#0369a1',
            ':hover': {
                backgroundColor: '#bae6fd',
                color: '#0c4a6e'
            }
        })
    };

    return (
        <Card className="shadow-sm border border-blue-gray-100">
            <CardBody className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AcademicCapIcon className="h-5 w-5 text-blue-500" />
                    <Typography variant="h6" className="text-blue-gray-800">
                        Chọn chương trình đào tạo
                        <span className="text-red-500 ml-1">*</span>
                    </Typography>
                </div>
                <Select
                    isMulti
                    options={options}
                    value={value}
                    onChange={handleChange}
                    placeholder="Chọn chương trình đào tạo..."
                    closeMenuOnSelect={false}
                    menuPortalTarget={document.body}
                    classNamePrefix="react-select"
                    styles={customStyles}
                />
                {error && (
                    <Typography color="red" className="text-sm mt-2 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        Vui lòng chọn ít nhất một chương trình đào tạo
                    </Typography>
                )}
            </CardBody>
        </Card>
    );
}

function MajorProgrammeAccordion({
    selectedProgrammes,
    years,
    formState,
    setFormState,
    errorState,
    touchedState,
    setTouchedState,
}) {
    const [openId, setOpenId] = useState(null);

    const handleFieldChange = (id, key, value) => {
        setFormState(prev => ({
            ...prev,
            [id]: { ...prev[id], [key]: value }
        }));
    };
    const handleFieldsChange = (id, fields) => {
        setFormState(prev => ({
            ...prev,
            [id]: { ...prev[id], fields }
        }));
    };
    const handleYearsChange = (id, yearId) => {
        setFormState(prev => {
            const currentYears = prev[id]?.years || [];
            const newYears = currentYears.includes(yearId)
                ? currentYears.filter(y => y !== yearId)
                : [...currentYears, yearId];
            return {
                ...prev,
                [id]: { ...prev[id], years: newYears }
            };
        });
    };

    if (selectedProgrammes.length === 0) {
        return (
            <Card className="shadow-sm border border-blue-gray-100">
                <CardBody className="p-8 text-center">
                    <AcademicCapIcon className="h-12 w-12 text-blue-gray-300 mx-auto mb-4" />
                    <Typography variant="h6" color="blue-gray" className="mb-2">
                        Chưa có chương trình nào được chọn
                    </Typography>
                    <Typography color="blue-gray" className="text-sm">
                        Vui lòng chọn chương trình đào tạo ở trên để tiếp tục cấu hình
                    </Typography>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-green-500 rounded"></div>
                <Typography variant="h6" color="blue-gray" className="font-semibold">
                    Cấu hình chi tiết chương trình
                </Typography>
            </div>
            {selectedProgrammes.map(({ id, name }) => (
                <Card key={id} className={`shadow-sm border-2 transition-all duration-200 ${errorState[id] ? 'border-red-300 bg-red-50' : 'border-blue-gray-100 hover:border-blue-200'
                    }`}>
                    <Accordion open={openId === id}>
                        <AccordionHeader
                            onClick={() => setOpenId(openId === id ? null : id)}
                            className={`px-6 py-4 hover:bg-blue-gray-50 transition-colors ${openId === id ? "rounded-t-xl" : "rounded-xl"
                                }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${errorState[id] ? 'bg-red-500' : 'bg-blue-500'
                                        }`}></div>
                                    <Typography variant="h6" className="font-semibold">
                                        {name}
                                    </Typography>
                                </div>
                                <div className="flex items-center gap-2">
                                    {errorState[id] && (
                                        <Typography color="red" className="text-sm font-medium">
                                            Thiếu thông tin bắt buộc
                                        </Typography>
                                    )}
                                    <span className={`text-sm transition-transform duration-200 ${openId === id ? 'rotate-180' : ''
                                        }`}>
                                        ▼
                                    </span>
                                </div>
                            </div>
                        </AccordionHeader>
                        <AccordionBody className="bg-blue-gray-50 px-6 py-6 rounded-b-xl">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Mã ngành *"
                                        value={formState[id]?.major_code || ""}
                                        onChange={e => handleFieldChange(id, "major_code", e.target.value)}
                                        className="bg-white"
                                        error={errorState[id] && !formState[id]?.major_code && touchedState[id]}
                                        crossOrigin=""
                                        onBlur={() => setTouchedState(ts => ({ ...ts, [id]: true }))}
                                    />
                                    <Input
                                        label="Tên chương trình *"
                                        value={formState[id]?.name || ""}
                                        onChange={e => handleFieldChange(id, "name", e.target.value)}
                                        className="bg-white"
                                        error={errorState[id] && !formState[id]?.name && touchedState[id]}
                                        crossOrigin=""
                                        onBlur={() => setTouchedState(ts => ({ ...ts, [id]: true }))}
                                    />
                                </div>
                                <Textarea
                                    label="Mô tả chương trình"
                                    value={formState[id]?.description || ""}
                                    onChange={e => handleFieldChange(id, "description", e.target.value)}
                                    className="bg-white"
                                    rows={3}
                                />
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-purple-500 rounded"></div>
                                        <Typography variant="small" color="blue-gray" className="font-semibold">
                                            Các năm áp dụng
                                        </Typography>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {years.map(year => (
                                            <div key={year.id} className="flex items-center">
                                                <Checkbox
                                                    label={year.name}
                                                    checked={formState[id]?.years?.includes(year.id) || false}
                                                    onChange={() => handleYearsChange(id, year.id)}
                                                    crossOrigin=""
                                                    className="rounded-md"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <DynamicFieldList
                                    fields={formState[id]?.fields || [{ key: "", value: "" }]}
                                    onChange={fields => handleFieldsChange(id, fields)}
                                    error={errorState[id] && (formState[id]?.fields || []).some(f => !f.key) && touchedState[id]}
                                />
                            </div>
                        </AccordionBody>
                    </Accordion>
                </Card>
            ))}
        </div>
    );
}

export default function MajorModal({ open, onClose, onSubmit, majorId }) {
    // Tabs & Major info
    const [tab, setTab] = useState("info");
    const [name, setName] = useState("");
    const [reasons, setReasons] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState([""]);

    // Programmes & Years (API, không phân trang)
    const [programmes, setProgrammes] = useState([]);
    const [years, setYears] = useState([]);

    // Programme selections and MajorProgramme form state
    const [selectedProgrammes, setSelectedProgrammes] = useState([]);
    const [majorProgrammeFormState, setMajorProgrammeFormState] = useState({});
    const [loading, setLoading] = useState(false);

    // validation state
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState({});
    const [majorPrgError, setMajorPrgError] = useState({});
    const [programmeError, setProgrammeError] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Xử lý logic xóa majorProgramme khi update
    const [originalMajorProgrammeIds, setOriginalMajorProgrammeIds] = useState([]);
    const [deletedMajorProgrammeIds, setDeletedMajorProgrammeIds] = useState([]);

    // Confirm close dialog
    const [confirmClose, setConfirmClose] = useState(false);

    // useRef để lưu state gốc cho so sánh dirty
    const originalStateRef = useRef();

    // ===== LOAD DETAIL IF majorId PROVIDED =====
    useEffect(() => {
        if (!open) return;
        if (!majorId) return;

        setLoading(true);
        api.get(`/v2/majors/${majorId}`)
            .then(res => {
                const data = res.data?.Data;
                setName(data?.name || "");
                setDescription(data?.description || "");
                setReasons(data?.reasons || "");
                setImages(Array.isArray(data?.images) && data.images.length > 0
                    ? data.images
                    : [""]
                );
                setProgrammes(Array.isArray(data?.programmes) ? data.programmes : []);
                setYears(Array.isArray(data?.years) ? data.years : []);

                if (Array.isArray(data?.majorProgrammes)) {
                    const selected = data.majorProgrammes.map(mp => {
                        if (Array.isArray(mp.programmes) && mp.programmes[0]) {
                            return { id: mp.programmes[0].id, name: mp.programmes[0].name };
                        }
                        return { id: mp.programme_id, name: mp.tab || mp.name || mp.programme_id };
                    });
                    setSelectedProgrammes(selected);

                    // Lưu lại id ban đầu để xử lý xóa
                    setOriginalMajorProgrammeIds(data.majorProgrammes.map(mp => mp.id));

                    const nextState = {};
                    data.majorProgrammes.forEach(mp => {
                        const progId = Array.isArray(mp.programmes) && mp.programmes[0]
                            ? mp.programmes[0].id
                            : mp.programme_id;
                        const fields = Object.entries(mp)
                            .filter(([k]) =>
                                ![
                                    "major_code", "name", "description", "years", "programmeId", "programme_id",
                                    "programmes", "id", "major_id", "tab", "createdAt", "updatedAt",
                                ].includes(k)
                            )
                            .filter(([k, v]) => typeof v === "string" && v.trim() !== "")
                            .map(([key, value]) => ({ key, value }));

                        const yearsArr = Array.isArray(mp.years) ? mp.years.map(y => y.id) : [];
                        nextState[progId] = {
                            id: mp.id,
                            major_code: mp.major_code || "",
                            name: mp.name || "",
                            description: mp.description || "",
                            fields: fields.length > 0 ? fields : [{ key: "", value: "" }],
                            years: yearsArr,
                        };
                    });
                    setMajorProgrammeFormState(nextState);
                } else {
                    setSelectedProgrammes([]);
                    setMajorProgrammeFormState({});
                    setOriginalMajorProgrammeIds([]);
                }
            })
            .finally(() => setLoading(false));
    }, [open, majorId]);

    useEffect(() => {
        if (!open) return;
        api.get("/v2/programmes", { params: { page: 1, size: 99999 } })
            .then(res => {
                const items = res.data.Data.items || [];
                setProgrammes(items);
            });
    }, [open, majorId]);

    useEffect(() => {
        if (!open) return;
        api.get("/v2/years", { params: { page: 1, size: 99999 } })
            .then(res => {
                const items = res.data.Data.items || [];
                setYears(items);
            });
    }, [open, majorId]);

    // Đồng bộ MajorProgramme state khi chọn/deselect Programme
    useEffect(() => {
        setMajorProgrammeFormState(prev => {
            const next = { ...prev };
            for (const p of selectedProgrammes) {
                if (!next[p.id]) {
                    next[p.id] = {
                        major_code: "",
                        name: "",
                        description: "",
                        fields: [{ key: "", value: "" }],
                        years: [],
                    };
                }
            }
            Object.keys(next).forEach(id => {
                if (!selectedProgrammes.some(p => p.id === id)) delete next[id];
            });
            return next;
        });

        // Xử lý xóa majorProgramme (ghi nhận id bị xóa)
        if (majorId) {
            setDeletedMajorProgrammeIds(originalMajorProgrammeIds.filter(
                mpId => !selectedProgrammes.find(p =>
                    majorProgrammeFormState[p.id]?.id === mpId
                )
            ));
        }
        // eslint-disable-next-line
    }, [selectedProgrammes]);

    // Lưu lại state form ban đầu để detect dirty
    useEffect(() => {
        if (!open) return;
        originalStateRef.current = {
            name, reasons, description, images: [...images],
            selectedProgrammes: [...selectedProgrammes],
            majorProgrammeFormState: JSON.parse(JSON.stringify(majorProgrammeFormState))
        };
        setDirty(false);
    }, [open]);

    // Detect dirty form
    useEffect(() => {
        if (!open) return;
        if (!originalStateRef.current) return;
        const isDirty =
            name !== originalStateRef.current.name ||
            reasons !== originalStateRef.current.reasons ||
            description !== originalStateRef.current.description ||
            JSON.stringify(images) !== JSON.stringify(originalStateRef.current.images) ||
            JSON.stringify(selectedProgrammes) !== JSON.stringify(originalStateRef.current.selectedProgrammes) ||
            JSON.stringify(majorProgrammeFormState) !== JSON.stringify(originalStateRef.current.majorProgrammeFormState);
        setDirty(isDirty);
    }, [name, reasons, description, images, selectedProgrammes, majorProgrammeFormState, open]);

    // Clear trước khi đóng modal nếu không có ngành nào được chọn
    useEffect(() => {
        if (open && !majorId) {
            setName("");
            setDescription("");
            setReasons("");
            setImages([""]);
            setSelectedProgrammes([]);
            setMajorProgrammeFormState({});
            setOriginalMajorProgrammeIds([]);
            setDeletedMajorProgrammeIds([]);
            setTab("info");
            setSubmitError("");
            setSubmitSuccess("");
            setTouched({});
            setMajorPrgError({});
            setProgrammeError(false);
            setDirty(false);
        }
    }, [open, majorId]);

    // Ảnh
    const handleImageChange = (idx, value) => {
        const copy = [...images];
        copy[idx] = value;
        setImages(copy);
    };
    const handleAddImage = () => setImages([...images, ""]);
    const handleRemoveImage = (idx) =>
        setImages(images.length === 1 ? images : images.filter((_, i) => i !== idx));

    // ===== VALIDATION =====
    const validateForm = () => {
        let error = "";
        let hasError = false;
        let prgError = false;
        let majorProgrammeError = {};
        if (!name.trim()) {
            error = "Tên ngành không được để trống";
            hasError = true;
        }
        if (selectedProgrammes.length === 0) {
            prgError = true;
            error = "Vui lòng chọn ít nhất một chương trình đào tạo";
            hasError = true;
        }
        selectedProgrammes.forEach(p => {
            const mps = majorProgrammeFormState[p.id] || {};
            if (!mps.major_code || !mps.name) {
                majorProgrammeError[p.id] = true;
                hasError = true;
                error = "Vui lòng nhập mã ngành và tên chương trình cho tất cả các chương trình";
            }
        });
        setProgrammeError(prgError);
        setMajorPrgError(majorProgrammeError);
        setTouched(ts => {
            const t = { ...ts };
            selectedProgrammes.forEach(p => { t[p.id] = true; });
            return t;
        });
        setSubmitError(error);
        return !hasError;
    };

    // ===== Gửi dữ liệu =====
    const handleSubmit = async () => {
        setSubmitError("");
        setSubmitSuccess("");
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const major = {
                name,
                reasons,
                description,
                images: images.filter(img => img),
                ...(majorId && { id: majorId }),
            };
            const programmes = selectedProgrammes.map(p => ({ id: p.id }));
            const majorProgrammes = selectedProgrammes.map(p => ({
                ...(majorProgrammeFormState[p.id] || {}),
                programmeId: p.id,
                ...(majorProgrammeFormState[p.id]?.id && { id: majorProgrammeFormState[p.id].id }),
                fields: (majorProgrammeFormState[p.id]?.fields || []).filter(f => f.key),
            }));
            const data = {
                major,
                programmes,
                majorProgrammes,
                ...(majorId && deletedMajorProgrammeIds.length > 0 && { deletedMajorProgrammeIds }),
            };
            if (onSubmit) await onSubmit(data);
            setSubmitSuccess("Lưu thành công!");
            setDirty(false);
            setTimeout(() => {
                setSubmitSuccess("");
                onClose();
            }, 800);
        } catch (err) {
            setSubmitError("Có lỗi khi gửi dữ liệu. Vui lòng thử lại.");
        }
        setSubmitting(false);
    };

    const handleClearForm = () => {
        setName('');
        setReasons('');
        setDescription('');
        setImages(['']);
        setSelectedProgrammes([]);
        setMajorProgrammeFormState({});
        setSubmitError("");
        setSubmitSuccess("");
    };

    const handleClose = () => {
        if (dirty) {
            setConfirmClose(true);
        } else {
            onClose();
        }
    };
    const handleConfirmClose = () => {
        setConfirmClose(false);
        onClose();
    };

    // Lấy danh sách programme đã chọn (object) để truyền vào form
    const selectedProgrammesForAccordion = selectedProgrammes.map(
        p => programmes.find(prog => prog.id === p.id) || p
    ).filter(Boolean);

    const tabsConfig = [
        {
            value: "info",
            label: "Thông tin ngành",
            icon: <DocumentTextIcon className="h-4 w-4" />
        },
        {
            value: "programme",
            label: "Chương trình đào tạo",
            icon: <AcademicCapIcon className="h-4 w-4" />
        },
        {
            value: "preview",
            label: "Xem trước",
            icon: <EyeIcon className="h-4 w-4" />
        }
    ];

    return (
        <>
            <Dialog open={open} handler={handleClose} size="xxl" className="!h-screen !max-h-screen !w-screen">
                <DialogHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <AcademicCapIcon className="h-6 w-6" />
                        </div>
                        <Typography variant="h4" className="font-bold text-white">
                            {majorId ? "Chỉnh sửa ngành học" : "Tạo mới ngành học"}
                        </Typography>
                    </div>
                </DialogHeader>
                <DialogBody className="flex-1 flex flex-col min-h-0 p-0 bg-gray-50">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[300px]">
                            <div className="text-center">
                                <Spinner color="blue" className="w-8 h-8 mx-auto mb-4" />
                                <Typography color="blue-gray">Đang tải dữ liệu...</Typography>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={tab} className="flex-1 flex flex-col h-full min-h-0">
                            <TabsHeader className="px-8 pt-6 pb-4 bg-white shadow-sm border-b border-blue-gray-100">
                                {tabsConfig.map(({ value, label, icon }) => (
                                    <Tab
                                        key={value}
                                        value={value}
                                        onClick={() => setTab(value)}
                                        className={`transition-all whitespace-nowrap ${tab === value
                                            ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                                            : 'text-blue-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5">{icon}</span>
                                            <span>{label}</span>
                                        </div>
                                    </Tab>
                                ))}
                            </TabsHeader>
                            <TabsBody className="flex-1 flex flex-col h-full min-h-0">
                                <TabPanel value="info" className="flex-1 flex flex-col h-full min-h-0 p-0">
                                    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
                                        <Card className="shadow-sm border border-blue-gray-100">
                                            <CardBody className="p-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Input
                                                        label="Tên ngành *"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        crossOrigin=""
                                                        className="bg-white"
                                                        error={!!submitError && !name.trim()}
                                                    />
                                                    <Input
                                                        label="Lý do lựa chọn"
                                                        value={reasons}
                                                        onChange={(e) => setReasons(e.target.value)}
                                                        crossOrigin=""
                                                        className="bg-white"
                                                    />
                                                </div>
                                                <Textarea
                                                    label="Mô tả ngành học"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    rows={4}
                                                    className="bg-white"
                                                />
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-5 bg-blue-500 rounded"></div>
                                                        <Typography variant="small" color="blue-gray" className="font-semibold">
                                                            Hình ảnh minh họa (URL)
                                                        </Typography>
                                                    </div>
                                                    {images.map((img, idx) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <Input
                                                                label={`Ảnh ${idx + 1}`}
                                                                value={img}
                                                                onChange={(e) => handleImageChange(idx, e.target.value)}
                                                                crossOrigin=""
                                                                className="flex-1 bg-white"
                                                            />
                                                            <IconButton
                                                                color="red"
                                                                onClick={() => handleRemoveImage(idx)}
                                                                disabled={images.length === 1}
                                                                size="sm"
                                                                variant="text"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </IconButton>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outlined"
                                                        size="sm"
                                                        color="blue"
                                                        className="flex items-center gap-2 hover:bg-blue-50"
                                                        onClick={handleAddImage}
                                                    >
                                                        <PlusIcon className="h-4 w-4" /> Thêm ảnh
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </div>
                                </TabPanel>
                                <TabPanel value="programme" className="flex-1 flex flex-col h-full min-h-0 p-0">
                                    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
                                        <ProgrammeMultiSelect
                                            programmes={programmes}
                                            selectedProgrammes={selectedProgrammes}
                                            setSelectedProgrammes={setSelectedProgrammes}
                                            error={programmeError}
                                        />
                                        <MajorProgrammeAccordion
                                            selectedProgrammes={selectedProgrammesForAccordion}
                                            years={years}
                                            formState={majorProgrammeFormState}
                                            setFormState={setMajorProgrammeFormState}
                                            errorState={majorPrgError}
                                            touchedState={touched}
                                            setTouchedState={setTouched}
                                        />
                                    </div>
                                </TabPanel>
                                <TabPanel value="preview" className="flex-1 flex flex-col h-full min-h-0 p-0">
                                    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
                                        <Typography variant="h5" className="mb-4">Xem trước ngành học</Typography>
                                        <pre className="bg-white p-4 rounded-lg text-sm overflow-auto max-h-[60vh] border border-blue-gray-100">
                                            {JSON.stringify({
                                                name,
                                                reasons,
                                                description,
                                                images,
                                                selectedProgrammes,
                                                majorProgrammeFormState
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                </TabPanel>
                            </TabsBody>
                        </Tabs>
                    )}
                </DialogBody>
                <DialogFooter className="border-t border-blue-gray-100 px-8 py-4 bg-white">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="text"
                                color="blue-gray"
                                onClick={handleClearForm}
                                disabled={submitting || loading}
                            >
                                Xóa trắng
                            </Button>
                            <Button
                                variant="outlined"
                                color="red"
                                onClick={handleClose}
                                disabled={submitting || loading}
                            >
                                Hủy bỏ
                            </Button>
                        </div>
                        <div className="flex items-center gap-4">
                            {submitError && <Typography color="red" className="text-sm">{submitError}</Typography>}
                            {submitSuccess && <Typography color="green" className="text-sm">{submitSuccess}</Typography>}
                            <Button
                                color="blue"
                                onClick={handleSubmit}
                                loading={submitting}
                            >
                                {majorId ? "Lưu thay đổi" : "Tạo mới"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </Dialog>
            <ConfirmDialog open={confirmClose} handler={setConfirmClose} size="sm">
                <DialogHeader>Bạn có chắc muốn đóng?</DialogHeader>
                <DialogBody>
                    Các thay đổi bạn đã thực hiện sẽ không được lưu. Bạn có chắc muốn thoát?
                </DialogBody>
                <DialogFooter className="gap-2">
                    <Button variant="text" onClick={() => setConfirmClose(false)}>
                        Hủy
                    </Button>
                    <Button color="red" onClick={handleConfirmClose}>
                        Đồng ý thoát
                    </Button>
                </DialogFooter>
            </ConfirmDialog>
        </>
    );
}
