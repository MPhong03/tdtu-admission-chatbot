import { Navigate } from "react-router-dom";
import { getToken } from "@/utils/session";
import { jwtDecode } from "jwt-decode";

const PrivateRoute = ({ children }) => {
    const token = getToken();

    if (!token) return <Navigate to="/auth/sign-in" />;

    try {
        const decoded = jwtDecode(token);
        // console.log(decoded.role);
        if (decoded.role !== "admin") return <Navigate to="/auth/sign-in" />;
    } catch {
        return <Navigate to="/auth/sign-in" />;
    }

    return children;
};

export default PrivateRoute;
