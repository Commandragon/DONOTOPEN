// game-ui.js
// Lightweight UI-only script: spawn animated cats, implement spacebar hold progress
// This script intentionally does not change the existing `index.js` behavior.

(function () {
  const catsLayer = document.getElementById('catsLayer')
  const fillEl = document.getElementById('spaceFill')
  const gameArea = document.getElementById('gameArea')

  // assets: small inline data URLs for cute placeholder cats (colored circles)
  const CAT_COLORS = ['#ff9e3b', '#ffd94d', '#7be495', '#7bdff7', '#b497ff']

  const cats = []

  function rand(min, max) { return Math.random() * (max - min) + min }

  // Create a cat element and animate it across the screen
  function createCat () {
    const el = document.createElement('div')
    el.className = 'cat'
    const size = Math.max(48, Math.round(rand(56, 96)))
    el.style.width = size + 'px'
    el.style.height = size + 'px'
    // simple circular emoji-like face using CSS radial gradients
    const color = CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)]
    el.style.backgroundImage = `radial-gradient(circle at 30% 30%, #fff 6%, rgba(255,255,255,0) 7%), radial-gradient(circle at 70% 30%, #fff 6%, rgba(255,255,255,0) 7%), linear-gradient(${color}, ${shade(color, -12)})`;
    // start position
    const rect = gameArea.getBoundingClientRect()
    const x = rand(8, rect.width - size - 8)
    const y = rand(8, rect.height - size - 120)
    el.style.left = x + 'px'
    el.style.top = y + 'px'

    // enable pointer events so clicks stop propagation (keeps UX friendly)
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      // a tiny wiggle on click to reward interaction (visual only)
      el.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-8px)' },
        { transform: 'translateY(0)' }
      ], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' })
    })

    catsLayer.appendChild(el)

    const vx = rand(-120, 120) / 1000 // px per ms
    const vy = rand(-80, 80) / 1000

    const cat = { el, x, y, vx, vy, size }
    cats.push(cat)

    // remove after a while and respawn
    setTimeout(() => {
      if (catsLayer.contains(el)) el.remove()
      const idx = cats.indexOf(cat)
      if (idx !== -1) cats.splice(idx, 1)
      // respawn
      setTimeout(createCat, rand(600, 1600))
    }, rand(8000, 16000))
  }

  // small color shade helper
  function shade(hex, percent) {
    const c = hex.replace('#','')
    const num = parseInt(c,16)
    let r = (num >> 16) + percent
    let g = ((num >> 8) & 0x00FF) + percent
    let b = (num & 0x0000FF) + percent
    r = Math.max(0, Math.min(255, r))
    g = Math.max(0, Math.min(255, g))
    b = Math.max(0, Math.min(255, b))
    return '#' + ( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1)
  }

  // animate loop
  let last = performance.now()
  function loop (now) {
    const dt = now - last
    last = now
    const rect = gameArea.getBoundingClientRect()
    cats.forEach(cat => {
      cat.x += cat.vx * dt
      cat.y += cat.vy * dt
      // bounce off edges
      if (cat.x < 6) { cat.x = 6; cat.vx = Math.abs(cat.vx) }
      if (cat.x + cat.size > rect.width - 6) { cat.x = rect.width - cat.size - 6; cat.vx = -Math.abs(cat.vx) }
      if (cat.y < 6) { cat.y = 6; cat.vy = Math.abs(cat.vy) }
      if (cat.y + cat.size > rect.height - 6) { cat.y = rect.height - cat.size - 6; cat.vy = -Math.abs(cat.vy) }
      cat.el.style.left = Math.round(cat.x) + 'px'
      cat.el.style.top = Math.round(cat.y) + 'px'
    })
    requestAnimationFrame(loop)
  }

  // spawn initial cats
  for (let i = 0; i < 7; i++) createCat()
  requestAnimationFrame(loop)

  // locked/unlock state: require SPACE hold to unlock full scene
  let locked = true
  let holding = false
  let holdParticlesInterval = null

  // make sure UI starts in locked visual state
  if (catsLayer) catsLayer.classList.add('locked')

  // Spacebar hold logic (visual only)
  let progress = 0 // 0..1
  // keep the faster fill / slow decay from previous tweak
  const holdRate = 0.9 // per second to fill
  const decayRate = 0.08 // per second to decay when not holding

  function startHoldParticles() {
    if (holdParticlesInterval) return
    holdParticlesInterval = setInterval(() => {
      const p = document.createElement('div')
      p.textContent = ['✨','•','✦','✺'][Math.floor(Math.random()*4)]
      p.style.position = 'fixed'
      p.style.left = (40 + Math.random()*20) + '%'
      p.style.bottom = (18 + Math.random()*6) + 'px'
      p.style.fontSize = (10 + Math.random()*18) + 'px'
      p.style.opacity = '0.95'
      p.style.pointerEvents = 'none'
      p.style.zIndex = 120
      p.style.transform = 'translateY(0) rotate(0deg)'
      p.style.transition = `transform ${700 + Math.random()*700}ms cubic-bezier(.2,.9,.2,1), opacity 1000ms linear`
      document.body.appendChild(p)
      requestAnimationFrame(()=> {
        p.style.transform = `translateY(-160px) rotate(${Math.round(Math.random()*360)}deg)`
        p.style.opacity = '0.18'
      })
      setTimeout(()=> p.remove(), 1600)
    }, 110)
  }
  function stopHoldParticles() {
    if (!holdParticlesInterval) return
    clearInterval(holdParticlesInterval)
    holdParticlesInterval = null
  }

  function onKeyDown (e) {
    if (e.code === 'Space') {
      if (!holding) {
        holding = true
        document.body.classList.add('holding')
        // start little particles and subtle vibration
        startHoldParticles()
        if (navigator.vibrate) navigator.vibrate(20)
      }
      e.preventDefault()
    }
  }
  function onKeyUp (e) {
    if (e.code === 'Space') {
      holding = false
      document.body.classList.remove('holding')
      stopHoldParticles()
      e.preventDefault()
      // when released at full progress, unlock and give a joyful visual reward
      if (progress >= 0.999 && locked) {
        unlockScene()
      }
    }
  }

  // animate cats a tiny bit while holding (subtle jiggle)
  let catJigglePhase = 0

  // update loop for progress (and cat jiggle)
  let prev = performance.now()
  function tick() {
    const now = performance.now()
    const dt = (now - prev) / 1000
    prev = now

    // progress logic
    if (holding) {
      progress += holdRate * dt
      if (progress > 1) progress = 1
    } else {
      progress -= decayRate * dt
      if (progress < 0) progress = 0
    }
    if (fillEl) fillEl.style.width = Math.round(progress * 100) + '%'

    // cat jiggle while holding
    if (holding) {
      catJigglePhase += dt * 8
      const cats = catsLayer.querySelectorAll('.cat')
      cats.forEach((c, i) => {
        const s = 1 + Math.sin(catJigglePhase + i) * 0.03
        c.style.transform = `scale(${s})`
      })
    } else {
      // gently restore cats scale
      const cats = catsLayer.querySelectorAll('.cat')
      cats.forEach(c => { c.style.transform = '' })
    }

    requestAnimationFrame(tick)
  }

  function unlockScene() {
    locked = false
    stopHoldParticles()
    document.body.classList.remove('holding')
    if (catsLayer) {
      catsLayer.classList.remove('locked')
      catsLayer.classList.add('unlocked')
      catsLayer.style.pointerEvents = 'auto'
    }
    // show surprise visuals already implemented
    showSurprise()
    // small applause voice if available
    if (window.speechSynthesis) {
      try { speak('Unlocked! Nice hold.') } catch (e) { /* ignore */ }
    }
  }

  // joyful confetti + banner for completing the hold
  function showSurprise () {
    // banner
    const banner = document.getElementById('surpriseBanner')
    if (banner) {
      banner.classList.add('show')
      setTimeout(()=> banner.classList.remove('show'), 1800)
    }

    // confetti (simple emoji fall)
    const confettiCount = 24
    const confettiEls = []
    for (let i = 0; i < confettiCount; i++) {
      const s = document.createElement('div')
      s.textContent = ['🎉','✨','🌟','💫'][Math.floor(Math.random()*4)]
      s.style.position = 'fixed'
      s.style.left = Math.round(Math.random()*100) + '%'
      s.style.top = '-4%'
      s.style.fontSize = (12 + Math.random()*28) + 'px'
      s.style.opacity = String(0.9 - Math.random()*0.5)
      s.style.pointerEvents = 'none'
      s.style.zIndex = 260
      s.style.transform = 'translateY(0) rotate(' + Math.round(Math.random()*360) + 'deg)'
      document.body.appendChild(s)
      confettiEls.push(s)
      // fall animation
      const fallDur = 800 + Math.random()*900
      s.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: 'translateY(120vh) rotate(360deg)', opacity: 0.2 }
      ], { duration: fallDur, easing: 'cubic-bezier(.2,.8,.2,1)' })
      setTimeout(()=> s.remove(), fallDur + 40)
    }

    // brief glow flash
    flashComplete()
  }

  function flashComplete () {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.inset = '0'
    el.style.background = 'radial-gradient(circle at 30% 20%, rgba(255,220,120,.08), rgba(0,0,0,0))'
    el.style.pointerEvents = 'none'
    el.style.zIndex = 100
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 700)
  }

  // start the progress tick
  requestAnimationFrame(tick)

  window.addEventListener('keydown', onKeyDown, { passive: false })
  window.addEventListener('keyup', onKeyUp, { passive: false })

  // make cats follow mouse slightly for a playful effect
  window.addEventListener('mousemove', (e) => {
    const rect = gameArea.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    cats.forEach((c, i) => {
      // nudge velocity a bit toward mouse
      const dx = mx - (c.x + c.size / 2)
      const dy = my - (c.y + c.size / 2)
      c.vx += (dx / rect.width) * (0.02 + (i % 3) * 0.01)
      c.vy += (dy / rect.height) * (0.02 + (i % 3) * 0.01)
      // clamp
      c.vx = Math.max(-0.25, Math.min(0.25, c.vx))
      c.vy = Math.max(-0.18, Math.min(0.18, c.vy))
    })
  })

  // make sure the layer allows pointer events when cats are present
  catsLayer.style.pointerEvents = 'none'

  // save a few performance-friendly respawns
  setInterval(() => { if (cats.length < 6) createCat() }, 2500)

})()
