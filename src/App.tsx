// @humand-auth: janus-staff
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary, Spinner } from "@/components/ui";
import { DealCraftApp } from "@/components/features/dealcraft-app";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "./contexts/Auth";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminRoute from "./components/Auth/AdminRoute";
import AuthErrorPage from "./components/Auth/AuthError";
import LoginPage from "./pages/Auth/Login";

const AdminDashboardPage = lazy(() => import("@/components/features/admin/admin-dashboard"));

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
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <Suspense
                        fallback={
                          <div className="flex h-screen items-center justify-center">
                            <Spinner size="md" />
                          </div>
                        }
                      >
                        <AdminDashboardPage />
                      </Suspense>
                    </ErrorBoundary>
                  </AdminRoute>
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
