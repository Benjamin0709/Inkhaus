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
import MyAppointmentsPage from "./pages/Account/MyAppointmentsPage";
import ArtistAppointmentsPage from "./pages/Artists/ArtistAppointmentsPage";
import ReportsPage from "./pages/Admin/ReportsPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Auth/ResetPasswordPage";
import AdminPricingPage from "./pages/Admin/AdminPricingPage";
import PaymentResultPage from "./pages/Payment/PaymentResultPage";
import ContactPage from "./pages/Contact/ContactPage";
import { LiveChatProvider } from "./context/LiveChatContext";
import LiveChatWidget from "./components/livechat/LiveChatWidget";
import ProcessPage from "./pages/Process/ProcessPage";
import CarePage from "./pages/Care/CarePage";
import AccountPage from "./pages/Account/AccountPage";



export default function App() {
  return (
    <>
    <LiveChatProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/artists" element={<ArtistsListPage />} />
        <Route path="/artists/:id" element={<ArtistProfilePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/proceso" element={<ProcessPage />} />
        <Route path="/cuidados" element={<CarePage />} />

        <Route 
          path="/pago/resultado" 
          element={
            <PrivateRoute>
              <PaymentResultPage />
            </PrivateRoute>
          } 
        />
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
          path="/admin/reportes"
          element={
            <PrivateRoute roles={["admin"]}>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route 
          path="/admin/precios" 
          element={
            <PrivateRoute roles={["admin"]}>
              <AdminPricingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/artista/citas"
          element={
            <PrivateRoute roles={["artista", "admin"]}>
              <ArtistAppointmentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/artists/:artistId/agendar"
          element={
            <PrivateRoute>
              <BookAppointmentPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <PrivateRoute>
              <AccountPage />
            </PrivateRoute>
          }
        />
      </Routes>
      <Footer />
      <ChatbotWidget />
      <LiveChatWidget />
      </LiveChatProvider>
    </>
  );
}