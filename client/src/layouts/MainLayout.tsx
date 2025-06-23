import { Outlet } from "react-router-dom";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/footer";
import { useEffect, useRef } from "react";

const MainLayout = () => {
  return (
    <div className="page flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex justify-center items-center h-full w-full overflow-hidden">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
