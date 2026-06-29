import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DealCraftApp } from "@/components/features/dealcraft-app";

const queryClient = new QueryClient();

// react-router v6 declarative shell. `patch-app-tsx.ts` (auth-add-staff) keys off
// this exact <QueryClientProvider><BrowserRouter><Routes> shape to inject the
// /login and /error routes and wrap "/" with <ProtectedRoute>.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DealCraftApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
