import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./AppRoutes";
import { SidebarProvider } from "./contexts/SidebarContext";

const App = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <SidebarProvider>
        <AppRoutes />
      </SidebarProvider>
    </BrowserRouter>
  );
};

export default App;
