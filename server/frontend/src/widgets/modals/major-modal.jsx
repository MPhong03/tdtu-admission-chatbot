import React, { useEffect, useState, useRef } from "react";
import {
    Dialog, DialogHeader, DialogBody, DialogFooter,
    Tabs, TabsHeader, TabsBody, Tab, TabPanel,
    Input, Button, IconButton, Typography, Checkbox,
    Accordion, AccordionHeader, AccordionBody, Textarea,
    Spinner, Alert, Dialog as ConfirmDialog,
} from "@material-tailwind/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Select from "react-select";
import api from "@/configs/api";

// ===== DynamicFieldList =====
function DynamicFieldList({ fields, onChange, error }) {
    const handleFieldChange = (idx, key, value) => {
        const copy = [...fields];
        copy[idx][key] = value;
        onChange(copy);
    };
    const handleAdd = () => onChange([...fields, { key: "", value: "" }]);
    const handleDelete = (idx) => {
        if (fields.length === 1) return;
        onChange(fields.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-2">
            <Typography variant="small" color="blue-gray" className="font-medium">
                Thuộc tính mở rộng chương trình (Học phí, Thời gian đào tạo, ...)
            </Typography>
            {fields.map((field, idx) => (
                <div className="flex gap-2 items-end" key={idx}>
                    <Input
                        label="Tên trường"
                        value={field.key}
                        onChange={e => handleFieldChange(idx, "key", e.target.value)}
                        className="flex-1"
                        error={error && !field.key}
                        crossOrigin=""
                    />
                    <Input
                        label="Giá trị"
                        value={field.value}
                        onChange={e => handleFieldChange(idx, "value", e.target.value)}
                        className="flex-1"
                        crossOrigin=""
                    />
                    <IconButton
                        color="red"
                        onClick={() => handleDelete(idx)}
                        disabled={fields.length === 1}
                        size="md"
                        className="mb-1"
                        variant="text"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </IconButton>
                </div>
            ))}
            <Button
                variant="outlined"
                size="sm"
                color="blue"
                className="flex items-center gap-1"
                onClick={handleAdd}
            >
                <PlusIcon className="h-5 w-5" /> Thêm trường mới
            </Button>
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

    return (
        <div className="mb-5">
            <Typography variant="h6" className="mb-2">Chọn chương trình đào tạo <span className="text-red-500">*</span></Typography>
            <Select
                isMulti
                options={options}
                value={value}
                onChange={handleChange}
                placeholder="Chọn chương trình..."
                closeMenuOnSelect={false}
                menuPortalTarget={document.body}
                classNamePrefix="react-select"
                styles={{
                    menu: provided => ({ ...provided, zIndex: 9999 }),
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: base => error ? { ...base, borderColor: "#f44336" } : base,
                }}
            />
            {error && <Typography color="red" className="text-xs mt-1">Vui lòng chọn ít nhất một chương trình đào tạo</Typography>}
        </div>
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

    return (
        <div className="flex flex-col gap-3 mt-3">
            {selectedProgrammes.map(({ id, name }) => (
                <Accordion key={id} open={openId === id}
                    icon={<span className="ml-2 text-xs text-gray-400">{openId === id ? "▲" : "▼"}</span>}
                    className={`rounded-lg border ${errorState[id] ? "border-red-400" : "border-blue-gray-100"}`}
                >
                    <AccordionHeader onClick={() => setOpenId(openId === id ? null : id)} className="font-medium px-4 py-3">
                        <span>{name}</span>
                        {errorState[id] && <span className="ml-2 text-red-500 text-xs">Thiếu thông tin *</span>}
                    </AccordionHeader>
                    <AccordionBody className="bg-blue-gray-50 rounded-b-lg px-4 py-3">
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
                            <div className="md:col-span-2">
                                <Input
                                    label="Mô tả"
                                    value={formState[id]?.description || ""}
                                    onChange={e => handleFieldChange(id, "description", e.target.value)}
                                    className="bg-white"
                                    crossOrigin=""
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Typography variant="small" color="blue-gray" className="font-medium mb-1">
                                    Các năm áp dụng
                                </Typography>
                                <div className="flex flex-wrap gap-4">
                                    {years.map(year => (
                                        <Checkbox
                                            key={year.id}
                                            label={year.name}
                                            checked={formState[id]?.years?.includes(year.id) || false}
                                            onChange={() => handleYearsChange(id, year.id)}
                                            crossOrigin=""
                                            className="py-1"
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <DynamicFieldList
                                    fields={formState[id]?.fields || [{ key: "", value: "" }]}
                                    onChange={fields => handleFieldsChange(id, fields)}
                                    error={errorState[id] && (formState[id]?.fields || []).some(f => !f.key) && touchedState[id]}
                                />
                            </div>
                        </div>
                    </AccordionBody>
                </Accordion>
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
                                    "major_code", "name", "description", "years", "programmeId",
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
        // if (majorId) return;
        api.get("/v2/programmes", { params: { page: 1, size: 99999 } })
            .then(res => {
                const items = res.data.Data.items || [];
                setProgrammes(items);
            });
    }, [open, majorId]);

    useEffect(() => {
        if (!open) return;
        // if (majorId) return;
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
        // clone lại state
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

    // Clear trước khi đóng modal nếu không có ngnahf nào được chọn
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

    return (
        <>
            <Dialog open={open} handler={handleClose} size="xxl" className="!h-screen !max-h-screen !w-screen">
                <DialogHeader className="border-b border-blue-gray-100 px-8 py-5">
                    <Typography variant="h5" color="blue-gray">
                        {majorId ? "Chỉnh sửa ngành học" : "Tạo mới ngành học"}
                    </Typography>
                </DialogHeader>
                <DialogBody className="flex-1 flex flex-col min-h-0 p-0">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[300px]">
                            <Spinner color="blue" className="w-8 h-8" />
                        </div>
                    ) : (
                        <Tabs value={tab} className="flex-1 flex flex-col h-full min-h-0">
                            <TabsHeader className="px-8 pt-4 pb-2 bg-white shadow-none">
                                <Tab value="info" onClick={() => setTab("info")} className="text-base px-4 py-2">Thông tin ngành</Tab>
                                <Tab value="programme" onClick={() => setTab("programme")} className="text-base px-4 py-2">Chương trình đào tạo</Tab>
                                <Tab value="preview" onClick={() => setTab("preview")} className="text-base px-4 py-2">Preview</Tab>
                            </TabsHeader>
                            <TabsBody className="flex-1 flex flex-col h-full min-h-0">
                                <TabPanel value="info" className="flex-1 flex flex-col h-full min-h-0 p-0">
                                    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <Input label="Tên ngành *" value={name} onChange={e => setName(e.target.value)} crossOrigin="" error={!!submitError && !name} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Textarea
                                                    label="Lý do chọn ngành"
                                                    value={reasons}
                                                    onChange={e => setReasons(e.target.value)}
                                                    rows={3}
                                                    className="py-2"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Textarea
                                                    label="Mô tả"
                                                    value={description}
                                                    onChange={e => setDescription(e.target.value)}
                                                    rows={3}
                                                    className="py-2"
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex flex-col gap-1">
                                                <Typography variant="small" color="blue-gray" className="font-medium">
                                                    Hình ảnh (URL)
                                                </Typography>
                                                <div className="flex flex-col gap-2">
                                                    {images.map((img, idx) => (
                                                        <div className="flex gap-2 items-end" key={idx}>
                                                            <Input
                                                                value={img}
                                                                onChange={e => handleImageChange(idx, e.target.value)}
                                                                placeholder="Dán URL ảnh"
                                                                crossOrigin=""
                                                                className="flex-1"
                                                            />
                                                            <IconButton
                                                                color="red"
                                                                onClick={() => handleRemoveImage(idx)}
                                                                disabled={images.length === 1}
                                                                size="md"
                                                                variant="text"
                                                            >
                                                                <TrashIcon className="h-5 w-5" />
                                                            </IconButton>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button
                                                    variant="outlined"
                                                    size="sm"
                                                    color="blue"
                                                    className="flex items-center gap-1 mt-1 w-fit"
                                                    onClick={handleAddImage}
                                                >
                                                    <PlusIcon className="h-5 w-5" /> Thêm ảnh
                                                </Button>
                                            </div>
                                        </div>
                                        {submitError && <Alert color="red" className="mt-4">{submitError}</Alert>}
                                        {submitSuccess && <Alert color="green" className="mt-4">{submitSuccess}</Alert>}
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
                                        <Typography variant="h6" className="mb-2">Preview dữ liệu</Typography>
                                        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                                            {JSON.stringify(
                                                {
                                                    major: {
                                                        name,
                                                        reasons,
                                                        description,
                                                        images: images.filter(img => img),
                                                        ...(majorId && { id: majorId }),
                                                    },
                                                    programmes: selectedProgrammes.map(p => ({ id: p.id })),
                                                    majorProgrammes: selectedProgrammes.map(p => ({
                                                        ...(majorProgrammeFormState[p.id] || {}),
                                                        programmeId: p.id,
                                                        ...(majorProgrammeFormState[p.id]?.id && { id: majorProgrammeFormState[p.id].id }),
                                                        fields: (majorProgrammeFormState[p.id]?.fields || []).filter(f => f.key),
                                                    })),
                                                    ...(majorId && deletedMajorProgrammeIds.length > 0 && { deletedMajorProgrammeIds }),
                                                },
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                </TabPanel>
                            </TabsBody>
                        </Tabs>
                    )}
                </DialogBody>
                <DialogFooter className="border-t border-blue-gray-100 px-8 py-4 flex justify-end gap-3">
                    <Button variant="text" color="gray" onClick={handleClose}>
                        Hủy
                    </Button>
                    {!majorId && (
                        <Button variant="outlined" color="red" onClick={handleClearForm}>
                            Làm mới
                        </Button>
                    )}
                    <Button color="blue" variant="filled" onClick={handleSubmit} loading={submitting}>
                        {submitting ? "Đang lưu..." : "Lưu"}
                    </Button>
                </DialogFooter>
            </Dialog>
            <ConfirmDialog open={confirmClose} handler={() => setConfirmClose(false)}>
                <DialogHeader>Xác nhận</DialogHeader>
                <DialogBody>
                    <Typography>Bạn có chắc chắn muốn đóng khi form đã thay đổi? Thao tác chưa lưu sẽ bị mất.</Typography>
                </DialogBody>
                <DialogFooter>
                    <Button variant="text" color="gray" onClick={() => setConfirmClose(false)}>
                        Hủy
                    </Button>
                    <Button color="red" onClick={handleConfirmClose}>
                        Đồng ý đóng
                    </Button>
                </DialogFooter>
            </ConfirmDialog>
        </>
    );
}