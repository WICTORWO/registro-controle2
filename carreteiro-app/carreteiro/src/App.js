import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import './App.css'

const STATUS_OPTIONS = [
  'CAUTELA EXTRAVIADA',
  'CONFERIDA',
  'PENDENTE',
  'OK',
]

const badgeClass = (s) => {
  if (s === 'CAUTELA EXTRAVIADA') return 'badge extraviada'
  if (s === 'CONFERIDA') return 'badge conferida'
  if (s === 'PENDENTE') return 'badge pendente'
  return 'badge ok'
}

const EMPTY_FORM = {
  data: '',
  cliente: '',
  quantidade: 1,
  status: 'CAUTELA EXTRAVIADA',
  cautela: '',
  motorista: '',
  observacoes: '',
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    const [ano, m] = mes.split('-')
    const inicio = `${ano}-${m}-01`
    const ultimoDia = new Date(Number(ano), Number(m), 0).getDate()
    const fim = `${ano}-${m}-${String(ultimoDia).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .gte('data', inicio)
      .lte('data', fim)
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
    setEditando(null)
    setForm(EMPTY_FORM)
    setFotoFile(null)
    setFotoPreview('')
    setModalAberto(true)
  }

  const abrirEditar = (r) => {
    setEditando(r.id)
    setForm({
      data: r.data,
      cliente: r.cliente || '',
      quantidade: r.quantidade || 1,
      status: r.status || 'CAUTELA EXTRAVIADA',
      cautela: r.cautela || '',
      motorista: r.motorista || '',
      observacoes: r.observacoes || '',
    })
    setFotoPreview(r.foto_url || '')
    setFotoFile(null)
    setModalAberto(true)
  }

  const fecharModal = () => { setModalAberto(false); setErro('') }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const uploadFoto = async (file) => {
    const ext = file.name.split('.').pop()
    const nome = `${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('fotos-cautelas')
      .upload(nome, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('fotos-cautelas').getPublicUrl(nome)
    return data.publicUrl
  }

  const salvar = async () => {
    if (!form.data || !form.cliente || !form.motorista) {
      setErro('Preencha data, cliente e motorista.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      let foto_url = fotoPreview && !fotoFile ? fotoPreview : ''
      if (fotoFile) foto_url = await uploadFoto(fotoFile)

      const payload = {
        data: form.data,
        cliente: form.cliente.toUpperCase(),
        quantidade: Number(form.quantidade),
        status: form.status,
        cautela: form.cautela,
        motorista: form.motorista.toUpperCase(),
        observacoes: form.observacoes,
        foto_url,
      }

      if (editando) {
        const { error } = await supabase.from('registros').update(payload).eq('id', editando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('registros').insert([payload])
        if (error) throw error
      }

      await fetchRegistros()
      fecharModal()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    }
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

  const nomeMes = new Date(mes + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Controle de Descontos</h1>
          <span className="subtitle">Carreteiro · {nomeMes}</span>
        </div>
        <div className="header-right">
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="input-mes"
          />
          <button className="btn-primary" onClick={abrirNovo}>+ Novo registro</button>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat danger">
          <span className="stat-label">Extraviadas</span>
          <span className="stat-value">{extraviadas}</span>
        </div>
        <div className="stat success">
          <span className="stat-label">Conferidas / OK</span>
          <span className="stat-value">{conferidas}</span>
        </div>
      </div>

      <div className="filters">
        <input
          className="input-busca"
          type="text"
          placeholder="Buscar motorista, cliente ou cautela..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
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
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Qtd</th>
                <th>Status</th>
                <th>Cautela</th>
                <th>Motorista</th>
                <th>Foto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(r => (
                <tr key={r.id}>
                  <td>{r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{r.cliente}</td>
                  <td className="center">{r.quantidade}</td>
                  <td><span className={badgeClass(r.status)}>{r.status}</span></td>
                  <td>{r.cautela}</td>
                  <td>{r.motorista}</td>
                  <td className="center">
                    {r.foto_url
                      ? <a href={r.foto_url} target="_blank" rel="noreferrer" className="link-foto">Ver</a>
                      : <span className="sem-foto">—</span>}
                  </td>
                  <td className="acoes">
                    <button className="btn-icon" onClick={() => abrirEditar(r)} title="Editar">✏️</button>
                    <button className="btn-icon danger" onClick={() => excluir(r.id)} title="Excluir">🗑️</button>
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
                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="field">
                <label>Quantidade *</label>
                <input type="number" min="1" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} />
              </div>
              <div className="field">
                <label>Cliente *</label>
                <input type="text" placeholder="Ex: EFFA" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
              </div>
              <div className="field">
                <label>Nº da cautela</label>
                <input type="text" placeholder="Ex: 229747" value={form.cautela} onChange={e => setForm({ ...form, cautela: e.target.value })} />
              </div>
            </div>

            <div className="field full">
              <label>Motorista *</label>
              <input type="text" placeholder="Nome completo" value={form.motorista} onChange={e => setForm({ ...form, motorista: e.target.value })} />
            </div>

            <div className="field full">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="field full">
              <label>Observações</label>
              <textarea
                placeholder="Detalhes adicionais..."
                value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="field full">
              <label>Foto da cautela</label>
              <label className="file-area">
                {fotoPreview
                  ? <img src={fotoPreview} alt="preview" className="foto-preview" />
                  : <span>Clique para anexar imagem (JPG, PNG)</span>}
                <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
