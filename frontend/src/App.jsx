import { useState, useRef, useEffect } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'url',   label: 'URL',    icon: '🔗' },
  { id: 'vcard', label: 'vCard',  icon: '👤' },
  { id: 'wifi',  label: 'Wi-Fi',  icon: '📶' },
]

const BODY_SHAPES = [
  { id: 'square',     label: 'Square' },
  { id: 'rounded',    label: 'Rounded' },
  { id: 'circle',     label: 'Circle' },
  { id: 'gapped',     label: 'Gapped' },
  { id: 'horizontal', label: 'H-Bars' },
  { id: 'vertical',   label: 'V-Bars' },
]

const EYE_FRAME_SHAPES = [
  { id: 'square',        label: 'Square' },
  { id: 'rounded',       label: 'Rounded' },
  { id: 'circle',        label: 'Circle' },
  { id: 'sharp_rounded', label: 'Sharp-Rnd' },
  { id: 'double',        label: 'Double' },
]

const EYE_BALL_SHAPES = [
  { id: 'square',  label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle',  label: 'Circle' },
  { id: 'star',    label: 'Star' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'leaf',    label: 'Leaf' },
]

const EC_LEVELS = [
  { id: 'L', label: 'L — Low (7%)' },
  { id: 'M', label: 'M — Medium (15%)' },
  { id: 'Q', label: 'Q — High (25%)' },
  { id: 'H', label: 'H — Max (30%) ← recommended with logo' },
]

const COLOR_PRESETS = [
  { fg: '#000000', bg: '#ffffff', label: 'Classic' },
  { fg: '#1a1a2e', bg: '#e8f4f8', label: 'Midnight' },
  { fg: '#2d6a4f', bg: '#d8f3dc', label: 'Forest' },
  { fg: '#7c6af5', bg: '#f0eeff', label: 'Violet' },
  { fg: '#c44569', bg: '#fff0f3', label: 'Rose' },
  { fg: '#e67e22', bg: '#fef9f0', label: 'Amber' },
]

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

export default function App() {
  const [tab, setTab]             = useState('url')
  const [urlData, setUrlData]     = useState({ url: 'https://example.com' })
  const [vcardData, setVcardData] = useState({ first_name:'', last_name:'', email:'', phone:'', organization:'', title:'', website:'', address:'' })
  const [wifiData, setWifiData]   = useState({ ssid:'', password:'', security:'WPA', hidden:false })

  const [bodyShape,     setBodyShape]     = useState('square')
  const [eyeFrameShape, setEyeFrameShape] = useState('square')
  const [eyeBallShape,  setEyeBallShape]  = useState('square')
  const [fgColor,       setFgColor]       = useState('#000000')
  const [bgColor,       setBgColor]       = useState('#ffffff')
  const [eyeColor,      setEyeColor]      = useState('')
  const [useCustomEyeColor, setUseCustomEyeColor] = useState(false)

  const [errorLevel,    setErrorLevel]    = useState('H')
  const [logoBase64,    setLogoBase64]    = useState(null)
  const [logoSize,      setLogoSize]      = useState(0.22)
  const [logoPadding,   setLogoPadding]   = useState(10)

  const [preview,    setPreview]    = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [downloading,setDownloading]= useState(false)
  const [apiOnline,  setApiOnline]  = useState(null)
  const fileRef = useRef()

  const currentData = tab === 'url' ? urlData : tab === 'vcard' ? vcardData : wifiData

  const payload = {
    type: tab, data: currentData,
    body_shape: bodyShape,
    eye_frame_shape: eyeFrameShape,
    eye_ball_shape: eyeBallShape,
    fg_color: fgColor, bg_color: bgColor,
    eye_color: useCustomEyeColor ? eyeColor : '',
    error_correction: errorLevel,
    logo_base64: logoBase64,
    logo_size: logoSize,
    logo_padding: logoPadding,
    format: 'png', size: 600,
  }

  const debouncedPayload = useDebounce(JSON.stringify(payload), 400)

  useEffect(() => {
    fetch(`${API}/health`).then(() => setApiOnline(true)).catch(() => setApiOnline(false))
  }, [])

  useEffect(() => { fetchPreview() }, [debouncedPayload])

  async function fetchPreview() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/preview`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: debouncedPayload
      })
      if (res.ok) { const j = await res.json(); setPreview(j.image) }
    } catch(e) {}
    finally { setLoading(false) }
  }

  async function downloadQR(format) {
    setDownloading(true)
    try {
      const res = await fetch(`${API}/generate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({...payload, format, size:1200})
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`qrforge.${format}`; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert('Download failed. Is the backend running?') }
    finally { setDownloading(false) }
  }

  function handleLogo(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoBase64(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="app">
      <div className="bg-grid" />

      <header className="header">
        <div className="logo-mark">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">QR<em>Forge</em> <sup>v1.1</sup></span>
        </div>
        <div className={`api-status ${apiOnline===true?'online':apiOnline===false?'offline':'checking'}`}>
          <span className="dot" />
          {apiOnline===true?'API Online':apiOnline===false?'API Offline':'Checking…'}
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">Craft <em>beautiful</em><br />QR codes</h1>
          <p className="hero-sub">Full style control · Logo support · PNG + SVG export</p>
        </div>

        <div className="workspace">
          {/* CONFIG */}
          <div className="panel config-panel">

            {/* TYPE */}
            <div className="section">
              <div className="tab-bar">
                {TABS.map(t => (
                  <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTENT */}
            <div className="section">
              <div className="section-label">Content</div>
              {tab==='url' && (
                <div className="field-group">
                  <label className="field-label">URL</label>
                  <input type="url" placeholder="https://your-website.com" value={urlData.url}
                    onChange={e=>setUrlData({url:e.target.value})} />
                </div>
              )}
              {tab==='vcard' && (
                <div className="field-grid">
                  {[['first_name','First Name','Jane'],['last_name','Last Name','Doe'],['email','Email','jane@example.com'],
                    ['phone','Phone','+1 234 567 8900'],['organization','Organization','Acme Inc.'],['title','Job Title','CEO'],
                    ['website','Website','https://janedoe.com'],['address','Address','123 Main St']].map(([k,l,p])=>(
                    <div className="field-group" key={k}>
                      <label className="field-label">{l}</label>
                      <input placeholder={p} value={vcardData[k]} onChange={e=>setVcardData(prev=>({...prev,[k]:e.target.value}))} />
                    </div>
                  ))}
                </div>
              )}
              {tab==='wifi' && (
                <div className="field-grid">
                  <div className="field-group">
                    <label className="field-label">Network Name (SSID)</label>
                    <input placeholder="MyNetwork" value={wifiData.ssid} onChange={e=>setWifiData(p=>({...p,ssid:e.target.value}))} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Password</label>
                    <input type="password" placeholder="••••••••" value={wifiData.password} onChange={e=>setWifiData(p=>({...p,password:e.target.value}))} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Security</label>
                    <select value={wifiData.security} onChange={e=>setWifiData(p=>({...p,security:e.target.value}))}>
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                  <div className="field-group toggle-field">
                    <label className="field-label">Hidden Network</label>
                    <button className={`toggle ${wifiData.hidden?'on':''}`} onClick={()=>setWifiData(p=>({...p,hidden:!p.hidden}))}>
                      <span className="toggle-thumb"/>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BODY SHAPE */}
            <div className="section">
              <div className="section-label">Body Shape</div>
              <div className="shape-grid cols-6">
                {BODY_SHAPES.map(s=>(
                  <button key={s.id} className={`shape-btn ${bodyShape===s.id?'active':''}`} onClick={()=>setBodyShape(s.id)}>
                    <BodyIcon type={s.id} active={bodyShape===s.id}/>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EYE FRAME */}
            <div className="section">
              <div className="section-label">Eye Frame Shape</div>
              <div className="shape-grid cols-5">
                {EYE_FRAME_SHAPES.map(s=>(
                  <button key={s.id} className={`shape-btn ${eyeFrameShape===s.id?'active':''}`} onClick={()=>setEyeFrameShape(s.id)}>
                    <EyeFrameIcon type={s.id} active={eyeFrameShape===s.id}/>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EYE BALL */}
            <div className="section">
              <div className="section-label">Eye Ball Shape</div>
              <div className="shape-grid cols-6">
                {EYE_BALL_SHAPES.map(s=>(
                  <button key={s.id} className={`shape-btn ${eyeBallShape===s.id?'active':''}`} onClick={()=>setEyeBallShape(s.id)}>
                    <EyeBallIcon type={s.id} active={eyeBallShape===s.id}/>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COLORS */}
            <div className="section">
              <div className="section-label">Colors</div>
              <div className="color-row">
                <ColorField label="Foreground" value={fgColor} onChange={setFgColor}/>
                <ColorField label="Background" value={bgColor} onChange={setBgColor}/>
              </div>
              <div className="eye-color-row">
                <label className="eye-color-toggle">
                  <button className={`toggle sm ${useCustomEyeColor?'on':''}`}
                    onClick={()=>setUseCustomEyeColor(p=>!p)}><span className="toggle-thumb"/></button>
                  <span className="field-label" style={{marginBottom:0}}>Custom eye color</span>
                </label>
                {useCustomEyeColor && (
                  <div style={{marginTop:8}}>
                    <ColorField label="Eye Color" value={eyeColor||fgColor} onChange={setEyeColor}/>
                  </div>
                )}
              </div>
              <div className="presets">
                {COLOR_PRESETS.map(p=>(
                  <button key={p.label} className="preset-dot" title={p.label}
                    onClick={()=>{setFgColor(p.fg);setBgColor(p.bg)}}
                    style={{background:`linear-gradient(135deg,${p.fg} 50%,${p.bg} 50%)`}}/>
                ))}
              </div>
            </div>

            {/* ERROR CORRECTION */}
            <div className="section">
              <div className="section-label">Error Correction</div>
              <select value={errorLevel} onChange={e=>setErrorLevel(e.target.value)}>
                {EC_LEVELS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>

            {/* LOGO */}
            <div className="section">
              <div className="section-label">Logo</div>
              <input type="file" accept="image/*" ref={fileRef} style={{display:'none'}} onChange={handleLogo}/>
              <div className="logo-upload-area" onClick={()=>fileRef.current.click()}>
                {logoBase64 ? (
                  <div className="logo-preview-wrap">
                    <img src={logoBase64} alt="logo" className="logo-thumb"/>
                    <span className="logo-name">Logo loaded ✓</span>
                    <button className="logo-remove" onClick={e=>{e.stopPropagation();setLogoBase64(null)}}>✕</button>
                  </div>
                ) : (
                  <div className="logo-placeholder">
                    <span className="upload-icon">↑</span>
                    <span>Click to upload logo</span>
                    <span className="upload-hint">PNG, SVG, or JPG</span>
                  </div>
                )}
              </div>

              {logoBase64 && (
                <div className="logo-controls">
                  <div className="slider-row">
                    <label className="field-label">Logo Size <span className="val-badge">{Math.round(logoSize*100)}%</span></label>
                    <input type="range" min="8" max="38" step="1"
                      value={Math.round(logoSize*100)}
                      onChange={e=>setLogoSize(Number(e.target.value)/100)}/>
                  </div>
                  <div className="slider-row">
                    <label className="field-label">White Padding <span className="val-badge">{logoPadding}px</span></label>
                    <input type="range" min="4" max="40" step="2"
                      value={logoPadding}
                      onChange={e=>setLogoPadding(Number(e.target.value))}/>
                  </div>
                  <p className="hint">White background has sharp edges · Padding scales with logo</p>
                </div>
              )}
            </div>

          </div>

          {/* PREVIEW */}
          <div className="panel preview-panel">
            <div className="preview-header">
              <span className="section-label">Live Preview</span>
              {loading && <span className="loading-dot"/>}
            </div>

            <div className="preview-frame">
              {preview ? (
                <img key={preview.slice(-20)} src={preview} alt="QR preview" className="qr-preview-img"/>
              ) : (
                <div className="preview-placeholder">
                  <div className="qr-skeleton"/>
                  <p>{apiOnline===false?'Start backend to see preview':'Generating…'}</p>
                </div>
              )}
            </div>

            <div className="download-section">
              <p className="download-label">Export high-res</p>
              <div className="download-btns">
                <button className="dl-btn primary" onClick={()=>downloadQR('png')} disabled={downloading}>
                  {downloading?'Exporting…':'↓ PNG 1200px'}
                </button>
                <button className="dl-btn secondary" onClick={()=>downloadQR('svg')} disabled={downloading}>
                  ↓ SVG Vector
                </button>
              </div>
            </div>

            <div className="specs-row">
              <Spec label="Type"    val={tab.toUpperCase()}/>
              <Spec label="Body"    val={bodyShape}/>
              <Spec label="Eye frame" val={eyeFrameShape.replace('_','-')}/>
              <Spec label="Eye ball" val={eyeBallShape}/>
              <Spec label="Error" val={errorLevel}/>
              <Spec label="Logo"  val={logoBase64 ? `${Math.round(logoSize*100)}%` : 'None'}/>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">QRForge v1.1 · FastAPI + React</footer>
    </div>
  )
}

function Spec({label, val}) {
  return (
    <div className="spec">
      <span className="spec-label">{label}</span>
      <span className="spec-val">{val}</span>
    </div>
  )
}

function ColorField({label, value, onChange}) {
  return (
    <div className="color-field">
      <label className="field-label">{label}</label>
      <div className="color-input-wrap">
        <input type="color" className="color-swatch" value={value} onChange={e=>onChange(e.target.value)}/>
        <input type="text" className="color-hex" value={value} onChange={e=>onChange(e.target.value)} maxLength={7}/>
      </div>
    </div>
  )
}

// ── SVG preview icons ──────────────────────────────────────────────────────

function BodyIcon({type, active}) {
  const c = active ? '#7c6af5' : '#4a4958'
  const grid = Array.from({length:25},(_,i)=>({col:i%5,row:Math.floor(i/5)}))
  if (type==='circle') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><circle key={`${col}-${row}`} cx={4+col*7+3} cy={4+row*7+3} r={3} fill={c}/>)}
    </svg>
  )
  if (type==='rounded') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><rect key={`${col}-${row}`} x={4+col*7} y={4+row*7} width={6} height={6} rx={2} fill={c}/>)}
    </svg>
  )
  if (type==='gapped') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><rect key={`${col}-${row}`} x={5+col*7} y={5+row*7} width={4} height={4} fill={c}/>)}
    </svg>
  )
  if (type==='horizontal') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><rect key={`${col}-${row}`} x={4+col*7} y={6+row*7} width={6} height={2} fill={c}/>)}
    </svg>
  )
  if (type==='vertical') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><rect key={`${col}-${row}`} x={6+col*7} y={4+row*7} width={2} height={6} fill={c}/>)}
    </svg>
  )
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map(({col,row})=><rect key={`${col}-${row}`} x={4+col*7} y={4+row*7} width={6} height={6} fill={c}/>)}
    </svg>
  )
}

