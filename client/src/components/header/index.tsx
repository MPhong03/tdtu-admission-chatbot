import { useSidebar } from "@/contexts/SidebarContext";
import { MenuOutlined } from "@ant-design/icons";
import BreadcrumbsTrail from "../breadcrumb";
import { SlideLeft } from "../animation";

const Header = () => {
  const { isOpen, toggle } = useSidebar();

  return (
    <header className="bg-white p-3 shadow overflow-hidden">
      <SlideLeft>
        <div className="h-7 flex items-center gap-8">
          {!isOpen ? (
            <div className="icon-hover" onClick={toggle}>
              <MenuOutlined style={{ fontSize: 18 }} />
            </div>
          ) : (
            <div></div>
          )}
          <BreadcrumbsTrail />
        </div>
      </SlideLeft>
    </header>
  );
};

export default Header;
