import { useLocation, Link } from "react-router-dom";
import {
  Navbar,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Input,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Avatar,
} from "@material-tailwind/react";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  Bars3Icon,
} from "@heroicons/react/24/solid";
import {
  useMaterialTailwindController,
  setOpenConfigurator,
  setOpenSidenav,
} from "@/context";
import avatarDefault from "/img/github.svg";
import { useEffect, useState } from "react";
import { getProfile, removeProfile, removeToken } from "@/utils/session";

export function DashboardNavbar() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { fixedNavbar, openSidenav } = controller;
  const { pathname } = useLocation();
  const [layout, page] = pathname.split("/").filter((el) => el !== "");
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const stored = getProfile();
    if (stored) {
      setAdmin(JSON.parse(stored));
    }
  }, []);

  return (
    <Navbar
      color={fixedNavbar ? "white" : "transparent"}
      className={`rounded-xl transition-all ${fixedNavbar
          ? "sticky top-4 z-40 py-3 shadow-md shadow-blue-gray-500/5 border border-blue-gray-100"
          : "px-0 py-1"
        }`}
      fullWidth
      blurred={fixedNavbar}
    >
      <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
        <div className="capitalize">
          <Breadcrumbs
            className={`bg-transparent p-0 transition-all ${fixedNavbar ? "mt-1" : ""
              }`}
          >
            <Link to={`/${layout}`}>
              <Typography
                variant="small"
                color="blue-gray"
                className="font-normal opacity-50 transition-all hover:text-blue-500 hover:opacity-100"
              >
                {layout}
              </Typography>
            </Link>
            <Typography
              variant="small"
              color="blue-gray"
              className="font-normal"
            >
              {page}
            </Typography>
          </Breadcrumbs>
        </div>
        <div className="flex items-center">
          {/* <div className="mr-auto md:mr-4 md:w-56">
            <Input label="Search" />
          </div> */}
          <IconButton
            variant="text"
            color="blue-gray"
            className="grid xl:hidden"
            onClick={() => setOpenSidenav(dispatch, !openSidenav)}
          >
            <Bars3Icon strokeWidth={3} className="h-6 w-6 text-blue-gray-500" />
          </IconButton>
          {admin && (
            <Menu>
              <MenuHandler>
                <div className="flex items-center gap-2 cursor-pointer me-3">
                  <Avatar src={avatarDefault} alt="avatar" size="sm" />
                  <Typography variant="small" className="font-medium text-gray-800 lg:inline">
                    {admin.email || "Admin"}
                  </Typography>
                </div>
              </MenuHandler>
              <MenuList>
                <MenuItem>
                  <Typography variant="small" className="text-gray-700">
                    <strong>Email:</strong> {admin.email}
                  </Typography>
                </MenuItem>
                <MenuItem>
                  <Button
                    onClick={() => {
                      removeToken();
                      removeProfile();
                      window.location.href = "/sign-in";
                    }}
                    size="sm"
                    color="red"
                    fullWidth
                  >
                    Đăng xuất
                  </Button>
                </MenuItem>
              </MenuList>
            </Menu>
          )}
          <IconButton
            variant="text"
            color="blue-gray"
            // onClick={() => setOpenConfigurator(dispatch, true)}
          >
            <Cog6ToothIcon className="h-5 w-5 text-blue-gray-500" />
          </IconButton>
        </div>
      </div>
    </Navbar>
  );
}

DashboardNavbar.displayName = "/src/widgets/layout/dashboard-navbar.jsx";

export default DashboardNavbar;
