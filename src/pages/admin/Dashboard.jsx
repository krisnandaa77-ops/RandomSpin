import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Users, Gift, Trophy, CheckCircle, TrendingUp, PlayCircle, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <div className="stat-card" style={{ '--accent-color': color, animationDelay: `${delay}ms` }}>
    <div className="stat-icon" style={{ background: `${color}20`, color }}>
      <Icon size={24} />
    </div>
    <div className="stat-info">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  </div>
);

const ProgressRing = ({ percent, size = 52, stroke = 5, color }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="white" fontSize="12" fontWeight="700">
        {Math.round(percent)}%
      </text>
    </svg>
  );
};

const Dashboard = () => {
  const { participants, prizes, winners, settings } = useStore();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const present = participants.filter(p => p.isPresent).length;
    const sessions = [...new Set(prizes.map(p => p.session))];
    const totalQuota = prizes.reduce((sum, p) => sum + p.quota, 0);
    const totalWon = winners.length;
    const overallProgress = totalQuota > 0 ? (totalWon / totalQuota) * 100 : 0;

    const sessionStats = sessions.map(session => {
      const sessionPrizes = prizes.filter(p => p.session === session);
      const sessionQuota = sessionPrizes.reduce((sum, p) => sum + p.quota, 0);
      const sessionWon = winners.filter(w => w.session === session).length;
      const progress = sessionQuota > 0 ? (sessionWon / sessionQuota) * 100 : 0;
      return { session, prizes: sessionPrizes.length, quota: sessionQuota, won: sessionWon, progress };
    });

    // Recent winners
    const recentWinners = [...winners].reverse().slice(0, 5);

    return { present, sessions, totalQuota, totalWon, overallProgress, sessionStats, recentWinners };
  }, [participants, prizes, winners]);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Selamat datang di panel admin Spin Random Winner</p>
        </div>
        <a href="/spin" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-glow">
          <PlayCircle size={20} /> Buka Layar Undian
        </a>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard icon={Users} label="Total Peserta" value={participants.length} sub={`${stats.present} hadir`} color="#6366f1" delay={0} />
        <StatCard icon={Gift} label="Jenis Hadiah" value={prizes.length} sub={`${stats.totalQuota} kuota`} color="#ec4899" delay={100} />
        <StatCard icon={Trophy} label="Pemenang" value={winners.length} sub={`dari ${stats.totalQuota}`} color="#10b981" delay={200} />
        <StatCard icon={TrendingUp} label="Progress" value={`${Math.round(stats.overallProgress)}%`} sub={stats.overallProgress >= 100 ? '✅ Selesai' : 'Berlangsung'} color="#f59e0b" delay={300} />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Session Progress */}
        <div className="glass-card dashboard-card stagger-1">
          <h3 className="card-title">
            <CheckCircle size={18} /> Progress Per Sesi
          </h3>
          {stats.sessionStats.length === 0 ? (
            <div className="empty-mini">
              <Gift size={28} strokeWidth={1.2} />
              <span>Belum ada sesi hadiah</span>
            </div>
          ) : (
            <div className="session-progress-list">
              {stats.sessionStats.map((s, i) => (
                <div key={s.session} className="session-progress-item" style={{ animationDelay: `${400 + i * 80}ms` }}>
                  <div className="session-progress-info">
                    <span className="session-name">{s.session}</span>
                    <span className="session-detail">{s.won}/{s.quota} pemenang • {s.prizes} hadiah</span>
                  </div>
                  <ProgressRing
                    percent={s.progress}
                    color={s.progress >= 100 ? '#10b981' : s.progress > 0 ? '#6366f1' : '#475569'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Winners */}
        <div className="glass-card dashboard-card stagger-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">
              <Trophy size={18} /> Pemenang Terakhir
            </h3>
            {winners.length > 0 && (
              <button className="btn-link" onClick={() => navigate('/admin/winners')}>
                Lihat Semua <ArrowRight size={14} />
              </button>
            )}
          </div>
          {stats.recentWinners.length === 0 ? (
            <div className="empty-mini">
              <Trophy size={28} strokeWidth={1.2} />
              <span>Belum ada pemenang</span>
            </div>
          ) : (
            <div className="recent-winners-list">
              {stats.recentWinners.map((w, i) => (
                <div key={w.id} className="recent-winner-item" style={{ animationDelay: `${500 + i * 80}ms` }}>
                  <div className="winner-avatar">{w.name.charAt(0).toUpperCase()}</div>
                  <div className="winner-info">
                    <span className="winner-name-text">{w.name}</span>
                    <span className="winner-prize-text">{w.prizeName}</span>
                  </div>
                  <div className="winner-meta">
                    <span className="winner-session-badge">{w.session}</span>
                    <span className="winner-time">
                      <Clock size={12} /> {new Date(w.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card dashboard-card stagger-3">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>⚡ Aksi Cepat</h3>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => navigate('/admin/participants')}>
            <Users size={22} />
            <span>Kelola Peserta</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/admin/prizes')}>
            <Gift size={22} />
            <span>Kelola Hadiah</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/admin/winners')}>
            <Trophy size={22} />
            <span>Rekap Pemenang</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/admin/settings')}>
            <TrendingUp size={22} />
            <span>Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