function EyeFrameIcon({type, active}) {
  const c = active ? '#7c6af5' : '#4a4958'
  const s = 32, lw = 4
  if (type==='rounded') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <rect x={4} y={4} width={s} height={s} rx={8} fill="none" stroke={c} strokeWidth={lw}/>
    </svg>
  )
  if (type==='circle') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <ellipse cx={20} cy={20} rx={16} ry={16} fill="none" stroke={c} strokeWidth={lw}/>
    </svg>
  )
  if (type==='sharp_rounded') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <rect x={4} y={4} width={s} height={s} rx={4} fill="none" stroke={c} strokeWidth={lw}/>
    </svg>
  )
  if (type==='double') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <rect x={4} y={4} width={s} height={s} fill="none" stroke={c} strokeWidth={3}/>
      <rect x={9} y={9} width={s-10} height={s-10} fill="none" stroke={c} strokeWidth={1.5}/>
    </svg>
  )
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <rect x={4} y={4} width={s} height={s} fill="none" stroke={c} strokeWidth={lw}/>
    </svg>
  )
}

function EyeBallIcon({type, active}) {
  const c = active ? '#7c6af5' : '#4a4958'
  if (type==='circle') return (
    <svg width="40" height="40" viewBox="0 0 40 40"><circle cx={20} cy={20} r={14} fill={c}/></svg>
  )
  if (type==='rounded') return (
    <svg width="40" height="40" viewBox="0 0 40 40"><rect x={6} y={6} width={28} height={28} rx={7} fill={c}/></svg>
  )
  if (type==='star') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="20,4 23.5,14.5 34,14.5 25.5,21 28.5,32 20,26 11.5,32 14.5,21 6,14.5 16.5,14.5" fill={c}/>
    </svg>
  )
  if (type==='diamond') return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="20,4 36,20 20,36 4,20" fill={c}/>
    </svg>
  )
  if (type==='leaf') return (
    <svg width="40" height="40" viewBox="0 0 40 40"><rect x={6} y={6} width={28} height={28} rx={10} fill={c}/></svg>
  )
  return (
    <svg width="40" height="40" viewBox="0 0 40 40"><rect x={6} y={6} width={28} height={28} fill={c}/></svg>
  )
}
