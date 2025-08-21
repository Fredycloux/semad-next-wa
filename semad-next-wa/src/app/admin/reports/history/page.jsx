{patient && (
  <a
    href={`/api/admin/patients/${patient.id}/history/pdf`}
    target="_blank" rel="noopener"
    className="rounded-lg bg-violet-600 text-white px-4 py-2 hover:bg-violet-700"
  >
    Descargar PDF
  </a>
)}

