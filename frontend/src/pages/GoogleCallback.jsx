import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function GoogleCallback() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { handleGoogleSuccess } = useAuth();

  useEffect(() => {
    async function processCallback() {
      try {
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace("#", "?"));

        const credential =
          searchParams.get("credential") ||
          searchParams.get("token") ||
          hashParams.get("id_token") ||
          hashParams.get("access_token");

        if (!credential) {
          setError("No credential received from Google authentication.");
          return;
        }

        await handleGoogleSuccess(credential);
        navigate("/", { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to complete Google Sign-In");
      }
    }

    processCallback();
  }, [location, handleGoogleSuccess, navigate]);

  return (
    <div
      data-testid="google-callback-container"
      className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4"
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold tracking-wide">
          {error ? "Authentication Failed" : "Authenticating with Google..."}
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          {error || "Please wait while we verify your session and set up your workspace."}
        </p>
        {error && (
          <button
            onClick={() => navigate("/login")}
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
}
