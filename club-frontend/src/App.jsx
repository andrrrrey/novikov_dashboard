import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Quiz from "./pages/Quiz.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DashboardV2 from "./pages/DashboardV2.jsx";
import DashboardLumen from "./pages/DashboardLumen.jsx";
import DashboardPwa from "./pages/DashboardPwa.jsx";
import LoginPwa from "./pages/LoginPwa.jsx";
import ProfilePwa from "./pages/ProfilePwa.jsx";
import QuizPwa from "./pages/QuizPwa.jsx";
import Residents from "./pages/Residents.jsx";
import ResidentsLumen from "./pages/ResidentsLumen.jsx";
import ResidentsPwa from "./pages/ResidentsPwa.jsx";
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
          {/* Демо-редизайн (дизайн-система Lumen) — новая ссылка для показа */}
          <Route path="/demo" element={<ProtectedRoute><DashboardLumen /></ProtectedRoute>} />
          <Route path="/demo/residents" element={<ProtectedRoute><ResidentsLumen /></ProtectedRoute>} />
          {/* PWA-демо по макету Figma — отдельная ссылка для показа */}
          <Route path="/pwa/login" element={<LoginPwa />} />
          <Route path="/pwa" element={<ProtectedRoute><DashboardPwa /></ProtectedRoute>} />
          <Route path="/pwa/residents" element={<ProtectedRoute><ResidentsPwa /></ProtectedRoute>} />
          <Route path="/pwa/profile" element={<ProtectedRoute><ProfilePwa /></ProtectedRoute>} />
          <Route path="/pwa/quiz" element={<ProtectedRoute><QuizPwa /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/residents" element={<ProtectedRoute><Residents /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
