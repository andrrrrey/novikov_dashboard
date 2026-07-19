import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Quiz from "./pages/Quiz.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DashboardV2 from "./pages/DashboardV2.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/club">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardV2 /></ProtectedRoute>} />
          <Route path="/v2" element={<ProtectedRoute><DashboardV2 /></ProtectedRoute>} />
          <Route path="/old" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
