import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const STATUS_OPTIONS = ['CAUTELA EXTRAVIADA','CONFERIDA','PENDENTE','OK']

const fmt = (iso) => iso ? new Date(iso+'T12:00:00').toLocaleDateString('pt-BR') : ''
const hoje = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}` }

const badgeClass = (s) => {
  if (s === 'CAUTELA EXTRAVIADA') return 'badge extraviada'
  if (s === 'CONFERIDA') return 'badge conferida'
  if (s === 'PENDENTE') return 'badge pendente'
  return 'badge ok'
}

const EMPTY_FORM = { data:'', cliente:'', quantidade:1, status:'CAUTELA EXTRAVIADA', cautela:'', motorista:'', observacoes:'' }

// Mini calendário reutilizável (inline, sem dropdown)
function MiniCal({ value, dataMin, dataMax, onChange }) {
  const init = () => {
    if (value) { const [a,m] = value.split('-'); return { ano:Number(a), mes:Number(m)-1 } }
    const h = new Date(); return { ano:h.getFullYear(), mes:h.getMonth() }
  }
  const [nav, setNav] = useState(init)

  const navMes = (delta) => setNav(prev => {
    let m = prev.mes+delta, a = prev.ano
    if (m < 0) { m=11; a-- }
    if (m > 11) { m=0; a++ }
    return { ano:a, mes:m }
  })

  const primeiroDia = new Date(nav.ano, nav.mes, 1).getDay()
  const ultimoDia = new Date(nav.ano, nav.mes+1, 0).getDate()
  const cells = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= ultimoDia; d++) cells.push(d)

  const toIso = (dia) => `${nav.ano}-${String(nav.mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`

  const ehSel = (dia) => value === toIso(dia)
  const ehHoje = (dia) => hoje() === toIso(dia)
  const ehDisabled = (dia) => {
    const iso = toIso(dia)
    if (dataMin && iso < dataMin) return true
    if (dataMax && iso > dataMax) return true
    return false
  }

  return (
    <div className="mini-cal">
      <div className="cal-nav">
        <button type="button" onClick={() => navMes(-1)}>‹</button>
        <span>{MESES_PT[nav.mes]} {nav.ano}</span>
        <button type="button" onClick={() => navMes(1)}>›</button>
      </div>
      <div className="cal-grid">
        {DIAS_PT.map(d => <div key={d} className="cal-head">{d}</div>)}
        {cells.map((dia, i) => {
          const dis = dia && ehDisabled(dia)
          return (
            <div
              key={i}
              className={`cal-day${!dia?' vazio':''}${dia&&ehSel(dia)?' selecionado':''}${dia&&ehHoje(dia)?' hoje':''}${dis?' desabilitado':''}`}
              onClick={() => dia && !dis && onChange(toIso(dia))}
            >{dia||''}</div>
          )
        })}
      </div>
    </div>
  )
}

// Calendário com dropdown — formulário
function CalendarioDia({ value, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  return (
    <div className="cal-wrap" ref={ref}>
      <button type="button" className="btn-cal-input" onClick={() => setAberto(v => !v)}>
        {value ? fmt(value) : 'Selecionar data'} <span className="cal-arrow">▾</span>
      </button>
      {aberto && (
        <div className="cal-dropdown">
          <MiniCal value={value} onChange={(v) => { onChange(v); setAberto(false) }} />
          <div className="cal-footer">
            <button type="button" onClick={() => { onChange(hoje()); setAberto(false) }}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Seletor mês+ano header — dois passos
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
  const labelMes = diaSel ? fmt(mes) : `${MESES_PT[mesSel-1]} de ${anoSel}`

  const selDia = (dia) => {
    const m = String(navMesIdx+1).padStart(2,'0'), d = String(dia).padStart(2,'0')
    onChange(`${navAno}-${m}-${d}`); setAberto(false); setPasso(1)
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
              <div key={i} className={`cal-mes-item${i===mesSel-1&&navAno===anoSel?' selecionado':''}`}
                onClick={() => { setNavMesIdx(i); setPasso(2) }}>{nm.slice(0,3)}</div>
            ))}
          </div>
        </div>
      )}
      {aberto && passo === 2 && (
        <div className="cal-dropdown">
          <MiniCal
            value={diaSel ? mes : null}
            onChange={selDia}
          />
          <div className="cal-footer">
            <button type="button" onClick={() => setPasso(1)}>← Voltar</button>
            <button type="button" onClick={() => { const h=new Date(); setNavAno(h.getFullYear()); setNavMesIdx(h.getMonth()); selDia(h.getDate()) }}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Painel de filtro de período
function FiltroPeriodo({ dataInicio, dataFim, onAplicar, onLimpar }) {
  const [aberto, setAberto] = useState(false)
  const [inicio, setInicio] = useState(dataInicio || '')
  const [fim, setFim] = useState(dataFim || '')
  const ref = useRef()

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const ativo = dataInicio && dataFim

  const aplicar = () => {
    if (!inicio || !fim) return
    onAplicar(inicio, fim)
    setAberto(false)
  }

  const limpar = () => {
    setInicio(''); setFim('')
    onLimpar()
    setAberto(false)
  }

  const atalhos = [
    { label: 'Esta semana', fn: () => {
      const h = new Date(), dia = h.getDay()
      const seg = new Date(h); seg.setDate(h.getDate() - dia + 1)
      const dom = new Date(seg); dom.setDate(seg.getDate() + 6)
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      setInicio(iso(seg)); setFim(iso(dom))
    }},
    { label: 'Últimos 7 dias', fn: () => {
      const fim = new Date(), ini = new Date()
      ini.setDate(fim.getDate() - 6)
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      setInicio(iso(ini)); setFim(iso(fim))
    }},
    { label: 'Este mês', fn: () => {
      const h = new Date()
      const a = h.getFullYear(), m = h.getMonth()+1
      const ms = String(m).padStart(2,'0')
      const ult = new Date(a, m, 0).getDate()
      setInicio(`${a}-${ms}-01`); setFim(`${a}-${ms}-${String(ult).padStart(2,'0')}`)
    }},
  ]

  return (
    <div className="cal-wrap" ref={ref}>
      <button
        type="button"
        className={`btn-filtro-periodo${ativo ? ' ativo' : ''}`}
        onClick={() => setAberto(v => !v)}
      >
        {ativo ? `${fmt(dataInicio)} → ${fmt(dataFim)}` : 'Filtrar período'}
        {ativo && <span className="filtro-dot" />}
        <span className="cal-arrow">▾</span>
      </button>

      {aberto && (
        <div className="filtro-dropdown">
          <div className="filtro-atalhos">
            {atalhos.map(a => (
              <button key={a.label} type="button" className="btn-atalho" onClick={a.fn}>{a.label}</button>
            ))}
          </div>

          <div className="filtro-cals">
            <div className="filtro-cal-col">
              <div className="filtro-cal-label">Data inicial</div>
              <MiniCal value={inicio} dataMax={fim || undefined} onChange={setInicio} />
              <div className="filtro-val">{inicio ? fmt(inicio) : 'Não selecionada'}</div>
            </div>
            <div className="filtro-sep" />
            <div className="filtro-cal-col">
              <div className="filtro-cal-label">Data final</div>
              <MiniCal value={fim} dataMin={inicio || undefined} onChange={setFim} />
              <div className="filtro-val">{fim ? fmt(fim) : 'Não selecionada'}</div>
            </div>
          </div>

          <div className="filtro-actions">
            <button type="button" className="btn-secondary" onClick={limpar}>Limpar</button>
            <button type="button" className="btn-primary" onClick={aplicar} disabled={!inicio || !fim}>
              Aplicar filtro
            </button>
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
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('registros').select('*')

    if (periodoInicio && periodoFim) {
      query = query.gte('data', periodoInicio).lte('data', periodoFim)
    } else {
      const partes = mes.split('-')
      const ano = partes[0], m = partes[1]
      const inicio = `${ano}-${m}-01`
      const ultimoDia = new Date(Number(ano), Number(m), 0).getDate()
      const fim = `${ano}-${m}-${String(ultimoDia).padStart(2,'0')}`
      query = query.gte('data', inicio).lte('data', fim)
    }

    const { data, error } = await query.order('data', { ascending: false })
    if (error) setErro('Erro ao carregar: ' + error.message)
    else { setRegistros(data || []); setErro('') }
    setLoading(false)
  }, [mes, periodoInicio, periodoFim])

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

  const abrirNovo = () => { setEditando(null); setForm(EMPTY_FORM); setFotoFile(null); setFotoPreview(''); setModalAberto(true) }

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

  const periodoAtivo = periodoInicio && periodoFim

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Controle de Descontos</h1>
          <span className="subtitle">
            Carreteiro
            {periodoAtivo && <span className="periodo-tag"> · {fmt(periodoInicio)} até {fmt(periodoFim)}</span>}
          </span>
        </div>
        <div className="header-right">
          {!periodoAtivo && <SeletorMes mes={mes} onChange={setMes} />}
          <FiltroPeriodo
            dataInicio={periodoInicio}
            dataFim={periodoFim}
            onAplicar={(ini, fim) => { setPeriodoInicio(ini); setPeriodoFim(fim) }}
            onLimpar={() => { setPeriodoInicio(''); setPeriodoFim('') }}
          />
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
                  <td>{r.data ? fmt(r.data) : '-'}</td>
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
