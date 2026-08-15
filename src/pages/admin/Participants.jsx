import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { Upload, Plus, Trash2, Search, FileSpreadsheet, X, Loader2, Check, Eraser } from 'lucide-react';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const normalizeHeader = (h) => String(h ?? '').toLowerCase().trim();

// Prioritized guesses for auto-detecting which raw column holds each field.
const BIB_NUMBER_PATTERNS = [
  /nomor\s*bib/, /no\.?\s*bib/, /bib\s*no/, /bib\s*number/, /bib\s*num/, /^bib$/, /race\s*number/, /no\s*(peserta|urut)/
];
const BIB_NAME_PATTERNS = [
  /nama\s*bib/, /bib\s*name/, /nama\s*peserta/, /nama\s*lengkap/, /^nama$/, /^name$/
];

const guessColumnIndex = (headers, patterns) => {
  for (const pattern of patterns) {
    const idx = headers.findIndex(h => pattern.test(normalizeHeader(h)));
    if (idx !== -1) return idx;
  }
  return -1;
};

// Some raw exports repeat the column label inside every cell value
// (e.g. "Nama BIB: Reginaldo" or "No BIB - 102"). Strip that label prefix
// so only the actual value remains.
const LABEL_PREFIX_PATTERN = /^\s*(nama\s*bib|bib\s*name|no\.?\s*bib|nomor\s*bib|bib\s*no|bib\s*number)\s*[:\-]\s*/i;
const stripLabelPrefix = (value) => String(value ?? '').trim().replace(LABEL_PREFIX_PATTERN, '').trim();

