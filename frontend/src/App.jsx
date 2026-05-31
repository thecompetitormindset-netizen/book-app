import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Library from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import Stats from "./pages/Stats";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
