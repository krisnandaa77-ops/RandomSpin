import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Palette, Eye, Save, Loader2, Upload } from 'lucide-react';
import { useToast } from '../../components/Toast';
import bgLandscapeDefault from '../../assets/bg-landscape.png';
import bgPortraitDefault from '../../assets/bg-potrait.png';

const isVideo = (url) => url && (typeof url === 'string') && (url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url));

const ColorInput = ({ label, name, value, onChange }) => (
  <div className="color-field">
    <label className="form-label">{label}</label>
    <div className="color-input-row">
      <input 
        type="color" 
        name={name}
        value={value}
        onChange={onChange}
        className="color-picker"
      />
      <input 
        type="text" 
        name={name}
        value={value}
        onChange={onChange}
        className="form-input color-text"
      />
    </div>
  </div>
);

const Settings = () => {
  const { settings: globalSettings, setSettings: setGlobalSettings, prizes, participants, winners } = useStore();
  const { toast } = useToast();

  const [settings, setSettings] = useState(() => ({ ...globalSettings }));
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  useEffect(() => {
    setSettings({ ...globalSettings });
  }, [globalSettings]);

  const handleSave = () => {
    try {
      // Uji simpan ke localStorage untuk memverifikasi kapasitas penyimpanan browser (maks ~5MB)
      window.localStorage.setItem('spin_settings', JSON.stringify(settings));
      setGlobalSettings(settings);
      toast.success('Pengaturan berhasil disimpan!');
    } catch (error) {
      console.error(error);
      if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.message?.toLowerCase().includes('quota'))) {
        toast.error('Gagal menyimpan! Ukuran file background terlalu besar untuk penyimpanan browser. Mohon gunakan file di bawah 3.5 MB.');
      } else {
        toast.error('Gagal menyimpan pengaturan: ' + (error.message || 'Terjadi kesalahan'));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: name === 'spinDuration' || name === 'columns' ? Number(value) 
            : name === 'overlayOpacity' ? parseFloat(value) 
            : value,
    }));
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeBytes = 3.5 * 1024 * 1024; // 3.5 MB
      if (file.size > maxSizeBytes) {
        toast.error('Ukuran file terlalu besar! Maksimal 3.5 MB agar tidak memenuhi kapasitas memori browser.');
        e.target.value = '';
        return;
      }

      setIsProcessingBg(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((prev) => ({
          ...prev,
          backgroundUrl: reader.result,
        }));
        setIsProcessingBg(false);
        toast.success('Background dimuat! Klik Simpan Pengaturan untuk menerapkan perubahan.');
      };
      reader.onerror = () => {
        setIsProcessingBg(false);
        toast.error('Gagal membaca file background.');
      };
      reader.readAsDataURL(file);
    }
  };

  const effectiveBackgroundUrl = settings.backgroundUrl || (settings.screenMode === 'portrait' ? bgPortraitDefault : bgLandscapeDefault);

  // Preview data
  const sampleNames = ['Budi Santoso', 'Aisyah Putri', 'Rizky Maulana', 'Dewi Lestari', 'Ahmad Fauzi', 'Siti Nurhaliza'];
  const previewSlots = Math.min(settings.columns || 3, 6);
  const previewNames = sampleNames.slice(0, previewSlots);

  // Get first prize for preview info
  const firstPrize = prizes.length > 0 ? prizes[0] : null;

  return (
    <div>
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>Pengaturan Sistem</h2>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '1rem', fontWeight: 700 }}
            onClick={handleSave}
          >
            <Save size={18} /> Simpan Pengaturan
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column - Basic Settings */}
          <div>
            <div className="form-group">
              <label className="form-label">Judul Undian</label>
              <input 
                type="text" 
                name="title"
                value={settings.title} 
                onChange={handleChange}
                className="form-input" 
                placeholder="Contoh: UNDIAN DOORPRIZE"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sesi Aktif</label>
              <input 
                type="text" 
                name="activeSession"
                value={settings.activeSession} 
                onChange={handleChange}
                className="form-input" 
                placeholder="Contoh: Sesi 1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Durasi Acak (Detik)</label>
              <input 
                type="number" 
                name="spinDuration"
                value={settings.spinDuration} 
                onChange={handleChange}
                className="form-input" 
                min="1"
              />
              <small style={{ color: 'var(--text-muted)' }}>*Lama nama diacak sebelum berhenti perlahan.</small>
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah Kolom Tampilan Layar Utama</label>
              <input 
                type="number" 
                name="columns"
                value={settings.columns} 
                onChange={handleChange}
                className="form-input" 
                min="1"
                max="10"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ukuran Layar</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className={`btn ${settings.screenMode !== 'portrait' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setSettings(prev => ({ ...prev, screenMode: 'landscape' }))}
                >
                  Landscape (Standar)
                </button>
                <button
                  type="button"
                  className={`btn ${settings.screenMode === 'portrait' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setSettings(prev => ({ ...prev, screenMode: 'portrait' }))}
                >
                  Portrait 768x1024 (Videotron)
                </button>
              </div>
              <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                {settings.screenMode === 'portrait'
                  ? '📺 Layar terkunci ke rasio 768x1024 (videotron), tampilan menyesuaikan otomatis di layar mana pun.'
                  : '🖥️ Layar mengikuti ukuran jendela/monitor biasa (TV, proyektor, laptop).'}
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Validasi Pemenang Duplikat</label>
              <div className="toggle-row" onClick={() => setSettings(prev => ({ ...prev, allowDuplicate: !prev.allowDuplicate }))}>
                <div className={`toggle-switch ${settings.allowDuplicate ? 'active' : ''}`}>
                  <div className="toggle-knob" />
                </div>
                <span style={{ color: 'var(--text-main)', fontSize: '14px' }}>
                  {settings.allowDuplicate ? 'Boleh menang lebih dari 1x' : 'Hanya boleh menang 1x'}
                </span>
              </div>
              <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                {settings.allowDuplicate 
                  ? '⚠️ Peserta yang sudah menang bisa menang lagi di hadiah lain.' 
                  : '✅ Peserta yang sudah menang akan otomatis dikeluarkan dari undian berikutnya.'}
              </small>
            </div>
          </div>

          {/* Right Column - Background */}
          <div>
            <div className="form-group">
              <label className="form-label">Background Layar (Foto / Video Looping)</label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                position: 'relative',
                overflow: 'hidden',
                backgroundImage: (!isVideo(settings.backgroundUrl) && settings.backgroundUrl) ? `url(${settings.backgroundUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {isVideo(settings.backgroundUrl) && (
                  <video 
                    key={typeof settings.backgroundUrl === 'string' ? settings.backgroundUrl.substring(0, 80) : 'bg-1'}
                    src={settings.backgroundUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    onLoadedData={(e) => { e.target.play().catch(() => {}); }}
                    onCanPlay={(e) => { e.target.play().catch(() => {}); }}
                    style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', top: 0, left: 0 }} 
                  />
                )}
                {!settings.backgroundUrl && !isProcessingBg && <span style={{ color: 'var(--text-muted)' }}>Belum ada background</span>}
                {isProcessingBg && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', gap: '10px', zIndex: 10 }}>
                    <Loader2 size={32} className="animate-spin" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Memproses file...</span>
                  </div>
                )}
              </div>
              
              <label className="btn btn-secondary" style={{ width: '100%', opacity: isProcessingBg ? 0.7 : 1, cursor: isProcessingBg ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isProcessingBg ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Foto atau Video (Looping)
                  </>
                )}
                <input type="file" accept="image/*,video/*" onChange={handleBackgroundUpload} disabled={isProcessingBg} style={{ display: 'none' }} />
              </label>
              
              <small style={{ color: 'var(--text-muted)', marginTop: '8px', display: 'block', fontSize: '0.8rem', lineHeight: '1.4' }}>
                💡 Disarankan ukuran maksimal <b>3.5 MB</b> (MP4/WEBM untuk video looping, PNG/JPG untuk foto) agar penyimpanan browser tetap optimal.
              </small>
              
              {settings.backgroundUrl && (
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => setSettings(prev => ({ ...prev, backgroundUrl: '' }))}
                  disabled={isProcessingBg}
                >
                  Hapus Background
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Overlay Opacity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="range" 
                  name="overlayOpacity"
                  value={settings.overlayOpacity || 0.4}
                  onChange={handleChange}
                  min="0" max="0.9" step="0.05"
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '40px' }}>
                  {Math.round((settings.overlayOpacity || 0.4) * 100)}%
                </span>
              </div>
              <small style={{ color: 'var(--text-muted)' }}>*Tingkat gelap overlay di atas background.</small>
            </div>
          </div>
        </div>
      </div>

      {/* === Color / Theme Settings === */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palette size={22} /> Pengaturan Warna & Tema
        </h2>
        
        <div className="color-grid">
          <ColorInput 
            label="Warna Judul" 
            name="titleColor" 
            value={settings.titleColor || '#ffffff'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Teks Slot" 
            name="slotText" 
            value={settings.slotText || '#ffffff'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Border Slot" 
            name="slotBorder" 
            value={settings.slotBorder || '#ffffff'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Background Slot" 
            name="slotBg" 
            value={settings.slotBg || '#1e293b'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Tombol Mulai" 
            name="btnColor" 
            value={settings.btnColor || '#10b981'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Teks Hadiah" 
            name="prizeTextColor" 
            value={settings.prizeTextColor || '#ffffff'} 
            onChange={handleChange} 
          />
          <ColorInput 
            label="Warna Shadow Slot" 
            name="spinShadowColor" 
            value={settings.spinShadowColor || '#000000'} 
            onChange={handleChange} 
          />
        </div>

        {/* Save Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 32px', fontSize: '1.05rem', fontWeight: 700, borderRadius: '999px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
            onClick={handleSave}
          >
            <Save size={20} /> Simpan Semua Pengaturan
          </button>
        </div>
      </div>

      {/* === LIVE PREVIEW === */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Eye size={22} /> Live Preview
        </h2>

        <div className="preview-frame">
          {/* Preview Container */}
          <div 
            className="preview-spin"
            style={{ 
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: (!isVideo(effectiveBackgroundUrl) && effectiveBackgroundUrl) ? `url(${effectiveBackgroundUrl})` : 'none',
              backgroundColor: effectiveBackgroundUrl ? 'transparent' : '#0f172a',
            }}
          >
            {isVideo(effectiveBackgroundUrl) && (
              <video
                key={typeof effectiveBackgroundUrl === 'string' ? effectiveBackgroundUrl.substring(0, 80) : 'bg-2'}
                src={effectiveBackgroundUrl}
                autoPlay 
                loop 
                muted 
                playsInline 
                onLoadedData={(e) => { e.target.play().catch(() => {}); }}
                onCanPlay={(e) => { e.target.play().catch(() => {}); }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
              />
            )}
            {/* Overlay */}
            <div 
              className="preview-overlay"
              style={{ backgroundColor: `rgba(0, 0, 0, ${settings.overlayOpacity || 0.4})`, zIndex: 1 }}
            />

            {/* Content */}
            <div className="preview-content">
              {/* Title */}
              <h3 
                className="preview-title"
                style={{ color: settings.titleColor || '#ffffff' }}
              >
                {settings.title || 'UNDIAN DOORPRIZE'}
              </h3>

              {/* Prize Info */}
              {firstPrize && (
                <div className="preview-prize-info" style={{ color: settings.prizeTextColor || '#ffffff' }}>
                  🎁 {firstPrize.name} — {firstPrize.session} • {firstPrize.quota} Pemenang
                </div>
              )}

              {/* Slots Grid */}
              <div 
                className="preview-grid"
                style={{ gridTemplateColumns: `repeat(${Math.min(settings.columns || 3, 4)}, 1fr)` }}
              >
                {previewNames.map((name, i) => (
                  <div 
                    key={i}
                    className="preview-slot"
                    style={{
                      background: settings.slotBg || 'rgba(30, 41, 59, 0.8)',
                      border: `2px solid ${settings.slotBorder || 'rgba(255,255,255,0.2)'}`,
                      color: settings.slotText || '#ffffff',
                      boxShadow: `0 4px 12px ${settings.spinShadowColor || '#000000'}40`,
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Button */}
              <div className="preview-btn-area">
                <div 
                  className="preview-btn"
                  style={{ backgroundColor: settings.btnColor || '#10b981' }}
                >
                  MULAI ACAK
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
