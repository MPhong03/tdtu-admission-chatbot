import React from "react";
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Typography,
} from "@material-tailwind/react";

const ConfirmDialog = ({
    open,
    title = "Xác nhận",
    content = "Bạn có chắc chắn muốn thực hiện thao tác này?",
    onConfirm,
    onCancel,
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    confirmColor = "red",
}) => (
    <Dialog open={open} handler={onCancel}>
        <DialogHeader>
            <Typography variant="h6">{title}</Typography>
        </DialogHeader>
        <DialogBody>
            <Typography>{content}</Typography>
        </DialogBody>
        <DialogFooter>
            <Button variant="text" color="gray" onClick={onCancel}>
                {cancelText}
            </Button>
            <Button color={confirmColor} onClick={onConfirm}>
                {confirmText}
            </Button>
        </DialogFooter>
    </Dialog>
);

export default ConfirmDialog;