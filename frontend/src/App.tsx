import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import TestCases from './pages/TestCases';
import RunEvaluation from './pages/RunEvaluation';
import Results from './pages/Results';
import Compare from './pages/Compare';
import Reports from './pages/Reports';
import Chat from './pages/Chat';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/models" element={<Models />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/run" element={<RunEvaluation />} />
          <Route path="/results" element={<Results />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
