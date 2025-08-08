import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./AppRoutes";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ChatProvider } from "./contexts/ChatContext";

const App = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <SidebarProvider>
        <ChatProvider>
          <AppRoutes />
        </ChatProvider>
      </SidebarProvider>
    </BrowserRouter>
  );
};

export default App;
