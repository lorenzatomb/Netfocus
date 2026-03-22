import { useState, useRef } from "react";

// ============================================================================
// PROMPT OTIMIZADO
// ============================================================================
const SYSTEM_PROMPT = `Converta datasheet para edital público brasileiro. Regras: reescrever (não copiar), preservar dados numéricos, iniciar com "deverá possuir/apresentar/ser", priorizar specs críticas. JSON puro:{"nome_produto":"","objeto":"","codigo_br":"","unidade":"UN","especificacoes":[{"item":"","descricao":"deverá..."}],"requisitos_gerais":[],"normas_tecnicas":[],"garantia":"","observacoes":""}`;

// ============================================================================
// UTILITÁRIOS
// ============================================================================
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const parseJSON = (text) => {
  // Remove markdown e encontra JSON
  let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  // Tenta encontrar o JSON
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado");
  
  // Limpa caracteres problemáticos
  let jsonStr = match[0]
    .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control chars
    .replace(/,\s*}/g, '}')           // Remove trailing commas
    .replace(/,\s*]/g, ']');
  
  return JSON.parse(jsonStr);
};

// ============================================================================
// EXPORTAR DOC CONSOLIDADO
// ============================================================================
const exportConsolidatedDoc = (results) => {
  const productsHtml = results.map((r, idx) => `
    <div style="page-break-before: ${idx > 0 ? 'always' : 'auto'}">
      <h2 style="background:#e8f5e0;padding:10px;border-left:4px solid #A4D233;font-size:14pt;margin-top:${idx > 0 ? '40px' : '20px'}">
        ITEM ${idx + 1}: ${r.nome_produto || 'PRODUTO'}
      </h2>
      <p><strong>OBJETO:</strong> ${r.objeto}</p>
      ${r.codigo_br ? `<p><strong>CÓDIGO:</strong> ${r.codigo_br}</p>` : ''}
      <p><strong>UNIDADE:</strong> ${r.unidade || 'UN'}</p>
      
      <h3 style="font-size:12pt;margin-top:15px;border-bottom:2px solid #A4D233;padding-bottom:5px;color:#333">ESPECIFICAÇÕES TÉCNICAS</h3>
      ${r.especificacoes?.map((s, i) => `
        <p style="margin-left:20px">
          <strong>${i + 1}. ${s.item?.toUpperCase() || ''}</strong><br/>
          ${s.descricao || ''}
        </p>
      `).join('') || '<p>-</p>'}
      
      ${r.requisitos_gerais?.length ? `
        <h3 style="font-size:12pt;margin-top:15px;border-bottom:2px solid #A4D233;padding-bottom:5px;color:#333">REQUISITOS GERAIS</h3>
        <ol style="margin-left:20px">${r.requisitos_gerais.map(req => `<li>${req}</li>`).join('')}</ol>
      ` : ''}
      
      ${r.normas_tecnicas?.length ? `
        <h3 style="font-size:12pt;margin-top:15px;border-bottom:2px solid #A4D233;padding-bottom:5px;color:#333">NORMAS TÉCNICAS APLICÁVEIS</h3>
        <ul style="margin-left:20px">${r.normas_tecnicas.map(n => `<li>${n}</li>`).join('')}</ul>
      ` : ''}
      
      ${r.garantia ? `<p><strong>GARANTIA:</strong> ${r.garantia}</p>` : ''}
      ${r.observacoes ? `<p><strong>OBSERVAÇÕES:</strong> ${r.observacoes}</p>` : ''}
    </div>
  `).join('\n');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>Especificações Técnicas - Netfocus</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
    h1 { text-align: center; font-size: 16pt; border-bottom: 3px solid #A4D233; padding-bottom: 10px; color: #1A2B45; }
    h2 { color: #1A2B45; }
    h3 { color: #333; }
    p { margin: 8px 0; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:20px">
    <span style="font-size:24pt;font-weight:bold;color:#1A2B45">Netfocus</span>
    <span style="font-size:8pt;color:#A4D233;letter-spacing:2px;margin-left:5px">ENTERPRISE SERVICES</span>
  </div>
  <h1>ESPECIFICAÇÕES TÉCNICAS PARA EDITAL</h1>
  <p style="text-align:center;color:#666;margin-bottom:30px">
    Total de itens: ${results.length} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}
  </p>
  ${productsHtml}
</body>
</html>`;
  
  const blob = new Blob([html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `especificacoes_edital_${results.length}_itens.doc`;
  a.click();
};

// ============================================================================
// ESTILOS - Identidade Visual Netfocus
// ============================================================================
const colors = {
  primary: "#A4D233",      // Verde Netfocus
  primaryDark: "#8BBF2A",
  bg: "#0A1628",           // Azul escuro
  bgLight: "#122035",
  bgCard: "#1A2B45",
  border: "#2A3F5F",
  text: "#FFFFFF",
  textMuted: "#8FA3BF",
  error: "#EF4444",
  warning: "#EAB308"
};

// Logo Netfocus SVG
const NetfocusLogo = () => (
  <svg viewBox="0 0 200 50" style={{ height: "40px" }}>
    <g transform="translate(0, 5)">
      <path d="M5 30 L18 22 L18 8 L31 16 L31 30 L18 38 Z" fill={colors.primary} opacity="0.9"/>
      <path d="M18 8 L31 0 L44 8 L31 16 Z" fill={colors.primary}/>
      <path d="M31 16 L44 8 L44 22 L31 30 Z" fill={colors.primary} opacity="0.7"/>
    </g>
    <text x="52" y="26" fill="#FFFFFF" fontSize="20" fontWeight="700" fontFamily="system-ui">Netfocus</text>
    <text x="52" y="40" fill={colors.primary} fontSize="7" fontWeight="600" letterSpacing="1.5" fontFamily="system-ui">ENTERPRISE SERVICES</text>
  </svg>
);

const s = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(145deg, ${colors.bg}, ${colors.bgLight})`,
    fontFamily: "system-ui, sans-serif",
    padding: "1.5rem",
    color: colors.text
  },
  wrap: { maxWidth: "900px", margin: "0 auto" },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "0.75rem"
  },
  appTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: colors.primary,
    textAlign: "center"
  },
  sub: { textAlign: "center", color: colors.textMuted, fontSize: "0.85rem" },
  dropzone: (drag) => ({
    background: drag ? `rgba(164,210,51,0.1)` : colors.bgCard,
    border: `2px dashed ${drag ? colors.primary : colors.border}`,
    borderRadius: "12px",
    padding: "2rem",
    textAlign: "center",
    marginBottom: "1rem",
    cursor: "pointer",
    transition: "all 0.2s"
  }),
  fileList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "1rem"
  },
  fileItem: (status) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    background: status === 'done' ? "rgba(164,210,51,0.15)" : 
                status === 'error' ? "rgba(239,68,68,0.15)" :
                status === 'processing' ? "rgba(164,210,51,0.08)" : colors.bgCard,
    border: `1px solid ${status === 'done' ? colors.primary : 
                         status === 'error' ? colors.error :
                         status === 'processing' ? colors.primary : colors.border}`,
    borderRadius: "8px",
    animation: status === 'processing' ? "pulse 1s infinite" : "none"
  }),
  btnMain: (disabled) => ({
    width: "100%",
    padding: "1rem",
    background: disabled ? colors.border : colors.primary,
    border: "none",
    borderRadius: "8px",
    color: disabled ? colors.textMuted : colors.bg,
    fontSize: "1rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer"
  }),
  btnSec: {
    padding: "0.5rem 1rem",
    background: "transparent",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    color: colors.text,
    fontSize: "0.85rem",
    cursor: "pointer"
  },
  resultCard: {
    background: colors.bgCard,
    borderRadius: "12px",
    padding: "1.25rem",
    border: `1px solid ${colors.border}`,
    marginTop: "1.5rem"
  },
  spec: {
    background: colors.bgLight,
    borderRadius: "6px",
    padding: "0.75rem",
    marginBottom: "0.5rem",
    borderLeft: `3px solid ${colors.primary}`
  },
  label: { color: colors.textMuted, fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "0.4rem" },
  tag: {
    display: "inline-block",
    background: "rgba(164,210,51,0.15)",
    border: `1px solid ${colors.primary}`,
    borderRadius: "4px",
    padding: "0.2rem 0.5rem",
    fontSize: "0.75rem",
    color: colors.primary,
    marginRight: "0.4rem",
    marginBottom: "0.4rem"
  },
  productHeader: {
    background: "rgba(164,210,51,0.1)",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    borderLeft: "4px solid #38bdf8"
  }
};

