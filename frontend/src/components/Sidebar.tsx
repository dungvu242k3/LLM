import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Play,
  BarChart3,
  GitCompare,
  Download,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/models', icon: Bot, label: 'Models' },
  { to: '/test-cases', icon: FileText, label: 'Test Cases' },
  { to: '/run', icon: Play, label: 'Run Evaluation' },
  { to: '/results', icon: BarChart3, label: 'Results' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/reports', icon: Download, label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: 'white',
            }}
          >
            LE
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f1f5f9' }}>
              LLM Eval
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              Dashboard v1.0
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-surface-600)' }}>
        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
          LLM Evaluation Dashboard
        </div>
      </div>
    </aside>
  );
}
