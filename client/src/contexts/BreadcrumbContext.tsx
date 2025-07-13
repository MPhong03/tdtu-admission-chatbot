import { createContext, useContext, useState } from "react";

type BreadcrumbContextType = {
    title: string;
    setTitle: (title: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const useBreadcrumb = () => {
    const ctx = useContext(BreadcrumbContext);
    if (!ctx) throw new Error("useBreadcrumb must be used within <BreadcrumbProvider>");
    return ctx;
};

export const BreadcrumbProvider = ({ children }: { children: React.ReactNode }) => {
    const [title, setTitle] = useState("...");
    return (
        <BreadcrumbContext.Provider value={{ title, setTitle }}>
            {children}
        </BreadcrumbContext.Provider>
    );
};
