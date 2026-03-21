import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { EntryDetailPage } from "@/pages/EntryDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ThinkTanksPage } from "@/pages/ThinkTanksPage";
import { ThinkTankDetailPage } from "@/pages/ThinkTankDetailPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { OpportunityDetailPage } from "@/pages/OpportunityDetailPage";
import { LearningLibraryPage } from "@/pages/LearningLibraryPage";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

function AppRoutes() {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/memory-lane" element={<HistoryPage />} />
        <Route path="/memory-lane/:id" element={<EntryDetailPage />} />
        <Route path="/history" element={<Navigate to="/memory-lane" replace />} />
        <Route path="/history/:id" element={<Navigate to="/memory-lane" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/thinktanks" element={<ThinkTanksPage />} />
        <Route path="/thinktanks/:id" element={<ThinkTankDetailPage />} />
        <Route path="/learning-library" element={<LearningLibraryPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
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
