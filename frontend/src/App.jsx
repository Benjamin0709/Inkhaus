import { Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ChatbotWidget from "./components/chatbot/ChatbotWidget";
import HomePage from "./pages/Home/HomePage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import AdminPage from "./pages/Admin/AdminPage";
import PortfolioPage from "./pages/Portfolio/PortfolioPage";
import ArtistsListPage from "./pages/Artists/ArtistsListPage";
import ArtistProfilePage from "./pages/Artists/ArtistProfilePage";
import UploadWork from "./pages/Artists/ArtistsUploadWork";
import EditArtistProfile from "./pages/Artists/EditArtistProfile";
import PrivateRoute from "./components/auth/PrivateRoute";
import BookAppointmentPage from "./pages/Artists/BookAppointmentPage";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/artists" element={<ArtistsListPage />} />
        <Route path="/artists/:id" element={<ArtistProfilePage />} />
        <Route
          path="/artista/portafolio"
          element={
            <PrivateRoute roles={["artista"]}>
              <UploadWork />
            </PrivateRoute>
          }
        />
        <Route
          path="/artista/perfil"
          element={
            <PrivateRoute roles={["artista", "admin"]}>
              <EditArtistProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={["admin"]}>
              <AdminPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/artistas/:artistId/reservar"
          element={
            <PrivateRoute>
              <BookAppointmentPage />
            </PrivateRoute>
          }
        />
      </Routes>
      <Footer />
      <ChatbotWidget />
    </>
  );
}