// @humand-auth: janus-staff
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ui";
import { DealCraftApp } from "@/components/features/dealcraft-app";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "./contexts/Auth";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AuthErrorPage from "./components/Auth/AuthError";
import LoginPage from "./pages/Auth/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <DealCraftApp />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/error" element={<AuthErrorPage />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
