import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppRoot } from "./AppRoot";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { ManageUsersPage } from "./pages/ManageUsersPage";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspacePage";
import { UserSettingsPage } from "./pages/UserSettingsPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects/new" element={<CreateProjectPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/settings" element={<UserSettingsPage />} />
        <Route path="/users" element={<ManageUsersPage />} />
        <Route path="/" element={<AppRoot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
