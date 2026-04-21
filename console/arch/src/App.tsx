import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppRoot } from "./AppRoot";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { ManageUsersPage } from "./pages/ManageUsersPage";
import { ProjectSettingsPage } from "./pages/ProjectSettingsPage";
import { ProjectSongLyricsConfigurePage } from "./pages/ProjectSongLyricsConfigurePage";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspacePage";
import { SongEditPage } from "./pages/SongEditPage";
import { SongNewPage } from "./pages/SongNewPage";
import { TemplateEditPage } from "./pages/TemplateEditPage";
import { TemplateNewPage } from "./pages/TemplateNewPage";
import { UserSettingsPage } from "./pages/UserSettingsPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
        <Route
          path="/projects/:projectId/part/:partIndex/song/:songIndex/lyrics"
          element={<ProjectSongLyricsConfigurePage />}
        />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/templates/new" element={<TemplateNewPage />} />
        <Route path="/templates/:templateId/edit" element={<TemplateEditPage />} />
        <Route path="/songs/new" element={<SongNewPage />} />
        <Route path="/songs/:songId/edit" element={<SongEditPage />} />
        <Route path="/settings" element={<UserSettingsPage />} />
        <Route path="/users" element={<ManageUsersPage />} />
        <Route path="/" element={<AppRoot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