// ============================================================================
// APP
// ============================================================================
export default function EditalApp() {
  const [files, setFiles] = useState([]); // { file, status: 'pending'|'processing'|'done'|'error', result, error }
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const addFiles = (newFiles) => {
    const pdfFiles = Array.from(newFiles).filter(f => f.type === "application/pdf");
    const startIndex = files.length;
    const mapped = pdfFiles.map(f => ({ file: f, status: 'pending', result: null, error: null }));
    setFiles(prev => [...prev, ...mapped]);
    
    // Auto-processa TODOS imediatamente em paralelo
    pdfFiles.forEach((f, i) => {
      processFileDirect(f, startIndex + i);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setFiles([]);

  // Processa direto sem depender do state
  const processFileDirect = async (file, index) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'processing' } : f));

    try {
      const base64 = await fileToBase64(file);
      
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: "Converter para edital:" }
            ]
          }]
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const txt = data.content?.map(c => c.text || "").join("") || "";
      const parsed = parseJSON(txt);
      
      if (!parsed.objeto) throw new Error("Dados incompletos");
      
      if (!parsed.nome_produto) {
        parsed.nome_produto = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      }

      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'done', result: parsed } : f));
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error', error: err.message } : f));
    }
  };

  const retryFile = (index) => {
    const f = files[index];
    if (f?.file) processFileDirect(f.file, index);
  };

  const exportAll = () => {
    const doneResults = files.filter(f => f.status === 'done').map(f => f.result);
    if (doneResults.length > 0) {
      exportConsolidatedDoc(doneResults);
    }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const progress = files.length > 0 ? ((doneCount + errorCount) / files.length) * 100 : 0;

  return (
    <div style={s.page}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.6 } }`}</style>
      <div style={s.wrap}>
        {/* Header com Logo Netfocus */}
        <div style={s.header}>
          <NetfocusLogo />
          <div style={s.appTitle}>Gerador de Especificações para Edital</div>
          <p style={s.sub}>Múltiplos datasheets → DOC único para licitação</p>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          style={s.dropzone(drag)}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚡</div>
          <div style={{ color: colors.textMuted, marginBottom: "0.5rem" }}>
            Arraste PDFs aqui — processamento automático
          </div>
          <div style={{ color: colors.primary, fontSize: "0.8rem" }}>
            Todos processam em paralelo instantaneamente
          </div>
          <input 
            ref={fileRef} 
            type="file" 
            accept=".pdf" 
            multiple 
            onChange={(e) => addFiles(e.target.files)} 
            hidden 
          />
        </div>

        {/* Lista de arquivos */}
        {files.length > 0 && (
          <div style={s.fileList}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                {files.length} arquivo(s) • {doneCount} processado(s)
              </span>
              <button onClick={clearAll} style={{ ...s.btnSec, padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
                Limpar tudo
              </button>
            </div>

            {files.map((f, i) => (
              <div key={i} style={s.fileItem(f.status)}>
                <span style={{ fontSize: "1.25rem" }}>
                  {f.status === 'done' ? '✅' : f.status === 'error' ? '❌' : f.status === 'processing' ? '⏳' : '📄'}
                </span>
                <span style={{ flex: 1, fontSize: "0.9rem", color: colors.text }}>
                  {f.file.name}
                </span>
                {f.status === 'error' && (
                  <button onClick={() => retryFile(i)} style={{ ...s.btnSec, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                    Tentar novamente
                  </button>
                )}
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer" }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botão exportar */}
        {doneCount > 0 && (
          <button 
            onClick={exportAll} 
            style={{ 
              ...s.btnMain(false), 
              marginTop: "1rem"
            }}
          >
            📥 Exportar DOC ({doneCount} {doneCount === 1 ? 'item' : 'itens'})
          </button>
        )}

        {/* Erro geral */}
        {errorCount > 0 && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(234,179,8,0.1)", border: "1px solid #eab308", borderRadius: "8px", color: "#fde68a", fontSize: "0.85rem" }}>
            ⚠️ {errorCount} arquivo(s) com erro. Clique em "Tentar novamente" para reprocessar.
          </div>
        )}

        {/* Preview dos resultados */}
        {doneCount > 0 && (
          <div style={s.resultCard}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: colors.primary }}>
              📋 Preview ({doneCount} produto{doneCount > 1 ? 's' : ''})
            </h2>

            {files.filter(f => f.status === 'done').map((f, idx) => (
              <details key={idx} style={{ marginBottom: "1rem" }}>
                <summary style={{ 
                  cursor: "pointer", 
                  padding: "0.75rem", 
                  background: "rgba(164,210,51,0.1)", 
                  borderRadius: "8px",
                  color: colors.primary,
                  fontWeight: 600
                }}>
                  Item {idx + 1}: {f.result.nome_produto}
                </summary>
                
                <div style={{ padding: "1rem", background: colors.bgLight, borderRadius: "0 0 8px 8px", marginTop: "-4px" }}>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={s.label}>Objeto</div>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>{f.result.objeto}</p>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={s.label}>Especificações ({f.result.especificacoes?.length || 0})</div>
                    {f.result.especificacoes?.slice(0, 3).map((spec, i) => (
                      <div key={i} style={s.spec}>
                        <div style={{ fontWeight: 600, color: colors.primary, fontSize: "0.8rem" }}>{spec.item}</div>
                        <div style={{ color: colors.textMuted, fontSize: "0.8rem" }}>{spec.descricao}</div>
                      </div>
                    ))}
                    {f.result.especificacoes?.length > 3 && (
                      <div style={{ color: colors.textMuted, fontSize: "0.8rem", marginTop: "0.5rem" }}>
                        + {f.result.especificacoes.length - 3} especificações...
                      </div>
                    )}
                  </div>

                  {f.result.normas_tecnicas?.length > 0 && (
                    <div>
                      <div style={s.label}>Normas</div>
                      {f.result.normas_tecnicas.map((n, i) => <span key={i} style={s.tag}>{n}</span>)}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        <footer style={{ textAlign: "center", marginTop: "2rem", color: colors.border, fontSize: "0.75rem" }}>
          Lei nº 14.133/2021 — Nova Lei de Licitações
        </footer>
      </div>
    </div>
  );
}
