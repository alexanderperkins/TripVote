import { Routes, Route } from 'react-router';
import AppBar from './components/AppBar.jsx';

export default function App() {
  return (
    <>
      <AppBar />
      <main className="mx-auto max-w-[1120px] px-4 py-8">
        <Routes>
          <Route path="*" element={<h1 className="text-2xl font-bold">Welcome to TripVote</h1>} />
        </Routes>
      </main>
    </>
  );
}
