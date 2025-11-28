import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { GamesPage } from "./pages/GamesPage";
import { DebugPage } from "./pages/DebugPage";
import { MiniGamesPage } from "./pages/MiniGamesPage";
import { GamePage } from "./pages/GamePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/games" replace />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="debug" element={<DebugPage />} />
          <Route path="mini-games" element={<MiniGamesPage />} />
          <Route path="mini-games/:gameId" element={<GamePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
