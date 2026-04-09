import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleSocialLogin } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            handleSocialLogin(token).then(() => {
                navigate("/");
            });
        } else {
            navigate("/login?error=No token received");
        }
    }, [searchParams, navigate, handleSocialLogin]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="bg-card p-8 rounded-lg shadow-lg text-center border border-border">
                <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
                <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-600">Please wait while we log you in.</p>
            </div>
        </div>
    );
};

export default AuthSuccess;