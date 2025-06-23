import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { saveToken, isAuthenticated } from "@/utils/auth";
import { PopSpring } from "@/components/animation";
import Logo from "@/assets/images/logo.png";
import PaperPlane from "@/components/loading/PaperPlane";
import { Form, Input, Button, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { getVisitorId } from "@/utils/auth";

const { Title } = Typography;

const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/home");
    }
  }, [navigate]);

  const [form] = Form.useForm();

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLoading(true);
    try {
      const visitorId = getVisitorId();
      const res = await authApi.login(email, password, visitorId || "");
      saveToken(res.token);
      toast.success("Đăng nhập thành công!");
      navigate("/home");
    } catch (err) {
      toast.error("Đăng nhập thất bại, vui lòng kiểm tra thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <PaperPlane fullScreen />
      ) : (
        <PopSpring>
          <div className="py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-sky-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
              <div className="relative bg-white shadow-lg rounded-2xl p-6 sm:rounded-3xl sm:p-20">
                <div className="flex justify-center items-center gap-3 mb-6">
                  <img src={Logo} alt="Logo" className="w-16 sm:w-20" />
                  <Title
                    level={3}
                    className="!text-main-red uppercase text-xl sm:text-3xl"
                  >
                    Tuyển sinh
                  </Title>
                </div>
                <Title level={3} className="text-center text-lg sm:text-2xl">
                  Đăng nhập
                </Title>
                <Form
                  form={form}
                  name="login"
                  layout="vertical"
                  onFinish={handleSubmit}
                  onFinishFailed={() =>
                    toast.error("Vui lòng điền đầy đủ thông tin")
                  }
                >
                  <Title level={5} className="text-base sm:text-lg">
                    Email <span className="text-red-500">*</span>
                  </Title>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email!" },
                      { type: "email", message: "Email không hợp lệ!" },
                    ]}
                    className="mb-4 sm:mb-6"
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Nhập email"
                      size="large"
                    />
                  </Form.Item>

                  <Title level={5} className="text-base sm:text-lg">
                    Mật khẩu <span className="text-red-500">*</span>
                  </Title>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                    className="mb-6"
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Nhập mật khẩu"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item className="w-full flex justify-center">
                    <Button
                      htmlType="submit"
                      className="w-full sm:w-auto !bg-main-blue hover:!bg-main-red !text-white border-none rounded-lg px-6 sm:px-10 py-3 sm:py-5 font-bold text-sm sm:text-base"
                    >
                      Đăng nhập
                    </Button>
                  </Form.Item>
                </Form>
                <div className="text-center">
                  Bạn chưa có tài khoản?{" "}
                  <Link to="/register" className="text-main-blue underline">
                    Đăng ký ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </PopSpring>
      )}
    </>
  );
};

export default AuthPage;
