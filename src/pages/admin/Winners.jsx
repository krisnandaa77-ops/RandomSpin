import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Download, Trash2, Trophy, Printer, Clock } from 'lucide-react';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';

const Winners = () => {
  const { winners, setWinners } = useStore();
  const { toast, confirm } = useToast();

  const handleReset = async () => {
    if (winners.length === 0) return;
    const yes = await confirm({
      title: 'Reset Pemenang',
      message: `Hapus SEMUA (${winners.length}) data pemenang? Tindakan ini tidak bisa dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Semua'
    });
    if (yes) { setWinners([]); toast.success('Data pemenang berhasil direset'); }
  };

  const handleExport = () => {
    if (winners.length === 0) { toast.warning('Belum ada data pemenang untuk diexport.'); return; }
    const headers = ['No', 'Sesi', 'Hadiah', 'No. BIB', 'Nama Pemenang', 'Waktu'];
    const rows = winners.map((w, i) => [
      i + 1,
      `"${(w.session || '').replace(/"/g, '""')}"`,
      `"${(w.prizeName || '').replace(/"/g, '""')}"`,
      `"${(w.bibNumber || '').replace(/"/g, '""')}"`,
      `"${(w.name || '').replace(/"/g, '""')}"`,
      `"${new Date(w.timestamp).toLocaleString('id-ID')}"`
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    link.setAttribute('download', `Rekap_Pemenang_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success('File CSV berhasil diunduh');
  };

  const handlePrint = () => {
    if (winners.length === 0) { toast.warning('Tidak ada data untuk dicetak'); return; }
    const printWindow = window.open('', '_blank');
    const rows = winners.map((w, i) => `<tr><td>${i + 1}</td><td>${w.session}</td><td>${w.prizeName}</td><td>${w.bibNumber || '-'}</td><td><b>${w.name}</b></td><td>${new Date(w.timestamp).toLocaleString('id-ID')}</td></tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Rekap Pemenang</title><style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
      body{padding:40px}
      .header{text-align:center;margin-bottom:32px;border-bottom:2px solid #333;padding-bottom:16px}
      .header h1{font-size:24px;margin-bottom:4px} .header p{color:#666;font-size:14px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:10px 14px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:48px;display:flex;justify-content:space-between}
      .footer div{text-align:center;min-width:200px}
      .footer .line{border-top:1px solid #333;margin-top:60px;padding-top:8px;font-size:13px}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header"><h1>REKAP PEMENANG DOORPRIZE</h1><p>Dicetak: ${new Date().toLocaleString('id-ID')}</p></div>
    <table><thead><tr><th>No</th><th>Sesi</th><th>Hadiah</th><th>No. BIB</th><th>Pemenang</th><th>Waktu</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:16px;font-size:13px;color:#666">Total Pemenang: <b>${winners.length}</b></p>
    <div class="footer"><div><div class="line">Panitia</div></div><div><div class="line">Penanggung Jawab</div></div></div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2><Trophy size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Rekap Pemenang ({winners.length})</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export CSV</button>
          <button className="btn btn-danger" onClick={handleReset}><Trash2 size={16} /> Reset</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th style={{ width: 60 }}>No</th><th>Sesi</th><th>Hadiah</th><th style={{ width: 100 }}>No. BIB</th><th>Pemenang</th><th>Waktu</th></tr></thead>
          <tbody>
            {winners.length === 0 ? (
              <tr><td colSpan="6"><EmptyState type="winners" title="Belum ada pemenang" message="Pemenang akan tercatat di sini setelah undian dilakukan." /></td></tr>
            ) : winners.map((w, idx) => (
              <tr key={w.id} className="table-row-animate" style={{ animationDelay: `${idx * 30}ms` }}>
                <td>{idx + 1}</td>
                <td><span className="session-badge">{w.session}</span></td>
                <td>{w.prizeName}</td>
                <td>{w.bibNumber || '-'}</td>
                <td><span className="winner-highlight">{w.name}</span></td>
                <td className="time-cell"><Clock size={13} /> {new Date(w.timestamp).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Winners;
