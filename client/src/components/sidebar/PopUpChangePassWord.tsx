import { Modal, Form, Input, Button } from "antd";
import { LockOutlined } from "@ant-design/icons";
import {
  forwardRef,
  useImperativeHandle,
  useState,
  ForwardRefRenderFunction,
} from "react";
import { authApi } from "@/api/auth.api";
import toast from "react-hot-toast";

export interface PopUpChangePasswordRef {
  open: () => void;
}

const PopUpChangePassword: ForwardRefRenderFunction<PopUpChangePasswordRef> = (
  _,
  ref
) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
      setVisible(true);
    },
  }));

  const handleSubmit = async (values: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const { oldPassword, newPassword, confirmPassword } = values;

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp!");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword(oldPassword, newPassword);
      if (res.Code === 1) {
        toast.success("Đổi mật khẩu thành công!");
        setVisible(false);
      } else {
        toast.error(res.Message || "Đổi mật khẩu thất bại.");
      }
    } catch (err) {
      toast.error("Lỗi hệ thống hoặc kết nối.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      centered
      open={visible}
      onCancel={() => setVisible(false)}
      footer={null}
      confirmLoading={loading}
      title="Đổi mật khẩu"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="oldPassword"
          label="Mật khẩu hiện tại"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu hiện tại!" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Mật khẩu hiện tại"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu mới!" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Mật khẩu mới"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu mới"
          />
        </Form.Item>

        <Form.Item className="text-right">
          <Button htmlType="submit" type="primary" loading={loading}>
            Xác nhận
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default forwardRef(PopUpChangePassword);
