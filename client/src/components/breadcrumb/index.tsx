import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const BreadcrumbsTrail = () => {
  const navigate = useNavigate();
  return (
    <Breadcrumb
      className="text-lg !text-black"
      separator=">"
      items={[
        {
          title: (
            <HomeOutlined
              style={{ fontSize: 18 }}
              onClick={() => navigate("/home")}
            />
          ),
        },
        {
          title: "Example",
          href: "",
        },
      ]}
    />
  );
};

export default BreadcrumbsTrail;
