import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const getToday = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// ────────────────────────────────────────────────────────────
// Modal de confirmación de eliminación
// ────────────────────────────────────────────────────────────
function ConfirmModal({ isOpen, onCancel, onConfirm, employeeName }) {
  if (!isOpen) return null;
  return (
    <div className="ep-modal-overlay" onClick={onCancel}>
      <div className="ep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="ep-modal-title">¿Eliminar registro?</h3>
        <p className="ep-modal-text">
          Se eliminará el pago de <strong>{employeeName}</strong>. Esta acción no se puede deshacer.
        </p>
        <div className="ep-modal-actions">
          <button className="ep-btn ep-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="ep-btn ep-btn-danger" onClick={onConfirm}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Notificaciones Toast
// ────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="ep-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`ep-toast ep-toast-${t.type}`}>
          {t.type === "success" ? (
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// App principal
// ────────────────────────────────────────────────────────────
export default function App() {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(getToday());
  const [monto, setMonto] = useState("");
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState({ open: false, id: null, nombre: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pagos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      addToast("Error al cargar los datos", "error");
    } else {
      setPagos(data);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !fecha || !monto) {
      addToast("Todos los campos son obligatorios", "error");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("pagos").insert([{
      nombre, fecha, monto: parseFloat(monto),
    }]);
    if (error) {
      addToast("Error al guardar el pago", "error");
    } else {
      addToast(`Pago de ${nombre} guardado correctamente`);
      fetchPagos();
      setNombre(""); setFecha(""); setMonto("");
    }
    setSubmitting(false);
  };

  const confirmarEliminar = (id, nombre) => {
    setModal({ open: true, id, nombre });
  };

  const ejecutarEliminar = async () => {
    const { error } = await supabase.from("pagos").delete().eq("id", modal.id);
    setModal({ open: false, id: null, nombre: "" });
    if (error) {
      addToast("Error al eliminar el registro", "error");
    } else {
      addToast("Registro eliminado correctamente");
      fetchPagos();
    }
  };

  const formatoMoneda = (valor) =>
    Number(valor).toLocaleString("en-US", { style: "currency", currency: "USD" });

  const pagosFiltrados = pagos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resumenEmpleados = pagos.reduce((acc, pago) => {
    if (!acc[pago.nombre]) acc[pago.nombre] = { total: 0, dias: 0 };
    acc[pago.nombre].total += pago.monto;
    acc[pago.nombre].dias += 1;
    return acc;
  }, {});

  const totalGeneral = pagos.reduce((acc, curr) => acc + curr.monto, 0);

  // ── Exportar PDF con jsPDF (cargado desde CDN en index.html) ──
  const exportarPDF = () => {
    if (!window.jspdf) {
      addToast("jsPDF no está disponible aún, espera un momento", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFillColor(124, 58, 237);
    doc.rect(pageW - 60, 0, 60, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("Historial de Pagos", margin, 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const fecha_pdf = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Generado: ${fecha_pdf}`, pageW - margin, 18, { align: "right" });

    // Chips de estadísticas
    let y = 40;
    const chips = [
      { label: "TOTAL REGISTROS", value: String(pagos.length), color: [238, 242, 255], text: [79, 70, 229] },
      { label: "TOTAL GENERAL", value: formatoMoneda(totalGeneral), color: [240, 253, 244], text: [22, 163, 74] },
      { label: "EMPLEADOS", value: String(Object.keys(resumenEmpleados).length), color: [255, 247, 237], text: [234, 88, 12] },
    ];
    chips.forEach((c, i) => {
      const x = margin + i * 62;
      doc.setFillColor(...c.color);
      doc.roundedRect(x, y, 56, 17, 3, 3, "F");
      doc.setTextColor(...c.text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(c.label, x + 4, y + 6);
      doc.setFontSize(12);
      doc.text(c.value, x + 4, y + 14);
    });

    // Tabla historial
    y = 66;
    doc.setTextColor(30, 30, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detalle de Pagos", margin, y);
    y += 6;

    // Cabecera tabla
    const cols = [margin, margin + 65, margin + 110, margin + 152];
    const heads = ["Empleado", "Fecha", "Monto", "ID"];
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, y, pageW - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    heads.forEach((h, i) => doc.text(h, cols[i] + 2, y + 5.5));
    y += 8;

    const data = searchTerm ? pagosFiltrados : pagos;
    data.forEach((pago, idx) => {
      if (y > 265) { doc.addPage(); y = 20; }
      const bgEven = idx % 2 === 0;
      doc.setFillColor(bgEven ? 248 : 255, bgEven ? 249 : 255, bgEven ? 255 : 255);
      doc.rect(margin, y, pageW - margin * 2, 7.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 80);
      doc.text(pago.nombre, cols[0] + 2, y + 5);
      doc.text(pago.fecha || "—", cols[1] + 2, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text(formatoMoneda(pago.monto), cols[2] + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 180);
      doc.text(String(pago.id), cols[3] + 2, y + 5);
      y += 7.5;
    });

    // Fila de total
    if (y < 265) {
      y += 3;
      doc.setFillColor(238, 242, 255);
      doc.rect(margin, y, pageW - margin * 2, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text("TOTAL GENERAL", cols[0] + 2, y + 6);
      doc.setTextColor(22, 163, 74);
      doc.text(formatoMoneda(totalGeneral), cols[2] + 2, y + 6);
    }

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("Sistema de Gestión de Empleados", margin, pageH - 3.5);
    doc.text("Página 1", pageW - margin, pageH - 3.5, { align: "right" });

    doc.save(`pagos_${new Date().toISOString().slice(0, 10)}.pdf`);
    addToast("PDF exportado correctamente");
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        body, #root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #f1f5f9;
          color: #1e293b;
          min-height: 100vh;
          width: 100% !important;
          max-width: 100% !important;
          text-align: left;
          display: block;
          border: none;
        }
        .ep-shell {
          min-height: 100vh;
          background: linear-gradient(135deg, #eef2ff 0%, #f8faff 50%, #f0fdf4 100%);
          padding-bottom: 48px;
        }
        .ep-topbar {
          background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
          padding: 16px 32px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 4px 24px rgba(79,70,229,.28);
        }
        .ep-topbar-brand {
          display: flex; align-items: center; gap: 10px;
          color: #fff; font-weight: 700; font-size: 1.1rem; letter-spacing: -.3px;
        }
        .ep-topbar-tag {
          font-size: .7rem; background: rgba(255,255,255,.2); color: #fff;
          border-radius: 99px; padding: 3px 10px; font-weight: 600; letter-spacing: .5px;
        }
        .ep-container {
          max-width: 960px; margin: 0 auto; padding: 28px 20px 0;
        }
        /* Stats */
        .ep-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) { .ep-stats { grid-template-columns: 1fr; } }
        .ep-stat {
          background: #fff; border-radius: 14px; padding: 18px 20px;
          border: 1px solid #e8eaf6;
          box-shadow: 0 1px 8px rgba(99,102,241,.06);
        }
        .ep-stat-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; margin-bottom: 4px; }
        .ep-stat-value { font-size: 1.6rem; font-weight: 700; letter-spacing: -1px; }
        .ep-stat-sub { font-size: .74rem; color: #94a3b8; margin-top: 2px; }
        .ep-stat.indigo .ep-stat-value { color: #4f46e5; }
        .ep-stat.green  .ep-stat-value { color: #16a34a; }
        .ep-stat.orange .ep-stat-value { color: #ea580c; }
        /* Card */
        .ep-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(99,102,241,.07), 0 1px 4px rgba(0,0,0,.04);
          padding: 24px 24px 20px;
          margin-bottom: 20px;
          border: 1px solid #e8eaf6;
        }
        .ep-card-title {
          font-size: .95rem; font-weight: 700; color: #312e81;
          letter-spacing: -.2px; margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .ep-card-title svg { color: #6366f1; flex-shrink: 0; }
        /* Form */
        .ep-form {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 12px; align-items: end;
        }
        @media (max-width: 680px) { .ep-form { grid-template-columns: 1fr; } }
        .ep-field label { display: block; font-size: .75rem; font-weight: 600; color: #64748b; margin-bottom: 5px; }
        .ep-input {
          width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 9px 12px; font-family: inherit; font-size: .875rem; color: #1e293b;
          outline: none; transition: border .16s, box-shadow .16s; background: #f8fafc;
        }
        .ep-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.13); background: #fff; }
        .ep-input::placeholder { color: #cbd5e1; }
        .ep-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}
        /* Buttons */
        .ep-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; border-radius: 10px; font-family: inherit;
          font-size: .85rem; font-weight: 600; cursor: pointer;
          padding: 9px 16px; transition: all .16s; white-space: nowrap;
        }
        .ep-btn-primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff; box-shadow: 0 3px 12px rgba(99,102,241,.3);
        }
        .ep-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(99,102,241,.42); }
        .ep-btn-primary:disabled { opacity: .65; cursor: not-allowed; transform: none; }
        .ep-btn-ghost { background: #f1f5f9; color: #475569; }
        .ep-btn-ghost:hover { background: #e2e8f0; }
        .ep-btn-export {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: #fff; box-shadow: 0 3px 10px rgba(22,163,74,.28);
          padding: 8px 14px; font-size: .8rem;
        }
        .ep-btn-export:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(22,163,74,.38); }
        .ep-btn-del {
          background: #fff0f0; color: #dc2626; border: 1px solid #fecaca;
          padding: 5px 10px; font-size: .76rem; border-radius: 8px;
        }
        .ep-btn-del:hover { background: #fee2e2; }
        .ep-btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; box-shadow: 0 3px 10px rgba(220,38,38,.28);
        }
        .ep-btn-danger:hover { box-shadow: 0 5px 14px rgba(220,38,38,.4); }
        /* Table */
        .ep-table-wrap { overflow-x: auto; border-radius: 12px; border: 1.5px solid #e8eaf6; }
        .ep-table { width: 100%; border-collapse: collapse; font-size: .855rem; }
        .ep-table thead tr { background: linear-gradient(90deg, #eef2ff, #f5f3ff); }
        .ep-table th {
          padding: 10px 14px; text-align: left; font-size: .7rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #6366f1;
        }
        .ep-table tbody tr { border-top: 1px solid #f1f5f9; transition: background .1s; }
        .ep-table tbody tr:hover { background: #f8f9ff; }
        .ep-table td { padding: 10px 14px; color: #334155; vertical-align: middle; }
        .ep-name-cell { display: flex; align-items: center; gap: 8px; }
        .ep-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: #fff; font-size: .7rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ep-monto { font-weight: 700; color: #16a34a; }
        .ep-fecha { color: #64748b; font-size: .8rem; }
        .ep-empty { text-align: center; padding: 36px 0; color: #94a3b8; font-size: .875rem; }
        /* Search */
        .ep-search-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .ep-section-title { font-size: .95rem; font-weight: 700; color: #312e81; display: flex; align-items: center; gap: 8px; }
        .ep-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .ep-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .ep-search-input {
          width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 8px 12px 8px 33px; font-family: inherit; font-size: .855rem;
          outline: none; background: #f8fafc; transition: border .16s, box-shadow .16s;
        }
        .ep-search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.13); background: #fff; }
        /* Modal */
        .ep-modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,.5);
          backdrop-filter: blur(4px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: epFadeIn .15s ease;
        }
        .ep-modal {
          background: #fff; border-radius: 20px; padding: 30px 26px;
          max-width: 370px; width: 100%;
          box-shadow: 0 24px 64px rgba(0,0,0,.18);
          animation: epSlideUp .2s ease;
          text-align: center;
        }
        .ep-modal-icon {
          width: 54px; height: 54px; background: #fff7ed;
          border-radius: 50%; margin: 0 auto 16px;
          display: flex; align-items: center; justify-content: center;
          color: #ea580c;
        }
        .ep-modal-icon svg { width: 25px; height: 25px; }
        .ep-modal-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .ep-modal-text { font-size: .86rem; color: #64748b; line-height: 1.55; margin-bottom: 22px; }
        .ep-modal-text strong { color: #0f172a; }
        .ep-modal-actions { display: flex; gap: 10px; justify-content: center; }
        /* Toast */
        .ep-toast-container {
          position: fixed; bottom: 22px; right: 20px; z-index: 2000;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
        }
        .ep-toast {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 12px;
          font-size: .83rem; font-weight: 600; font-family: inherit;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          animation: epSlideUp .2s ease, epFadeOut .3s ease 3.2s forwards;
        }
        .ep-toast-success { background: #f0fdf4; color: #15803d; border: 1.5px solid #bbf7d0; }
        .ep-toast-error   { background: #fff0f0; color: #dc2626; border: 1.5px solid #fecaca; }
        /* Chip */
        .ep-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #eef2ff; color: #4f46e5;
          border-radius: 99px; padding: 3px 10px; font-size: .74rem; font-weight: 600;
        }
        /* Spinner */
        .ep-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff; border-radius: 50%;
          animation: epSpin .6s linear infinite;
        }
        /* Skeleton */
        .ep-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%; animation: epShimmer 1.2s infinite;
          border-radius: 8px; height: 14px; margin-bottom: 10px;
        }
        @keyframes epFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes epSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes epFadeOut { to { opacity: 0; transform: translateY(6px); } }
        @keyframes epSpin    { to { transform: rotate(360deg); } }
        @keyframes epShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="ep-shell">
        {/* Topbar */}
        <div className="ep-topbar">
          <div className="ep-topbar-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Gestión de Empleados
          </div>
          <span className="ep-topbar-tag">Supabase</span>
        </div>

        <div className="ep-container">

          {/* Stats */}
          <div className="ep-stats">
            <div className="ep-stat indigo">
              <div className="ep-stat-label">Total Registros</div>
              <div className="ep-stat-value">{pagos.length}</div>
              <div className="ep-stat-sub">pagos registrados</div>
            </div>
            <div className="ep-stat green">
              <div className="ep-stat-label">Total General</div>
              <div className="ep-stat-value">{formatoMoneda(totalGeneral)}</div>
              <div className="ep-stat-sub">acumulado total</div>
            </div>
            <div className="ep-stat orange">
              <div className="ep-stat-label">Empleados</div>
              <div className="ep-stat-value">{Object.keys(resumenEmpleados).length}</div>
              <div className="ep-stat-sub">únicos registrados</div>
            </div>
          </div>

          {/* Formulario */}
          <div className="ep-card">
            <div className="ep-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Nuevo Pago
            </div>
            <div className="ep-form">
              <div className="ep-field">
                <label>Nombre del empleado</label>
                <input
                  className="ep-input"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="ep-field">
                <label>Fecha de pago</label>
                <input
                  className="ep-input"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="ep-field">
                <label>Monto (USD)</label>
                <input
                  className="ep-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              <button
                className="ep-btn ep-btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ alignSelf: "flex-end" }}
              >
                {submitting ? <span className="ep-spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {submitting ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>

          {/* Resumen por empleado */}
          <div className="ep-card">
            <div className="ep-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Resumen por Empleado
            </div>
            <div className="ep-table-wrap">
              <table className="ep-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Días Trabajados</th>
                    <th>Total Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" style={{ padding: "16px" }}>
                      {[1, 2, 3].map(i => <div key={i} className="ep-skeleton" />)}
                    </td></tr>
                  ) : Object.keys(resumenEmpleados).length === 0 ? (
                    <tr><td colSpan="3" className="ep-empty">Sin datos disponibles</td></tr>
                  ) : (
                    Object.entries(resumenEmpleados).map(([nom, data]) => (
                      <tr key={nom}>
                        <td>
                          <div className="ep-name-cell">
                            <div className="ep-avatar">{nom.charAt(0).toUpperCase()}</div>
                            {nom}
                          </div>
                        </td>
                        <td>
                          <span className="ep-chip">
                            {data.dias} {data.dias === 1 ? "día" : "días"}
                          </span>
                        </td>
                        <td className="ep-monto">{formatoMoneda(data.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de pagos */}
          <div className="ep-card">
            <div className="ep-search-row">
              <div className="ep-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Historial de Pagos
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="ep-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    className="ep-search-input"
                    type="text"
                    placeholder="Buscar empleado…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="ep-btn ep-btn-export" onClick={exportarPDF}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="ep-table-wrap">
              <table className="ep-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" style={{ padding: "16px" }}>
                      {[1, 2, 3].map(i => <div key={i} className="ep-skeleton" />)}
                    </td></tr>
                  ) : pagosFiltrados.length === 0 ? (
                    <tr><td colSpan="4" className="ep-empty">
                      {searchTerm ? `Sin resultados para "${searchTerm}"` : "No hay registros aún"}
                    </td></tr>
                  ) : (
                    pagosFiltrados.map((pago) => (
                      <tr key={pago.id}>
                        <td>
                          <div className="ep-name-cell">
                            <div className="ep-avatar">{pago.nombre.charAt(0).toUpperCase()}</div>
                            {pago.nombre}
                          </div>
                        </td>
                        <td className="ep-fecha">{pago.fecha}</td>
                        <td className="ep-monto">{formatoMoneda(pago.monto)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="ep-btn ep-btn-del"
                            onClick={() => confirmarEliminar(pago.id, pago.nombre)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={modal.open}
        onCancel={() => setModal({ open: false, id: null, nombre: "" })}
        onConfirm={ejecutarEliminar}
        employeeName={modal.nombre}
      />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </>
  );
}
