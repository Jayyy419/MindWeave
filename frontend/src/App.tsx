import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { EntryDetailPage } from "@/pages/EntryDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ThinkTanksPage } from "@/pages/ThinkTanksPage";
import { ThinkTankDetailPage } from "@/pages/ThinkTankDetailPage";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

function AppRoutes() {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<EntryDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/thinktanks" element={<ThinkTanksPage />} />
        <Route path="/thinktanks/:id" element={<ThinkTankDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  );
}
