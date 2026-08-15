import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Plus, Trash2, Edit, Gift, Image } from 'lucide-react';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';

const Prizes = () => {
  const { prizes, setPrizes } = useStore();
  const { toast, confirm } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrize, setCurrentPrize] = useState({ id: null, name: '', quota: 1, session: 'Sesi 1', image: '' });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Periksa ukuran file, jika > 5MB beri peringatan
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('Ukuran file terlalu besar. Kompresi mungkin membutuhkan waktu.');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // PNG/WEBP/GIF can carry transparency — keep it as PNG so the intro showcase
          // shows the prize floating on the spin background instead of a solid box.
          // JPEG never has transparency, so it's fine to keep compressing those.
          const preserveTransparency = /png|webp|gif/i.test(file.type);
          const dataUrl = preserveTransparency
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.7); // Kompresi ke jpeg 70%
          setCurrentPrize(prev => ({ ...prev, image: dataUrl }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!currentPrize.name) { toast.warning('Nama hadiah harus diisi'); return; }
    if (currentPrize.id) {
      setPrizes(prizes.map(p => p.id === currentPrize.id ? currentPrize : p));
      toast.success(`Hadiah "${currentPrize.name}" diperbarui`);
    } else {
      setPrizes([...prizes, { ...currentPrize, id: Date.now() }]);
      toast.success(`Hadiah "${currentPrize.name}" ditambahkan`);
    }
    setCurrentPrize({ id: null, name: '', quota: 1, session: 'Sesi 1', image: '' });
    setIsEditing(false);
  };

  const handleDelete = async (prize) => {
    const yes = await confirm({ title: 'Hapus Hadiah', message: `Hapus "${prize.name}"?`, type: 'danger', confirmText: 'Ya, Hapus' });
    if (yes) { setPrizes(prizes.filter(p => p.id !== prize.id)); toast.success(`"${prize.name}" dihapus`); }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2>Manajemen Hadiah</h2>
        {!isEditing && <button className="btn btn-primary" onClick={() => setIsEditing(true)}><Plus size={16} /> Tambah Hadiah</button>}
      </div>

      {isEditing && (
        <div className="form-panel slide-down">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={18} /> {currentPrize.id ? 'Edit' : 'Tambah'} Hadiah</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group"><label className="form-label">Nama Hadiah</label><input type="text" className="form-input" value={currentPrize.name} onChange={e => setCurrentPrize({ ...currentPrize, name: e.target.value })} placeholder="Smart TV 55 inch" /></div>
            <div className="form-group"><label className="form-label">Kuota Pemenang</label><input type="number" className="form-input" min="1" value={currentPrize.quota} onChange={e => setCurrentPrize({ ...currentPrize, quota: Number(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Alokasi Sesi</label><input type="text" className="form-input" value={currentPrize.session} onChange={e => setCurrentPrize({ ...currentPrize, session: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Gambar (Opsional)</label><input type="file" accept="image/*" className="form-input" onChange={handleImageUpload} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
            <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setCurrentPrize({ id: null, name: '', quota: 1, session: 'Sesi 1', image: '' }); }}>Batal</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>Gambar</th><th>Nama Hadiah</th><th>Sesi</th><th>Kuota</th><th>Aksi</th></tr></thead>
          <tbody>
            {prizes.length === 0 ? (
              <tr><td colSpan="5"><EmptyState type="prizes" title="Belum ada hadiah" message="Tambahkan hadiah untuk diundi." /></td></tr>
            ) : prizes.map((prize, idx) => (
              <tr key={prize.id} className="table-row-animate" style={{ animationDelay: `${idx * 30}ms` }}>
                <td>{prize.image ? <img src={prize.image} alt={prize.name} className="table-img" /> : <div className="table-img-placeholder"><Gift size={16} /></div>}</td>
                <td><strong>{prize.name}</strong></td>
                <td><span className="session-badge">{prize.session}</span></td>
                <td><span className="quota-badge">{prize.quota} orang</span></td>
                <td><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary btn-icon" onClick={() => { setCurrentPrize(prize); setIsEditing(true); }}><Edit size={16} /></button><button className="btn btn-danger btn-icon" onClick={() => handleDelete(prize)}><Trash2 size={16} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Prizes;
