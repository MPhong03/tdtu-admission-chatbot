import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

const BreadcrumbsTrail = () => {
  const navigate = useNavigate();
  const { title } = useBreadcrumb();

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
          title : title || "...",
        },
      ]}
    />
  );
};

export default BreadcrumbsTrail;