const Participants = () => {
  const { participants, setParticipants } = useStore();
  const { toast, confirm } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCount, setShowCount] = useState(10);
  const [newBibNumber, setNewBibNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Column-mapping modal state (shown after a file is parsed, before import).
  const [importPreview, setImportPreview] = useState(null); // { headers, rows, fileName }
  const [bibNumberColIdx, setBibNumberColIdx] = useState(-1);
  const [bibNameColIdx, setBibNameColIdx] = useState(-1);

  // Sheet-picker modal state — shown first for workbooks with multiple sheets/tabs,
  // so the admin can combine peserta from several sheets (e.g. per category) into one import.
  const [sheetPicker, setSheetPicker] = useState(null); // { fileName, sheets: [{ name, data }] }
  const [selectedSheetNames, setSelectedSheetNames] = useState(new Set());

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newParticipant = {
      id: Date.now().toString(),
      bibNumber: newBibNumber.trim(),
      name: newName.trim(),
      isPresent: true
    };
    setParticipants([...participants, newParticipant]);
    setNewBibNumber('');
    setNewName('');
    toast.success(`${newParticipant.name} berhasil ditambahkan`);
  };

  const cleanSheetRows = (data) => (data || []).filter(row => Array.isArray(row) && row.some(cell => cell !== '' && cell !== null && cell !== undefined));

  // Take the raw sheet (array-of-arrays, first row = header), stash it, and
  // open the mapping modal so the user can pick which raw columns to use —
  // the source file may contain many unrelated columns (alamat, finish time, dst).
  const openColumnMapping = (data, fileName) => {
    const cleanRows = cleanSheetRows(data);
    if (cleanRows.length === 0) {
      toast.warning('File tidak berisi data.');
      return;
    }

    const headers = cleanRows[0].map((h, i) => {
      const label = String(h ?? '').trim();
      return label || `Kolom ${i + 1}`;
    });
    const rows = cleanRows.slice(1);

    if (rows.length === 0) {
      toast.warning('File hanya berisi baris judul, tidak ada data peserta.');
      return;
    }

    setBibNumberColIdx(guessColumnIndex(headers, BIB_NUMBER_PATTERNS));
    setBibNameColIdx(guessColumnIndex(headers, BIB_NAME_PATTERNS));
    setImportPreview({ headers, rows, fileName });
  };

  const toggleSheetSelection = (name) => {
    setSelectedSheetNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const cancelSheetPicker = () => {
    setSheetPicker(null);
    setSelectedSheetNames(new Set());
  };

  // Combine rows from every checked sheet/tab into one dataset — column layout
  // is assumed consistent across sheets (typical for per-category registration exports),
  // so the header row is taken from the first selected sheet only.
  const confirmSheetPicker = () => {
    const selected = sheetPicker.sheets.filter(s => selectedSheetNames.has(s.name));
    if (selected.length === 0) {
      toast.error('Pilih minimal satu sheet.');
      return;
    }

    const firstClean = cleanSheetRows(selected[0].data);
    const headerRow = firstClean[0];
    const combinedRows = selected.flatMap(s => cleanSheetRows(s.data).slice(1));

    openColumnMapping([headerRow, ...combinedRows], sheetPicker.fileName);
    setSheetPicker(null);
    setSelectedSheetNames(new Set());
  };

  const processFile = (file) => {
    if (!file) return;
    setIsImporting(true);
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          openColumnMapping(results.data, file.name);
          setIsImporting(false);
        },
        error: () => {
          toast.error('Gagal membaca file CSV.');
          setIsImporting(false);
        },
        header: false
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const sheets = wb.SheetNames
            .map(name => ({ name, data: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }) }))
            .filter(s => s.data.some(row => Array.isArray(row) && row.some(cell => cell !== '' && cell !== null && cell !== undefined)));

          if (sheets.length === 0) {
            toast.warning('File tidak berisi data.');
          } else if (sheets.length === 1) {
            openColumnMapping(sheets[0].data, file.name);
          } else {
            // Multiple tabs (e.g. per category) — let the admin pick which ones to combine.
            setSelectedSheetNames(new Set([sheets[0].name]));
            setSheetPicker({ fileName: file.name, sheets });
          }
        } catch (err) {
          toast.error('Gagal membaca file Excel: struktur atau format tidak sesuai.');
        } finally {
          setIsImporting(false);
        }
      };
      reader.onerror = () => {
        toast.error('Gagal membaca file Excel.');
        setIsImporting(false);
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error('Format file tidak didukung. Gunakan .csv atau .xlsx');
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e) => {
    processFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & Drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const cancelImport = () => {
    setImportPreview(null);
    setBibNumberColIdx(-1);
    setBibNameColIdx(-1);
  };

  const confirmImport = () => {
    if (bibNameColIdx === -1) {
      toast.error('Pilih kolom Nama BIB terlebih dahulu.');
      return;
    }

    const newParticipants = importPreview.rows
      .filter(row => row[bibNameColIdx] !== undefined && String(row[bibNameColIdx]).trim() !== '')
      .map((row, index) => ({
        id: `import-${Date.now()}-${index}`,
        bibNumber: bibNumberColIdx !== -1 ? stripLabelPrefix(row[bibNumberColIdx]) : '',
        name: stripLabelPrefix(row[bibNameColIdx]),
        isPresent: true
      }));

    if (newParticipants.length > 0) {
      setParticipants(prev => [...prev, ...newParticipants]);
      toast.success(`${newParticipants.length} peserta berhasil diimpor dari ${importPreview.fileName}`, { duration: 5000 });
    } else {
      toast.warning('Tidak ada baris dengan Nama BIB yang valid pada kolom yang dipilih.');
    }
    cancelImport();
  };

  const handleDelete = async (id, name) => {
    const yes = await confirm({
      title: 'Hapus Peserta',
      message: `Yakin ingin menghapus "${name}" dari daftar peserta?`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal'
    });
    if (yes) {
      setParticipants(participants.filter(p => p.id !== id));
      toast.success(`${name} berhasil dihapus`);
    }
  };

  const handleCleanLabels = () => {
    let changedCount = 0;
    const cleaned = participants.map(p => {
      const cleanName = stripLabelPrefix(p.name);
      const cleanBib = stripLabelPrefix(p.bibNumber);
      if (cleanName !== p.name || cleanBib !== (p.bibNumber || '')) changedCount++;
      return { ...p, name: cleanName, bibNumber: cleanBib };
    });
    if (changedCount === 0) {
      toast.info('Tidak ada label yang perlu dibersihkan.');
      return;
    }
    setParticipants(cleaned);
    toast.success(`${changedCount} data berhasil dibersihkan dari label seperti "Nama BIB:"`);
  };

  const handleDeleteAll = async () => {
    if (participants.length === 0) return;
    const yes = await confirm({
      title: 'Hapus Semua Peserta',
      message: `Yakin ingin menghapus SEMUA (${participants.length}) data peserta? Tindakan ini tidak bisa dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal'
    });
    if (yes) {
      setParticipants([]);
      toast.success('Semua data peserta berhasil dihapus');
    }
  };

  const togglePresence = (id) => {
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, isPresent: !p.isPresent } : p
    ));
  };

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.bibNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedParticipants = filteredParticipants.slice(0, showCount);

  const previewRowCount = 5;

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2>Data Peserta</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleCleanLabels} title='Hapus prefix label seperti "Nama BIB:" yang ikut terbawa di data'>
            <Eraser size={16} /> Bersihkan Label
          </button>
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            <Trash2 size={16} /> Hapus Semua
          </button>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button className="btn btn-secondary" onClick={() => !isImporting && fileInputRef.current?.click()} disabled={isImporting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isImporting ? 'Memproses...' : 'Import CSV/Excel'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
        style={{ opacity: isImporting ? 0.65 : 1, cursor: isImporting ? 'wait' : 'pointer' }}
        onDragEnter={!isImporting ? handleDrag : undefined}
        onDragLeave={!isImporting ? handleDrag : undefined}
        onDragOver={!isImporting ? handleDrag : undefined}
        onDrop={!isImporting ? handleDrop : undefined}
        onClick={() => !isImporting && fileInputRef.current?.click()}
      >
        {isImporting ? (
          <Loader2 size={36} className="animate-spin dropzone-icon" style={{ color: 'var(--primary)', animation: 'spinner-rotate 1s linear infinite' }} />
        ) : (
          <FileSpreadsheet size={32} className="dropzone-icon" />
        )}
        <p className="dropzone-text" style={{ fontWeight: isImporting ? 600 : 'normal' }}>
          {isImporting ? 'Sedang memproses impor data...' : dragActive ? 'Lepas file di sini...' : 'Drag & drop file CSV/Excel di sini'}
        </p>
        <span className="dropzone-hint">{isImporting ? 'Mohon tunggu sebentar' : 'atau klik untuk pilih file — kolom yang diambil bisa dipilih setelah file terbaca'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
        <div>
          <label className="form-label">Tambah Manual</label>
          <form onSubmit={handleAddManual} className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="No. BIB"
                style={{ maxWidth: '110px' }}
                value={newBibNumber}
                onChange={e => setNewBibNumber(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Nama BIB..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary"><Plus size={20} /></button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Cari Peserta</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Cari nama atau no. BIB..."
                style={{ paddingLeft: '40px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
            <label className="form-label">Tampilkan</label>
            <select className="form-select" value={showCount} onChange={e => setShowCount(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={participants.length}>Semua</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
        Total Peserta: <strong>{participants.length}</strong> |
        Hadir: <strong style={{ color: 'var(--success)' }}>{participants.filter(p => p.isPresent).length}</strong>
        {searchTerm && <> | Hasil: <strong>{filteredParticipants.length}</strong></>}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>No</th>
              <th style={{ width: '110px' }}>No. BIB</th>
              <th>Nama BIB</th>
              <th style={{ width: '150px' }}>Status Hadir</th>
              <th style={{ width: '100px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {displayedParticipants.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <EmptyState
                    type="participants"
                    title={searchTerm ? 'Tidak ditemukan' : 'Belum ada peserta'}
                    message={searchTerm ? `Tidak ada peserta dengan nama atau no. BIB "${searchTerm}"` : 'Tambahkan peserta secara manual atau import dari file CSV/Excel.'}
                  />
                </td>
              </tr>
            ) : displayedParticipants.map((p, idx) => (
              <tr key={p.id} className="table-row-animate" style={{ animationDelay: `${idx * 30}ms` }}>
                <td>{idx + 1}</td>
                <td><span className="participant-bib">{p.bibNumber || '-'}</span></td>
                <td><span className="participant-name">{p.name}</span></td>
                <td>
                  <label className="presence-toggle" onClick={() => togglePresence(p.id)}>
                    <div className={`toggle-switch mini ${p.isPresent ? 'active' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                    {p.isPresent ? <span className="status-hadir">Hadir</span> : <span className="status-absen">Absen</span>}
                  </label>
                </td>
                <td>
                  <button className="btn btn-danger btn-icon" onClick={() => handleDelete(p.id, p.name)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredParticipants.length > showCount && (
        <div className="show-more-bar">
          Menampilkan {showCount} dari {filteredParticipants.length} peserta
          <button className="btn-link" onClick={() => setShowCount(prev => prev + 25)}>
            Tampilkan lebih banyak
          </button>
        </div>
      )}

      {/* Sheet picker modal — for workbooks with multiple tabs, let the admin combine several into one import */}
      {sheetPicker && (
        <div className="confirm-overlay">
          <div className="confirm-dialog" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 className="confirm-title" style={{ marginBottom: 0 }}>Pilih Sheet yang Diimpor</h3>
              <button className="btn btn-icon" onClick={cancelSheetPicker} style={{ background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            <p className="confirm-message" style={{ marginBottom: '16px' }}>
              File <strong>{sheetPicker.fileName}</strong> punya {sheetPicker.sheets.length} sheet/tab. Centang satu atau beberapa sheet untuk digabung jadi satu daftar peserta — kolom Nomor BIB & Nama BIB akan dipilih di langkah berikutnya.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '320px', overflowY: 'auto' }}>
              {sheetPicker.sheets.map(s => {
                const rowCount = Math.max(cleanSheetRows(s.data).length - 1, 0);
                const checked = selectedSheetNames.has(s.name);
                return (
                  <label
                    key={s.name}
                    className="presence-toggle"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer', background: checked ? 'rgba(99,102,241,0.1)' : 'transparent' }}
                    onClick={() => toggleSheetSelection(s.name)}
                  >
                    <div className={`toggle-switch mini ${checked ? 'active' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                    <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rowCount} baris</span>
                  </label>
                );
              })}
            </div>

            <div className="confirm-actions">
              <button className="btn btn-secondary confirm-btn" onClick={cancelSheetPicker}>Batal</button>
              <button className="btn btn-primary confirm-btn" onClick={confirmSheetPicker} disabled={selectedSheetNames.size === 0}>
                <Check size={16} /> Lanjut ({selectedSheetNames.size} sheet dipilih)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column mapping modal — lets the user pick which raw sheet columns map to BIB number / BIB name */}
      {importPreview && (
        <div className="confirm-overlay">
          <div className="confirm-dialog" style={{ maxWidth: '640px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 className="confirm-title" style={{ marginBottom: 0 }}>Pilih Kolom yang Diimpor</h3>
              <button className="btn btn-icon" onClick={cancelImport} style={{ background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            <p className="confirm-message" style={{ marginBottom: '16px' }}>
              File <strong>{importPreview.fileName}</strong> berisi {importPreview.headers.length} kolom dan {importPreview.rows.length} baris data. Pilih kolom mana yang berisi Nomor BIB dan Nama BIB — kolom lain (alamat, finish time, dll) akan diabaikan.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kolom Nomor BIB (opsional)</label>
                <select
                  className="form-select"
                  value={bibNumberColIdx}
                  onChange={e => setBibNumberColIdx(Number(e.target.value))}
                >
                  <option value={-1}>— Tidak digunakan —</option>
                  {importPreview.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kolom Nama BIB</label>
                <select
                  className="form-select"
                  value={bibNameColIdx}
                  onChange={e => setBibNameColIdx(Number(e.target.value))}
                >
                  <option value={-1}>— Pilih kolom —</option>
                  {importPreview.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>No. BIB</th>
                    <th>Nama BIB</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, previewRowCount).map((row, i) => (
                    <tr key={i}>
                      <td>{bibNumberColIdx !== -1 ? stripLabelPrefix(row[bibNumberColIdx]) : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                      <td>{bibNameColIdx !== -1 ? stripLabelPrefix(row[bibNameColIdx]) : <span style={{ color: 'var(--text-muted)' }}>Pilih kolom nama BIB</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.rows.length > previewRowCount && (
                <div style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  + {importPreview.rows.length - previewRowCount} baris lainnya
                </div>
              )}
            </div>

            <div className="confirm-actions">
              <button className="btn btn-secondary confirm-btn" onClick={cancelImport}>Batal</button>
              <button className="btn btn-primary confirm-btn" onClick={confirmImport} disabled={bibNameColIdx === -1}>
                <Check size={16} /> Import {importPreview.rows.length} Peserta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Participants;
