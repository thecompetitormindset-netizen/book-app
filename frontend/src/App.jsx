import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { requestPersistentStorage } from "./store/personal";
import Navbar from "./components/Navbar";
import ReminderToasts from "./components/ReminderToasts";
import Today from "./pages/Today";
import Landing from "./pages/Landing";
import Notebook from "./pages/Notebook";
import Planner from "./pages/Planner";
import Prenursing from "./pages/Prenursing";
import Discover from "./pages/Discover";
import Library from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import Stats from "./pages/Stats";

export default function App() {
  // Ask the browser to keep our data even when the device is low on space.
  useEffect(() => { requestPersistentStorage(); }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/today" element={<Today />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/prenursing" element={<Prenursing />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/library" element={<Library />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
        <ReminderToasts />
      </div>
    </BrowserRouter>
  );
}
