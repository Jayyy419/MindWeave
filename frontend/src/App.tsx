import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { EntryDetailPage } from "@/pages/EntryDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ThinkTanksPage } from "@/pages/ThinkTanksPage";
import { ThinkTankDetailPage } from "@/pages/ThinkTankDetailPage";

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<EntryDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/thinktanks" element={<ThinkTanksPage />} />
            <Route path="/thinktanks/:id" element={<ThinkTankDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
