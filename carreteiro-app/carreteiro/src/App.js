import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const STATUS_OPTIONS = ['CAUTELA EXTRAVIADA','CONFERIDA','PENDENTE','OK']

const badgeClass = (s) => {
  if (s === 'CAUTELA EXTRAVIADA') return 'badge extraviada'
  if (s === 'CONFERIDA') return 'badge conferida'
  if (s === 'PENDENTE') return 'badge pendente'
  return 'badge ok'
}

const EMPTY_FORM = { data:'', cliente:'', quantidade:1, status:'CAUTELA EXTRAVIADA', cautela:'', motorista:'', observacoes:'' }

// Calendário completo com dias — formulário
function CalendarioDia({ value, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [nav, setNav] = useState(() => {
    if (value) { const [a,m] = value.split('-'); return { ano:Number(a), mes:Number(m)-1 } }
    const h = new Date(); return { ano:h.getFullYear(), mes:h.getMonth() }
  })
  const ref = useRef()

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const label = value ? new Date(value+'T12:00:00').toLocaleDateString('pt-BR') : 'Selecionar data'
  const primeiroDia = new Date(nav.ano, nav.mes, 1).getDay()
  const ultimoDia = new Date(nav.ano, nav.mes+1, 0).getDate()

  const navMes = (delta) => setNav(prev => {
    let m = prev.mes+delta, a = prev.ano
    if (m < 0) { m=11; a-- }
    if (m > 11) { m=0; a++ }
    return { ano:a, mes:m }
  })

  const selecionar = (dia) => {
    const m = String(nav.mes+1).padStart(2,'0')
    const d = String(dia).padStart(2,'0')
    onChange(`${nav.ano}-${m}-${d}`)
    setAberto(false)
  }

  const ehSel = (dia) => {
    if (!value) return false
    const m = String(nav.mes+1).padStart(2,'0')
    const d = String(dia).padStart(2,'0')
    return value === `${nav.ano}-${m}-${d}`
  }

  const ehHoje = (dia) => {
    const h = new Date()
    return h.getFullYear()===nav.ano && h.getMonth()===nav.mes && h.getDate()===dia
  }

  const cells = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= ultimoDia; d++) cells.push(d)

  return (
    <div className="cal-wrap" ref={ref}>
      <button type="button" className="btn-cal-input" onClick={() => setAberto(v => !v)}>
        {label} <span className="cal-arrow">▾</span>
      </button>
      {aberto && (
        <div className="cal-dropdown">
          <div className="cal-nav">
            <button type="button" onClick={() => navMes(-1)}>‹</button>
            <span>{MESES_PT[nav.mes]} {nav.ano}</span>
            <button type="button" onClick={() => navMes(1)}>›</button>
          </div>
          <div className="cal-grid">
            {DIAS_PT.map(d => <div key={d} className="cal-head">{d}</div>)}
            {cells.map((dia, i) => (
              <div
                key={i}
                className={`cal-day${!dia?' vazio':''}${dia&&ehSel(dia)?' selecionado':''}${dia&&ehHoje(dia)?' hoje':''}`}
                onClick={() => dia && selecionar(dia)}
              >{dia||''}</div>
            ))}
          </div>
          <div className="cal-footer">
            <button type="button" onClick={() => {
              const h = new Date()
              setNav({ ano:h.getFullYear(), mes:h.getMonth() })
              selecionar(h.getDate())
            }}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Seletor header: passo 1 = mes/ano, passo 2 = dias
function SeletorMes({ mes, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [passo, setPasso] = useState(1)
  const parts = mes.split('-').map(Number)
  const [navAno, setNavAno] = useState(() => parts[0])
  const [navMesIdx, setNavMesIdx] = useState(() => parts[1] - 1)
  const ref = useRef()

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) { setAberto(false); setPasso(1) } }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const partsAtual = mes.split('-').map(Number)
  const anoSel = partsAtual[0], mesSel = partsAtual[1], diaSel = partsAtual[2] || null

  const labelMes = diaSel
    ? new Date(mes + 'T12:00:00').toLocaleDateString('pt-BR')
    : `${MESES_PT[mesSel-1]} de ${anoSel}`

  const selMes = (i) => { setNavMesIdx(i); setPasso(2) }

  const selDia = (dia) => {
    const m = String(navMesIdx + 1).padStart(2, '0')
    const d = String(dia).padStart(2, '0')
    onChange(`${navAno}-${m}-${d}`)
    setAberto(false); setPasso(1)
  }

  const primeiroDia = new Date(navAno, navMesIdx, 1).getDay()
  const ultimoDia = new Date(navAno, navMesIdx + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= ultimoDia; d++) cells.push(d)

  const ehSel = (dia) => diaSel && anoSel === navAno && mesSel - 1 === navMesIdx && diaSel === dia
  const ehHoje = (dia) => {
    const h = new Date()
    return h.getFullYear() === navAno && h.getMonth() === navMesIdx && h.getDate() === dia
  }

  return (
    <div className="cal-wrap" ref={ref}>
      <button type="button" className="btn-cal-trigger" onClick={() => { setAberto(v => !v); setPasso(1) }}>
        {labelMes} <span className="cal-arrow">▾</span>
      </button>
      {aberto && passo === 1 && (
        <div className="cal-dropdown cal-mes-ano">
          <div className="cal-nav">
            <button type="button" onClick={() => setNavAno(a => a-1)}>‹</button>
            <span>{navAno}</span>
            <button type="button" onClick={() => setNavAno(a => a+1)}>›</button>
          </div>
          <div className="cal-meses-grid">
            {MESES_PT.map((nm, i) => (
              <div
                key={i}
                className={`cal-mes-item${i===mesSel-1&&navAno===anoSel?' selecionado':''}`}
                onClick={() => selMes(i)}
              >{nm.slice(0,3)}</div>
            ))}
          </div>
        </div>
      )}
      {aberto && passo === 2 && (
        <div className="cal-dropdown">
          <div className="cal-nav">
            <button type="button" onClick={() => setPasso(1)}>‹</button>
            <span>{MESES_PT[navMesIdx]} {navAno}</span>
            <button type="button" onClick={() => { let m=navMesIdx+1,a=navAno; if(m>11){m=0;a++}; setNavMesIdx(m); setNavAno(a) }}>›</button>
          </div>
          <div className="cal-grid">
            {DIAS_PT.map(d => <div key={d} className="cal-head">{d}</div>)}
            {cells.map((dia, i) => (
              <div
                key={i}
                className={`cal-day${!dia?' vazio':''} ${dia&&ehSel(dia)?' selecionado':''} ${dia&&ehHoje(dia)?' hoje':''}`}
                onClick={() => dia && selDia(dia)}
              >{dia||''}</div>
            ))}
          </div>
          <div className="cal-footer">
            <button type="button" onClick={() => { const h=new Date(); setNavAno(h.getFullYear()); setNavMesIdx(h.getMonth()); selDia(h.getDate()) }}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [registros, setRegistros] = useState([])
  const [filtrados, setFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    const partes = mes.split('-')
    const ano = partes[0], m = partes[1]
    const inicio = `${ano}-${m}-01`
    const ultimoDia = new Date(Number(ano), Number(m), 0).getDate()
    const fim = `${ano}-${m}-${String(ultimoDia).padStart(2,'0')}`
    const { data, error } = await supabase
      .from('registros').select('*')
      .gte('data', inicio).lte('data', fim)
      .order('data', { ascending: false })
    if (error) setErro('Erro ao carregar: ' + error.message)
    else { setRegistros(data || []); setErro('') }
    setLoading(false)
  }, [mes])

  useEffect(() => { fetchRegistros() }, [fetchRegistros])

  useEffect(() => {
    let lista = registros
    if (busca) {
      const b = busca.toLowerCase()
      lista = lista.filter(r =>
        r.motorista?.toLowerCase().includes(b) ||
        r.cliente?.toLowerCase().includes(b) ||
        r.cautela?.toLowerCase().includes(b)
      )
    }
    if (filtroStatus) lista = lista.filter(r => r.status === filtroStatus)
    setFiltrados(lista)
  }, [registros, busca, filtroStatus])

  const abrirNovo = () => {
    setEditando(null); setForm(EMPTY_FORM); setFotoFile(null); setFotoPreview(''); setModalAberto(true)
  }

  const abrirEditar = (r) => {
    setEditando(r.id)
    setForm({ data:r.data, cliente:r.cliente||'', quantidade:r.quantidade||1, status:r.status||'CAUTELA EXTRAVIADA', cautela:r.cautela||'', motorista:r.motorista||'', observacoes:r.observacoes||'' })
    setFotoPreview(r.foto_url||''); setFotoFile(null); setModalAberto(true)
  }

  const fecharModal = () => { setModalAberto(false); setErro('') }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file); setFotoPreview(URL.createObjectURL(file))
  }

  const uploadFoto = async (file) => {
    const ext = file.name.split('.').pop()
    const nome = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos-cautelas').upload(nome, file, { upsert:true })
    if (error) throw error
    const { data } = supabase.storage.from('fotos-cautelas').getPublicUrl(nome)
    return data.publicUrl
  }

  const salvar = async () => {
    if (!form.data || !form.cliente || !form.motorista) { setErro('Preencha data, cliente e motorista.'); return }
    setSalvando(true); setErro('')
    try {
      let foto_url = fotoPreview && !fotoFile ? fotoPreview : ''
      if (fotoFile) foto_url = await uploadFoto(fotoFile)
      const payload = { data:form.data, cliente:form.cliente.toUpperCase(), quantidade:Number(form.quantidade), status:form.status, cautela:form.cautela, motorista:form.motorista.toUpperCase(), observacoes:form.observacoes, foto_url }
      if (editando) {
        const { error } = await supabase.from('registros').update(payload).eq('id', editando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('registros').insert([payload])
        if (error) throw error
      }
      await fetchRegistros(); fecharModal()
    } catch (e) { setErro('Erro ao salvar: ' + e.message) }
    setSalvando(false)
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir este registro?')) return
    await supabase.from('registros').delete().eq('id', id)
    await fetchRegistros()
  }

  const total = registros.length
  const extraviadas = registros.filter(r => r.status === 'CAUTELA EXTRAVIADA').length
  const conferidas = registros.filter(r => r.status === 'CONFERIDA' || r.status === 'OK').length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Controle de Descontos</h1>
          <span className="subtitle">Carreteiro</span>
        </div>
        <div className="header-right">
          <SeletorMes mes={mes} onChange={setMes} />
          <button className="btn-primary" onClick={abrirNovo}>+ Novo registro</button>
        </div>
      </header>

      <div className="stats">
        <div className="stat"><span className="stat-label">Total</span><span className="stat-value">{total}</span></div>
        <div className="stat danger"><span className="stat-label">Extraviadas</span><span className="stat-value">{extraviadas}</span></div>
        <div className="stat success"><span className="stat-label">Conferidas / OK</span><span className="stat-value">{conferidas}</span></div>
      </div>

      <div className="filters">
        <input className="input-busca" type="text" placeholder="Buscar motorista, cliente ou cautela..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {erro && !modalAberto && <div className="erro-bar">{erro}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="vazio">Nenhum registro encontrado para este período.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Cliente</th><th>Qtd</th><th>Status</th><th>Cautela</th><th>Motorista</th><th>Foto</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map(r => (
                <tr key={r.id}>
                  <td>{r.data ? new Date(r.data+'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{r.cliente}</td>
                  <td className="center">{r.quantidade}</td>
                  <td><span className={badgeClass(r.status)}>{r.status}</span></td>
                  <td>{r.cautela}</td>
                  <td>{r.motorista}</td>
                  <td className="center">
                    {r.foto_url ? <a href={r.foto_url} target="_blank" rel="noreferrer" className="link-foto">Ver</a> : <span className="sem-foto">—</span>}
                  </td>
                  <td className="acoes">
                    <button className="btn-icon" onClick={() => abrirEditar(r)}>✏️</button>
                    <button className="btn-icon danger" onClick={() => excluir(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editando ? 'Editar registro' : 'Novo registro'}</h2>
              <button className="btn-fechar" onClick={fecharModal}>✕</button>
            </div>
            {erro && <div className="erro-bar">{erro}</div>}
            <div className="form-grid">
              <div className="field">
                <label>Data *</label>
                <CalendarioDia value={form.data} onChange={v => setForm({ ...form, data:v })} />
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" min="1" value={form.quantidade} onChange={e => setForm({ ...form, quantidade:e.target.value })} />
              </div>
              <div className="field">
                <label>Cliente *</label>
                <input type="text" placeholder="Ex: EFFA" value={form.cliente} onChange={e => setForm({ ...form, cliente:e.target.value })} />
              </div>
              <div className="field">
                <label>Nº da cautela</label>
                <input type="text" placeholder="Ex: 229747" value={form.cautela} onChange={e => setForm({ ...form, cautela:e.target.value })} />
              </div>
            </div>
            <div className="field full">
              <label>Motorista *</label>
              <input type="text" placeholder="Nome completo" value={form.motorista} onChange={e => setForm({ ...form, motorista:e.target.value })} />
            </div>
            <div className="field full">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status:e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Observações</label>
              <textarea placeholder="Detalhes adicionais..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes:e.target.value })} rows={3} />
            </div>
            <div className="field full">
              <label>Foto da cautela</label>
              <label className="file-area">
                {fotoPreview ? <img src={fotoPreview} alt="preview" className="foto-preview" /> : <span>Clique para anexar imagem (JPG, PNG)</span>}
                <input type="file" accept="image/*" onChange={handleFoto} style={{ display:'none' }} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar registro'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
