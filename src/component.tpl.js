/*!
 * <slime-mascot> — mascota animada para páginas web / SaaS. Un solo archivo, sin dependencias.
 *
 *   <script src="mascota.js" defer></script>
 *   <slime-mascot id="mascota" size="260" intro></slime-mascot>
 *   <slime-mascot variant="sheet"></slime-mascot>   ← con hoja de cálculo
 *   <slime-mascot variant="bag"></slime-mascot>     ← con mochila ejecutiva (cartera)
 *
 * Animaciones — todas nacen del reposo y regresan a él dentro del mismo dibujo:
 *   mascota.play('enter' | 'greet' | 'nod' | 'shake' | 'success' | 'notify' | 'curious' | 'smile' |
 *                'download' | 'upload' | 'angry' | 'happy' | 'exit')
 *   Acciones del usuario:  'search' | 'save' | 'export' | 'approve' | 'archive'
 *   Estados del sistema:   'empty' | 'locked' | 'offline' | 'expiring'
 *   Guía y ayuda:          'tip'  ·  mascota.pointAt(elemento)  ·  mascota.say('texto')  ·  mascota.tour([...])
 *   Bucles (terminan con mascota.stop() o al pedir otra animación):
 *                'think' | 'waiting' | 'roam' (pasea por la página) | 'sleep'
 *   play() devuelve una Promise que se resuelve cuando la mascota vuelve al reposo.
 *
 * Comportamiento general (todas las variantes):
 *   · Sigue el cursor con ojos, cabeza y antenas.  · Se voltea a izquierda/derecha según dónde esté y hacia dónde mire.
 *   · Se puede arrastrar: se estira, patalea, se balancea y aterriza con rebote.
 *
 * Sin escribir JS:  <button data-mascot="success">Guardar</button>  ·  al enfocar un campo, lo mira.
 *
 * Estado de la app (recomendado): <slime-mascot state="loading">  →  idle | loading | waiting | success | error | empty |
 *   offline | locked | expiring | downloading | uploading | saved.  También mascota.state = 'success'.
 *
 * Buenas prácticas incorporadas:
 *   · Control del usuario: botones de pausar y ocultar (se recuerdan); métodos pause() resume() hide() show().
 *   · Movimiento reducido: respeta la preferencia del sistema (o motion="reduced"); los estados se muestran sin desplazamientos.
 *   · Ahorro: se pausa por completo fuera de pantalla y con la pestaña oculta.
 *   · No estorba: solo el cuerpo recibe clics; no reaparece si el usuario la ocultó; no apila la misma animación;
 *     las animaciones repetidas se acortan (y speed="1.25" las acelera todas); calm desactiva la siesta automática.
 *   · Lectores de pantalla: label="…" o decorative; con announce dice el estado en texto (mascota.messages).
 *
 * Poses dibujadas de cuerpo completo (cargar además mascota-poses.js) — otros ángulos y gestos, fundidos con el reposo sin cortes:
 *   De una vez: 'spin' (giro 360° en ocho ángulos) | 'jump' (salto grande) | 'excited' | 'wink' | 'gasp' (sorpresa) | 'lean' (se asoma)
 *   Bucles:     'front' (de frente) | 'away' (de espaldas) | 'crawl' (pasea a rastras) | 'nap' | 'sit' | 'sad' | 'ponder' (pensativa)
 *   Con el atributo shy se da la vuelta sola mientras el usuario escribe en un campo de contraseña.
 *   Sin ese archivo (o con movimiento reducido en las más movidas) cada una usa su equivalente sencillo. El gorro y la
 *   prenda del cuello de los trajes acompañan a cada pose; el objeto de la variante y el adorno de atrás se quedan en su sitio.
 *
 * Trajes (cargar además mascota-trajes.js):  <slime-mascot costume="navidad">  ·  costume="auto" lo elige por fecha
 *   navidad · anionuevo · halloween · semanasanta · independencia · todossantos · quemadiablo · acciondegracias ·
 *   carino · madre · padre · nino · mujer · hombre · ejercito
 *
 * Atributos: size · variant="sheet|bag" · facing="auto|left|right" · intro · shy · no-drag · no-sleep · no-follow · no-click
 *            state · motion="auto|reduced|full" · speed · calm · no-controls · no-persist · label · decorative · announce
 * Métodos:   play(nombre) · stop() · lookAt(x,y) · face('left'|'right') · resetPosition()
 *            pointAt(el) · say(texto, {ms, buttons}) · hush() · moveNear(el) · tour(pasos, opciones)
 *
 * Tutorial guiado:
 *   mascota.tour([
 *     { target: '#buscar',   text: 'Aquí buscas un cliente por nombre o NIT.' },
 *     { target: '#exportar', text: 'Y aquí exportas la cartera a Excel.' },
 *   ]);                       // camina a cada elemento, lo resalta, lo señala y explica; devuelve true si se completó
 * Eventos:   actionstart / actionend (detail = nombre)
 * Color de los efectos: slime-mascot { --mascot-accent: #2f8fe8 }
 */
(() => {
  const FX = __FXMAP__;

  const TPL = `
<style>
  :host{display:inline-block;width:260px;pointer-events:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
  .stage{position:relative;width:100%;aspect-ratio:__RATIO__;font-size:20px}
  .stage.hidden .dir{visibility:hidden}
  /* solo el cuerpo recibe clics: las zonas transparentes no tapan la interfaz que hay debajo */
  .hit{position:absolute;left:12%;top:3%;width:84%;height:95%;border-radius:46% 46% 40% 40%;pointer-events:auto;cursor:grab;touch-action:none;z-index:2}
  :host([no-drag]) .hit{cursor:pointer;touch-action:auto}
  :host(.dragging) .hit{cursor:grabbing}
  /* controles: pausar y ocultar (aparecen al pasar el cursor, tocar o enfocar con teclado) */
  .ctl{position:absolute;left:0;bottom:0;display:flex;gap:.3em;opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:4}
  .ctl-on .ctl,.ctl:focus-within{opacity:1;pointer-events:auto}
  .ctl button,.chip{width:1.9em;height:1.9em;min-width:28px;min-height:28px;border-radius:50%;border:1px solid #c3d4ea;background:#fff;color:#33415c;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 2px 8px rgba(27,42,77,.16);font:inherit}
  .ctl button:focus-visible,.chip:focus-visible,.bubble button:focus-visible{outline:3px solid var(--mascot-accent,#2f8fe8);outline-offset:2px}
  .ctl svg,.chip svg{position:static;width:54%;height:54%}
  .ctl .i-play,.paused .ctl .i-pause{display:none}.paused .ctl .i-play{display:block}
  .chip{position:absolute;left:50%;bottom:6%;translate:-50% 0;display:none;pointer-events:auto;background:var(--mascot-accent,#2f8fe8);border-color:transparent;color:#fff;z-index:4}
  .gone .chip{display:grid}
  .gone .dir,.gone .fx,.gone .hit,.gone .ctl,.gone .bubble{display:none}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
  /* fuera de pantalla o pestaña oculta: todo en pausa para no gastar batería */
  .away *{animation-play-state:paused!important}
  /* movimiento reducido (preferencia del sistema o botón de pausa): sin vaivén; los estados se muestran con cambios suaves de cara y objetos */
  .still .body,.still .ant,.still .zz,.still .dots i,.still .sp,.still .arr{animation:none!important}
  .still .lean,.still .aw{transition:none}
  .still .fx-zz .zz,.still.fx-spark .sp,.still.fx-down .arr,.still.fx-up .arr{opacity:.9}
  img,svg{position:absolute;display:block;max-width:none;pointer-events:none}
  .dir,.drag,.hop,.lean,.body,.aw{position:absolute;inset:0}
  .hop,.lean,.body{transform-origin:__ORIGIN__;will-change:transform}
  /* giro izquierda/derecha */
  .dir{transform-origin:__OX__% 50%}
  .left .dir{transform:scaleX(-1)}
  /* balanceo al arrastrar (lo mueve la física) */
  /* cuelga del punto por donde la agarran: primero gira sobre ese punto y luego se estira hacia abajo */
  .drag{transform-origin:__OX__% 34%;transform:translate(calc(var(--tx,0)*1px),calc(var(--ty,0)*1px)) scale(var(--dw,1),var(--ds,1)) rotate(calc(var(--dr,0)*1deg))}
  .defs{position:absolute;width:0;height:0}
  /* la cabeza acompaña a la mirada; las antenas llegan después */
  .lean{transform:translateX(calc(var(--hx,0)*.14%)) rotate(calc(var(--hx,0)*.42deg)) scale(calc(1 + var(--hy,0)*.0022),calc(1 - var(--hy,0)*.0042));transition:transform .5s cubic-bezier(.3,1.35,.5,1)}
  .aw{transform:rotate(calc(var(--hx,0)*-.75deg + var(--ag,0)*1deg));transition:transform .85s cubic-bezier(.3,1.7,.5,1)}
  .body{animation:breathe 3.6s ease-in-out infinite}
  .ant{animation:swayL 4.4s ease-in-out infinite}
  .antR{animation-name:swayR;animation-duration:5.2s}
  .face{inset:0;width:100%;height:100%;overflow:visible}
  /* poses de cuerpo completo (otros ángulos y gestos): viven dentro del cuerpo y se funden con el dibujo articulado */
  .rig,.poses{position:absolute;inset:0}
  /* copia del gorro y de la prenda del cuello que acompaña a las poses (se coloca sobre la cabeza de cada una) */
  .cs-hat2,.cs-front2{opacity:0}
  .cs-hat2{transform-origin:__HATO__}
  .cs-front2{transform-origin:__NECKO__}
  .po{opacity:0;visibility:hidden;will-change:opacity,transform}
  .po.on{visibility:visible}
  /* trajes: capas que viven dentro del cuerpo, así siguen cada salto, estirón y deformación sin lógica aparte */
  .cs{position:absolute;inset:0;pointer-events:none}
  .cs img{position:absolute}
  .cs-hat{transform-origin:63% 24%;transform:rotate(calc(var(--hx,0)*-.3deg + var(--ag,0)*.25deg));transition:transform .75s cubic-bezier(.3,1.6,.5,1)}
  .still .cs-hat{transition:none}
  .eh,.es,.mo,.mo2,.br{opacity:0}
  .mo2{transform-box:fill-box;transform-origin:50% 50%}
  .prop{position:absolute;left:79%;top:55%;width:37%;height:43%;transform-origin:50% 96%;pointer-events:none}
  .prop img{position:static;width:100%;height:100%;object-fit:contain;object-position:50% 100%}
  .mo{transform-box:fill-box;transform-origin:50% 0}
  .pupil{transform:translate(calc(var(--lx,0)*1%),calc(var(--ly,0)*1%));transition:transform .24s ease-out}
  .blink .pupil{transform:translate(calc(var(--lx,0)*1%),calc(var(--ly,0)*1%)) scaleY(.12);transition:transform .07s ease-in}

  .item{position:absolute;left:79%;top:32%;width:26%;height:29%;opacity:0;pointer-events:none;transform-origin:50% 60%}
  .item img{position:static;width:100%;height:100%;object-fit:contain}
  .q{right:2%;top:-2%;width:2.2em;height:2.2em}
  .fx-q .q{animation:bang 1.25s ease both}
  .left .q img,.left .ok img,.left .bang img{transform:scaleX(-1)}
  .bubble{position:absolute;bottom:97%;left:50%;width:max-content;max-width:min(270px,82vw);translate:calc(-50% + var(--bx,0px)) 6px;background:#fff;color:#1b2a4d;border:1px solid #c3d4ea;border-radius:14px;padding:11px 13px;font:14px/1.4 system-ui,sans-serif;text-align:left;box-shadow:0 8px 24px rgba(27,42,77,.16);opacity:0;pointer-events:none;transition:opacity .2s ease,translate .25s cubic-bezier(.3,1.4,.5,1);cursor:default;user-select:text;-webkit-user-select:text;z-index:3}
  .bubble.on{opacity:1;pointer-events:auto;translate:calc(-50% + var(--bx,0px)) 0}
  .bubble::after{content:"";position:absolute;left:calc(50% - var(--bx,0px) - 7px);bottom:-7px;width:12px;height:12px;background:#fff;border-right:1px solid #c3d4ea;border-bottom:1px solid #c3d4ea;transform:rotate(45deg)}
  .bubble .btns{display:flex;gap:8px;justify-content:flex-end;margin-top:9px}
  .bubble .btns:empty{display:none}
  .bubble button{font:600 13px system-ui,sans-serif;padding:6px 12px;border-radius:999px;border:1px solid #c3d4ea;background:#fff;color:#1b2a4d;cursor:pointer}
  .bubble button.pri{background:var(--mascot-accent,#2f8fe8);border-color:var(--mascot-accent,#2f8fe8);color:#fff}
  .bubble .step{font-size:11.5px;opacity:.55;margin-bottom:3px}
  .fx{position:absolute;inset:0;pointer-events:none}
  .left .fx{transform:scaleX(-1)}
  .left .zz b{display:inline-block;transform:scaleX(-1)}
  .fx>*{position:absolute;opacity:0}
  .zz{right:10%;top:16%;font:700 1.5em system-ui,sans-serif;color:var(--mascot-accent,#2f8fe8)}
  .zz.z2{right:3%;top:5%;font-size:1.1em}
  .fx-zz .zz{animation:zzz 3.2s ease-in-out infinite}
  .fx-zz .zz.z2{animation-delay:-1.6s}
  .bang{right:2%;top:-2%;width:2.2em;height:2.2em}
  .fx-bang .bang{animation:bang 1.25s ease both}
  .dots{right:2%;top:2%;display:flex;gap:.3em;padding:.45em .6em;border-radius:1em;background:rgba(47,143,232,.08);border:1px solid rgba(47,143,232,.4);transform:translateY(40%) scale(.7);transition:opacity .25s ease,transform .25s ease}
  .dots i{display:block;width:.45em;height:.45em;border-radius:50%;background:var(--mascot-accent,#2f8fe8);animation:dot 1s ease-in-out infinite}
  .dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
  .fx-dots .dots{opacity:1;transform:none}
  .ok{right:-2%;top:28%;width:2.3em;height:2.3em}
  .fx img{position:static;display:block;width:100%;height:100%}
  .fx-ok .ok{animation:bang .95s ease both}
  .arr{right:-3%;top:14%;width:1.9em;height:1.9em}
  .arr img+img,.fx-up .arr img{display:none}
  .fx-up .arr img+img{display:block}
  .fx-down .arr{animation:fall .75s cubic-bezier(.5,0,.8,.6) infinite}
  .fx-up .arr{animation:rise .75s cubic-bezier(.2,.4,.5,1) infinite}
  .arr.a2{animation-delay:.25s!important}.arr.a3{animation-delay:.5s!important}
  .mad{left:28%;top:4%;width:2.4em;height:2.4em}
  .fx-mad .mad{animation:mad 1.9s ease both}
  .puff{top:20%;width:1.1em;height:1.1em;border-radius:50%;background:#fff;border:2px solid #b9c7da;box-shadow:.5em -.25em 0 -.12em #fff,.5em -.25em 0 0 #b9c7da}
  .puff.p1{left:30%;--px:-260%}.puff.p2{left:86%;--px:200%}
  .fx-puff .puff{animation:puff .9s ease-out both}
  .sp{width:1.5em;height:1.5em}
  .fx-spark .sp{animation:spark .95s ease-out both}
  @keyframes breathe{0%,100%{transform:scale(1,1) skewX(0deg)}25%{transform:scale(1.012,.988) skewX(.5deg)}50%{transform:scale(1.022,.975) skewX(0deg)}75%{transform:scale(1.012,.988) skewX(-.5deg)}}
  @keyframes swayL{0%,100%{rotate:-1.6deg}50%{rotate:2.2deg}}
  @keyframes swayR{0%,100%{rotate:1.8deg}50%{rotate:-1.6deg}}
  @keyframes zzz{0%{transform:translate(0,0);opacity:0}30%{opacity:.9}100%{transform:translate(40%,-120%);opacity:0}}
  @keyframes bang{0%{opacity:0;transform:scale(0) rotate(-20deg)}18%{opacity:1;transform:scale(1.25) rotate(8deg)}30%{opacity:1;transform:scale(1) rotate(0)}80%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.6)}}
  @keyframes dot{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-45%);opacity:1}}
  @keyframes fall{0%{opacity:0;transform:translateY(-130%)}25%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(210%)}}
  @keyframes rise{0%{opacity:0;transform:translateY(210%)}25%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-130%)}}
  @keyframes mad{0%{opacity:0;transform:scale(0)}10%{opacity:1;transform:scale(1.3)}22%{transform:scale(.9)}34%{transform:scale(1.25)}46%{transform:scale(.9)}58%{transform:scale(1.2)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.5)}}
  @keyframes puff{0%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:.95}100%{opacity:0;transform:translate(var(--px),-160%) scale(1.5)}}
  @keyframes spark{0%{opacity:0;transform:translate(0,0) scale(0) rotate(0)}25%{opacity:1;transform:translate(calc(var(--dx)*.5),calc(var(--dy)*.5)) scale(1.1) rotate(40deg)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3) rotate(120deg)}}
</style>
<div class="stage">
  <svg class="defs" width="0" height="0" aria-hidden="true"><defs>
    <filter id="pinch" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB" primitiveUnits="userSpaceOnUse">
      <feFlood flood-color="rgb(128,128,128)" result="gray"/>
      <feFlood class="bx" flood-color="rgb(255,128,128)" result="bx0"/><feGaussianBlur class="gx" in="bx0" stdDeviation="20" result="bx1"/>
      <feComposite in="bx1" in2="gray" operator="over" result="mx"/>
      <feDisplacementMap class="dx" in="SourceGraphic" in2="mx" scale="0" xChannelSelector="R" yChannelSelector="B" result="d1"/>
      <feFlood class="by" flood-color="rgb(128,255,128)" result="by0"/><feGaussianBlur class="gy" in="by0" stdDeviation="20" result="by1"/>
      <feComposite in="by1" in2="gray" operator="over" result="my"/>
      <feDisplacementMap class="dy" in="d1" in2="my" scale="0" xChannelSelector="B" yChannelSelector="G"/>
    </filter>
  </defs></svg>
  <div class="dir" role="img" aria-label="Mascota"><div class="drag"><div class="hop"><div class="lean"><div class="body">
__LAYERS__
  </div></div></div></div></div>
  <div class="fx">
    <span class="zz"><b>z</b></span><span class="zz z2"><b>z</b></span>
    <span class="ok">${FX.ok}</span>
    <span class="arr">${FX.down}${FX.up}</span>
    <span class="arr a2">${FX.down}${FX.up}</span>
    <span class="arr a3">${FX.down}${FX.up}</span>
    <span class="mad">${FX.mad}</span>
    <span class="puff p1"></span><span class="puff p2"></span>
    <span class="bang">${FX.bang}</span>
    <span class="q">${FX.q}</span>
    <span class="dots"><i></i><i></i><i></i></span>
    <span class="sp" style="left:20%;top:22%;--dx:-160%;--dy:-140%">${FX.star_b}</span>
    <span class="sp" style="left:44%;top:4%;--dx:-30%;--dy:-220%;animation-delay:.08s">${FX.star_g}</span>
    <span class="sp" style="left:74%;top:10%;--dx:150%;--dy:-170%;animation-delay:.04s">${FX.star_b}</span>
    <span class="sp" style="left:90%;top:40%;--dx:200%;--dy:-40%;animation-delay:.12s">${FX.star_g}</span>
    <span class="sp" style="left:6%;top:48%;--dx:-220%;--dy:-30%;animation-delay:.1s">${FX.star_b}</span>
    <span class="sp" style="left:58%;top:0%;--dx:60%;--dy:-240%;animation-delay:.16s">${FX.star_g}</span>
  </div>
  <div class="hit"></div>
  <div class="ctl">
    <button type="button" class="c-pause" aria-pressed="false"><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg></button>
    <button type="button" class="c-hide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></button>
  </div>
  <button type="button" class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="10" r="2.2" fill="currentColor"/><circle cx="16" cy="10" r="2.2" fill="currentColor"/><path d="M8 15.5q4 3.5 8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
  <div class="sr" aria-live="polite"></div>
  <div class="bubble" role="status" aria-live="polite"><div class="step"></div><div class="txt"></div><div class="btns"></div></div>
</div>`;

  /* ---------- fotogramas ---------- */
  const k = (o, f) => Object.assign({ offset: o, easing: 'ease-in-out' }, f);
  /* cuerpo: t(y%, escalaX, escalaY, giro°, x%, opacidad) */
  const t = (y = 0, sx = 1, sy = 1, r = 0, x = 0, op = 1) => ({ transform: `translate(${x}%,${y}%) rotate(${r}deg) scale(${sx},${sy})`, opacity: op });
  /* patita: p(x%, y%, giro°) */
  const p = (x = 0, y = 0, r = 0) => ({ transform: `translate(${x}%,${y}%) rotate(${r}deg)` });
  /* antena: r(giro°) */
  const r = (d = 0) => ({ transform: `rotate(${d}deg)` });
  /* pupilas: e(aperturaY, opacidad, tamaño) */
  const e = (sy = 1, op = 1, s = 1) => ({ scale: `${s} ${s * sy}`, opacity: op });
  /* capas de cara: o(opacidad) · boca: m(opacidad, escalaX, escalaY) */
  const o = (op) => ({ opacity: op });
  const m = (op = 0, sx = 1, sy = .2) => ({ opacity: op, scale: `${sx} ${sy}` });
  /* objeto: pr(x%, y%, giro°, escalaX, escalaY) · boca: ms(escalaY: 1 sonrisa, -1 enojo) · ceño: br(opacidad, y) */
  const pr = (x = 0, y = 0, rot = 0, sx = 1, sy = 1) => ({ transform: `translate(${x}%,${y}%) rotate(${rot}deg) scale(${sx},${sy})` });
  const ms = (sy = 1, op = 1) => ({ scale: `1 ${sy}`, opacity: op });
  /* boca de sorpresa (una «o» redonda): oo(opacidad, escala) */
  const oo = (op = 0, s = .3) => ({ opacity: op, scale: `${s} ${s}` });
  const br = (op = 0, y = -14) => ({ opacity: op, transform: `translateY(${y}px)` });
  /* objeto de mano: it(x%, y%, giro°, escala, opacidad, escalaY) */
  const it = (x = 0, y = 0, rot = 0, s = 1, op = 1, sy = s) => ({ transform: `translate(${x}%,${y}%) rotate(${rot}deg) scale(${s},${sy})`, opacity: op });
  const T = (...pts) => pts.map(([off, f]) => k(off, f));
  /* pose de cuerpo completo: opacidad + desplazamiento, escala y giro propios */
  const PA = __POSEANCH__;
  const c = (op = 0, x = 0, y = 0, rot = 0) => ({ opacity: op, transform: `translate(${x}%,${y}%) rotate(${rot}deg)` });
  const q = (op = 0, sx = 1, sy = 1, rot = 0, x = 0, y = 0) => ({ opacity: op, transform: `translate(${x}%,${y}%) rotate(${rot}deg) scale(${sx},${sy})` });
  /* Secuencia de poses fundidas una tras otra. frames: [nombre, entra, espejo?]; a = sale el dibujo articulado (null: ya estaba oculto);
     b = vuelve (null: se queda en la última pose). w = duración del fundido. Devuelve las pistas RG y Q<nombre>. */
  const SEQ = (frames, a, b, w = .05, sq = .84) => {
    /* sin baches de transparencia: lo nuevo aparece encima de lo anterior (que sigue opaco) y solo entonces lo anterior se desvanece */
    const tr = {}, end = b == null ? 1 : b, h = w * .5;
    frames.forEach(([n, at, mir], i) => {
      const key = 'Q' + n, m_ = mir ? -1 : 1, first = i === 0, last = i === frames.length - 1;
      const out = last ? end : frames[i + 1][1], held = a == null && first;
      const L = tr[key] || (tr[key] = [[0, held ? q(1, m_) : q(0, m_ * (first ? 1 : sq))]]);
      if (!held) L.push([Math.max(.001, at - h), q(0, m_ * (first ? 1 : sq))], [at, q(1, m_)]);
      if (last && b == null) L.push([1, q(1, m_)]);
      else L.push([out, q(1, m_)], [Math.min(.999, out + h), q(0, m_ * (last ? 1 : sq))]);
    });
    for (const key in tr) { const L = tr[key]; if (L[L.length - 1][0] < 1) L.push([1, q(0, L[L.length - 1][1].transform.includes('scale(-') ? -1 : 1)]); tr[key] = T(...L); }
    const R = [[0, o(a == null ? 0 : 1)]];
    if (a != null) R.push([a, o(1)], [a + h, o(0)]);
    if (b != null) R.push([b - h, o(0)], [b, o(1)]);
    R.push([1, o(b == null ? 0 : 1)]);
    tr.RG = T(...R);
    /* gorro y prenda del cuello: saltan a la cabeza de cada pose al mismo tiempo que el fundido */
    [['CH', 'hat', 'rigHat'], ['CF', 'neck', 'rigNeck']].forEach(([key, kind, rk]) => {
      const at_ = (n, mir) => { const v = (PA.poses[n] || {})[kind]; return v ? (mir ? [2 * (PA.ox - PA[rk][0]) - v[0], v[1], -v[2]] : v) : null; };
      const L = []; let pv = 0, pp = [0, 0, 0];
      frames.forEach(([n, at, mir], i) => {
        const v = at_(n, mir), vis = v ? 1 : 0, pos = v || pp;
        if (i === 0) { L.push([0, c(a == null ? vis : 0, ...pos)]); if (a != null) L.push([Math.max(.001, at - h), c(0, ...pos)], [at, c(vis, ...pos)]); }
        else L.push([at - h, c(pv, ...(pv ? pp : pos))], [at, c(vis, ...pos)]);
        pv = vis; pp = pos;
      });
      if (b == null) L.push([1, c(pv, ...pp)]); else L.push([end, c(pv, ...pp)], [Math.min(.999, end + h), c(0, ...pp)], [1, c(0, ...pp)]);
      tr[key] = T(...L);
    });
    return tr;
  };
  /* movimientos mientras se sostiene una pose (devuelven fotogramas del cuerpo entre a y b) */
  const hBob = (n, amp = 7) => (a, b) => { const L = [], s_ = (b - a) / n; for (let i = 0; i < n; i++) { L.push([a + s_ * (i + .5), t(-amp, .96, 1.06, i % 2 ? 2 : -2)]); if (i < n - 1) L.push([a + s_ * (i + 1), t(0, 1.07, .9)]); } return L; };
  const hShake = (n, amp = .8) => (a, b) => { const L = [], s_ = (b - a) / (n + 1); for (let i = 1; i <= n; i++) L.push([a + s_ * i, t(-1, .99, 1.015, 0, i % 2 ? amp : -amp)]); return L; };
  const hSway = (n, deg = 2.5) => (a, b) => { const L = [], s_ = (b - a) / (n + 1); for (let i = 1; i <= n; i++) L.push([a + s_ * i, t(-.8, .992, 1.012, i % 2 ? deg : -deg)]); return L; };
  const H_IN = () => T([0, t()], [.18, t(0, 1.05, .93)], [.36, t(-2.5, .97, 1.04)], [.62, t(0, 1.03, .965)], [.82, t(-.5, .99, 1.01)], [1, t()]);
  /* una pose de una vez: toma impulso, cambia de dibujo, la sostiene con su movimiento y vuelve al reposo */
  const ONE = (pose, d, hold, extra, a = .14, b = .82, w = .05) => Object.assign({ d, look: [[0, 0, 0]] }, extra, { tr: Object.assign(SEQ([[pose, a]], a, b, w, 1), {
    H: T([0, t()], [a * .5, t(0, 1.05, .93)], [a, t(0, 1.03, .96)], ...hold(a + .03, b - .03), [b, t(0, 1.05, .93)], [b + (1 - b) * .55, t(-1, .99, 1.015)], [1, t()]) }) });
  /* una pose en bucle: entra, repite su ciclo y sale cuando se llama stop() */
  const LOOPP = (pose, cycle, extra, dIn = 760, dOut = 760) => Object.assign({ loop: true, look: [[0, 0, 0]] }, extra, {
    in: { d: dIn, tr: Object.assign(SEQ([[pose, .34]], .34, null, .12, 1), { H: H_IN() }) }, cycle,
    out: { d: dOut, tr: Object.assign(SEQ([[pose, 0]], null, .36, .12, 1), { H: H_IN() }) } });
  const REST = { IT: () => it(0, 15, -20, 0, 0), H: () => t(), P: () => p(), AL: () => r(), AR: () => r(), RG: () => o(1), CH: () => c(), CF: () => c(), E: () => e(), EH: () => o(0), ES: () => o(0), M: () => m(), PR: () => pr(), MS: () => ms(1), BR: () => br(), MO: () => oo() };

  const CHIN = [14, -66, -26];        // patita en la barbilla
  const UP = [66, -90];               // patita levantada
  const SUNK = [0, 1.045, .93];       // cuerpo dormido
  const ONP = [40, -50, 50];          // patita apoyada sobre el objeto
  const HANG = [0, .97, 1.035];       // cuerpo colgando al arrastrar (el estirón grande lo pone la física)

  const A = {
    enter: { d: 950, tr: {
      H:  T([0, t(55, .9, 1.1, 0, 0, 0)], [.42, t(-9, .95, 1.07)], [.6, t(0, 1.1, .86)], [.76, t(-2, .97, 1.04)], [.9, t(0, 1.02, .985)], [1, t()]),
      AL: T([0, r(-14)], [.42, r(-16)], [.6, r(12)], [.76, r(-6)], [.9, r(3)], [1, r()]),
      AR: T([0, r(12)], [.42, r(14)], [.6, r(-10)], [.76, r(5)], [.9, r(-2)], [1, r()]),
      P:  T([0, p()], [.42, p(0, -8, -10)], [.6, p(0, 3, 6)], [.8, p(0, -2, -2)], [1, p()]),
      E:  T([0, e()], [.55, e()], [.62, e(.12)], [.7, e()], [1, e()]),
    } },
    exit: { d: 820, look: [[0, 0, 5]], tr: {
      H:  T([0, t()], [.2, t(0, 1.08, .88)], [.45, t(-8, .96, 1.06)], [1, t(55, .9, 1.1, 0, 0, 0)]),
      AL: T([0, r()], [.2, r(8)], [.45, r(-12)], [1, r(-16)]),
      AR: T([0, r()], [.2, r(-6)], [.45, r(10)], [1, r(14)]),
      P:  T([0, p()], [.2, p(0, 3, 4)], [.45, p(0, -6, -8)], [1, p()]),
    } },
    greet: { d: 2700, tr: {
      H:  T([0, t()], [.08, t(0, 1.04, .95)], [.24, t(-1.5, .985, 1.02, -2.5)], [.36, t(-.5, 1, 1, -1)], [.48, t(-1.5, .985, 1.02, -2.5)],
            [.6, t(-.5, 1, 1, -1)], [.72, t(-1.5, .985, 1.02, -2.5)], [.88, t(0, 1.03, .965)], [1, t()]),
      P:  T([0, p()], [.08, p(0, 2, 0)], [.24, p(...UP, 24)], [.36, p(...UP, -4)], [.48, p(...UP, 26)], [.6, p(...UP, -4)],
            [.72, p(...UP, 24)], [.8, p(66, -88, 12)], [.94, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.08, r(-4)], [.24, r(8)], [.36, r(-5)], [.48, r(7)], [.6, r(-5)], [.72, r(6)], [.88, r(-3)], [1, r()]),
      AR: T([0, r()], [.08, r(3)], [.24, r(-7)], [.36, r(5)], [.48, r(-6)], [.6, r(5)], [.72, r(-5)], [.88, r(3)], [1, r()]),
      E:  T([0, e()], [.38, e()], [.42, e(.12, 0)], [.7, e(.12, 0)], [.74, e()], [1, e()]),
      EH: T([0, o(0)], [.4, o(0)], [.42, o(1)], [.7, o(1)], [.725, o(0)], [1, o(0)]),
      M:  T([0, m()], [.24, m()], [.3, m(1, 1, 1)], [.74, m(1, 1, 1)], [.8, m()], [1, m()]),
    } },
    nod: { d: 1000, look: [[0, 2, 4], [360, 0, 0], [540, 2, 4], [760, null]], tr: {
      H:  T([0, t()], [.18, t(1, 1.03, .95, 3)], [.36, t(-.5, .99, 1.015, -1)], [.54, t(1, 1.03, .95, 3)], [.74, t(-.5, .99, 1.01, -.5)], [1, t()]),
      AL: T([0, r()], [.18, r(-6)], [.36, r(8)], [.54, r(-6)], [.74, r(7)], [.88, r(-2)], [1, r()]),
      AR: T([0, r()], [.18, r(-5)], [.36, r(7)], [.54, r(-5)], [.74, r(6)], [.88, r(-2)], [1, r()]),
      P:  T([0, p()], [.18, p(0, 1, 3)], [.36, p(0, -2, -3)], [.54, p(0, 1, 3)], [.74, p(0, -1, -2)], [1, p()]),
      E:  T([0, e()], [.5, e()], [.56, e(.12)], [.64, e()], [1, e()]),
    } },
    shake: { d: 1150, tr: {
      H:  T([0, t()], [.1, t(0, 1.02, .97)], [.22, t(0, 1, 1, -4, -3)], [.36, t(0, 1, 1, 4, 3)], [.5, t(0, 1, 1, -3.5, -2.5)],
            [.64, t(0, 1, 1, 3, 2)], [.76, t(0, 1, 1, -1.5, -1)], [.88, t(0, 1.02, .975)], [1, t()]),
      AL: T([0, r()], [.1, r(-5)], [.22, r(9)], [.36, r(-10)], [.5, r(8)], [.64, r(-8)], [.76, r(5)], [.88, r(-6)], [1, r()]),
      AR: T([0, r()], [.1, r(5)], [.22, r(8)], [.36, r(-9)], [.5, r(7)], [.64, r(-7)], [.76, r(4)], [.88, r(5)], [1, r()]),
      P:  T([0, p()], [.22, p(-3, 0, -4)], [.36, p(3, 0, 4)], [.5, p(-3, 0, -3)], [.64, p(2, 0, 3)], [.88, p()], [1, p()]),
      E:  T([0, e()], [.1, e(.5)], [.76, e(.5)], [.88, e()], [1, e()]),
    } },
    success: { d: 2300, fx: [[.22, 'spark', 1100], [.52, 'spark', 1100]], tr: {
      H:  T([0, t()], [.08, t(0, 1.11, .85)], [.24, t(-15, .94, 1.08)], [.4, t(0, 1.09, .88)], [.54, t(-9, .97, 1.04)],
            [.68, t(0, 1.07, .9)], [.8, t(-1, .985, 1.025)], [.92, t(0, 1.01, .99)], [1, t()]),
      P:  T([0, p()], [.08, p(0, 3, -4)], [.24, p(66, -92, 22)], [.4, p(64, -82, -6)], [.54, p(66, -92, 24)], [.68, p(64, -84, 0)],
            [.8, p(40, -50, 10)], [.93, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.08, r(-8)], [.24, r(-14)], [.4, r(14)], [.54, r(-10)], [.68, r(11)], [.8, r(-5)], [.92, r(2)], [1, r()]),
      AR: T([0, r()], [.08, r(6)], [.24, r(12)], [.4, r(-12)], [.54, r(9)], [.68, r(-9)], [.8, r(4)], [.92, r(-2)], [1, r()]),
      E:  T([0, e()], [.06, e(1, 1, 1.14)], [.1, e(1, 1, 1.14)], [.145, e(.12, 0)], [.74, e(.12, 0)], [.785, e()], [1, e()]),
      EH: T([0, o(0)], [.12, o(0)], [.145, o(1)], [.74, o(1)], [.77, o(0)], [1, o(0)]),
      M:  T([0, m()], [.1, m()], [.16, m(1, 1, 1.1)], [.24, m(1, 1.05, 1.25)], [.68, m(1, 1, 1)], [.76, m()], [1, m()]),
    } },
    notify: { d: 1550, look: [[300, 8, -5], [1350, null]], fx: [[.16, 'bang', 1250]], tr: {
      H:  T([0, t()], [.1, t(0, 1.07, .9)], [.26, t(-9, .96, 1.06)], [.42, t(0, 1.06, .92)], [.56, t(-1, .99, 1.02)], [.7, t(0, 1, 1, -2)], [.88, t(0, 1, 1, -2)], [1, t()]),
      AL: T([0, r()], [.1, r(-6)], [.26, r(14)], [.42, r(6)], [.56, r(13)], [.88, r(11)], [1, r()]),
      AR: T([0, r()], [.1, r(5)], [.26, r(-8)], [.42, r(4)], [.56, r(-6)], [.88, r(-5)], [1, r()]),
      P:  T([0, p()], [.1, p(0, 2, 0)], [.26, p(50, -75, 35)], [.42, p(54, -80, 28)], [.56, p(52, -78, 34)], [.86, p(52, -78, 32)], [1, p()]),
      E:  T([0, e()], [.1, e()], [.26, e(1, 1, 1.16)], [.88, e(1, 1, 1.14)], [1, e()]),
    } },
    curious: { d: 2300, look: [[400, 9, 2], [1000, 9, -3], [1500, 9, 3], [1950, null]], tr: {
      H:  T([0, t()], [.14, t(0, 1.02, .97)], [.3, t(-1, 1, 1, 5, 2)], [.5, t(-1, 1, 1, 5, 2)], [.62, t(-1.3, 1, 1, 3.5, 1.5)], [.8, t(-1, 1, 1, 5, 2)], [.92, t(0, 1.015, .985)], [1, t()]),
      AL: T([0, r()], [.14, r(-5)], [.3, r(15)], [.5, r(13)], [.65, r(16)], [.8, r(13)], [1, r()]),
      AR: T([0, r()], [.14, r(4)], [.3, r(-10)], [.5, r(8)], [.65, r(-6)], [.8, r(8)], [1, r()]),
      P:  T([0, p()], [.3, p(10, -30, -14)], [.5, p(10, -30, -14)], [.62, p(10, -34, -10)], [.8, p(10, -30, -14)], [1, p()]),
      E:  T([0, e()], [.3, e(1, 1, 1.16)], [.44, e(1, 1, 1.16)], [.48, e(.12, 1, 1.16)], [.52, e(1, 1, 1.16)], [.64, e(1, 1, 1.16)],
            [.68, e(.12, 1, 1.16)], [.72, e(1, 1, 1.16)], [.85, e(1, 1, 1.16)], [1, e()]),
    } },
    smile: { d: 1500, tr: {
      H:  T([0, t()], [.12, t(0, 1.04, .95)], [.3, t(-3, .98, 1.03)], [.46, t(0, 1.03, .96)], [.62, t(-2, .985, 1.02)], [.78, t(0, 1.02, .975)], [1, t()]),
      AL: T([0, r()], [.12, r(-5)], [.3, r(8)], [.46, r(-7)], [.62, r(6)], [.78, r(-4)], [1, r()]),
      AR: T([0, r()], [.12, r(4)], [.3, r(-7)], [.46, r(6)], [.62, r(-5)], [.78, r(3)], [1, r()]),
      P:  T([0, p()], [.3, p(0, -6, -6)], [.46, p(0, 2, 4)], [.62, p(0, -4, -4)], [.78, p(0, 1, 2)], [1, p()]),
      E:  T([0, e()], [.1, e()], [.15, e(.12, 0)], [.78, e(.12, 0)], [.83, e()], [1, e()]),
      EH: T([0, o(0)], [.12, o(0)], [.15, o(1)], [.78, o(1)], [.81, o(0)], [1, o(0)]),
    } },
    /* bucles: entrada (se queda sostenida) → vuelta que se repite → salida al reposo */
    think: { loop: true, look: [[150, 7, -5]], fxOn: 'dots',
      in: { d: 720, tr: {
        H:  T([0, t()], [.3, t(0, 1.02, .975)], [.75, t(-.5, 1, 1, -2)], [1, t(0, 1, 1, -1.5)]),
        P:  T([0, p()], [.25, p(0, 3, 0)], [.75, p(16, -70, -30)], [.88, p(13, -63, -24)], [1, p(...CHIN)]),
        AL: T([0, r()], [.5, r(10)], [1, r(8)]),
        AR: T([0, r()], [.5, r(-4)], [1, r(6)]),
      } },
      cycle: { d: 2800, look: [[0, 7, -5], [1400, -6, -5]], tr: {
        H:  T([0, t(0, 1, 1, -1.5)], [.5, t(-.6, 1, 1, 1.5, .5)], [1, t(0, 1, 1, -1.5)]),
        P:  T([0, p(...CHIN)], [.12, p(14, -70, -21)], [.24, p(...CHIN)], [.36, p(14, -70, -21)], [.48, p(...CHIN)], [1, p(...CHIN)]),
        AL: T([0, r(8)], [.5, r(-4)], [1, r(8)]),
        AR: T([0, r(6)], [.5, r(-6)], [1, r(6)]),
      } },
      out: { d: 640, tr: {
        H:  T([0, t(0, 1, 1, -1.5)], [.4, t(0, 1.02, .975)], [1, t()]),
        P:  T([0, p(...CHIN)], [.2, p(15, -69, -28)], [.85, p(-2, 2, -3)], [1, p()]),
        AL: T([0, r(8)], [.5, r(-3)], [1, r()]),
        AR: T([0, r(6)], [.5, r(-3)], [1, r()]),
        E:  T([0, e()], [.45, e()], [.55, e(.12)], [.68, e()], [1, e()]),
      } },
    },
    sleep: { loop: true, fxOn: 'zz',
      in: { d: 2000, tr: {   /* bostezo y a dormir */
        H:  T([0, t()], [.12, t(0, 1.02, .975)], [.38, t(-1.5, .96, 1.06)], [.55, t(-1.5, .96, 1.06)], [.8, t(0, 1.06, .91)], [.9, t(0, 1.04, .935)], [1, t(...SUNK)]),
        M:  T([0, m()], [.14, m()], [.34, m(1, 1.1, 1.5)], [.52, m(1, 1.1, 1.5)], [.66, m()], [1, m()]),
        E:  T([0, e()], [.2, e(.5)], [.38, e(.25)], [.52, e(.3)], [.62, e(.6)], [.72, e(.12, 0)], [1, e(.12, 0)]),
        ES: T([0, o(0)], [.7, o(0)], [.76, o(1)], [1, o(1)]),
        AL: T([0, r()], [.38, r(12)], [.55, r(12)], [.8, r(-20)], [1, r(-16)]),
        AR: T([0, r()], [.38, r(-8)], [.55, r(-8)], [.8, r(18)], [1, r(14)]),
        P:  T([0, p()], [.14, p(0, 2, 0)], [.36, p(...CHIN)], [.54, p(...CHIN)], [.8, p(0, 3, 2)], [1, p(0, 3, 2)]),
      } },
      cycle: { d: 4200, tr: {
        H:  T([0, t(...SUNK)], [.5, t(0, 1.03, .95)], [1, t(...SUNK)]),
        AL: T([0, r(-16)], [.5, r(-13)], [1, r(-16)]),
        AR: T([0, r(14)], [.5, r(11)], [1, r(14)]),
      } },
      out: { d: 1150, tr: {   /* parpadea, se estira y despierta */
        ES: T([0, o(1)], [.2, o(1)], [.26, o(0)], [1, o(0)]),
        E:  T([0, e(.12, 0)], [.2, e(.12, 0)], [.28, e(.5)], [.4, e(.2)], [.52, e()], [.6, e(.12)], [.68, e()], [1, e()]),
        H:  T([0, t(...SUNK)], [.35, t(-1.5, .97, 1.05)], [.7, t(0, 1.03, .97)], [1, t()]),
        AL: T([0, r(-16)], [.35, r(10)], [.7, r(-4)], [1, r()]),
        AR: T([0, r(14)], [.35, r(-8)], [.7, r(3)], [1, r()]),
        P:  T([0, p(0, 3, 2)], [.35, p(0, -6, -6)], [.7, p(0, 2, 2)], [1, p()]),
      } },
    },

    /* ================= acciones del usuario ================= */
    search: { d: 3200, item: 'lupa', look: [[250, 9, 3], [1050, 7, 5], [1600, 9, 1], [2150, 7, 5], [2650, null]], tr: {
      IT: T([0, it(0, 15, -20, 0, 0)], [.1, it(0, 0, 0, 1.15)], [.16, it()], [.32, it(-22, 34, -14)], [.48, it(14, 40, 12)], [.64, it(-22, 34, -14)], [.78, it()], [.88, it()], [.95, it(0, 12, 20, 0, 0)], [1, it(0, 15, -20, 0, 0)]),
      P:  T([0, p()], [.1, p(...UP, 10)], [.16, p(...UP, 8)], [.32, p(48, -62, 32)], [.48, p(72, -56, 50)], [.64, p(48, -62, 32)], [.78, p(...UP, 8)], [.9, p(...UP, 10)], [.97, p(-2, 2, -3)], [1, p()]),
      H:  T([0, t()], [.08, t(0, 1.03, .96)], [.16, t(-1, .99, 1.02)], [.32, t(0, 1.01, .98, 5, 2)], [.48, t(0, 1.01, .98, 7, 3)], [.64, t(0, 1.01, .98, 5, 2)], [.78, t(-1, .99, 1.02, 1)], [.9, t(0, 1.03, .97)], [1, t()]),
      AL: T([0, r()], [.16, r(12)], [.32, r(14)], [.48, r(7)], [.64, r(14)], [.78, r(6)], [.9, r(-4)], [1, r()]),
      AR: T([0, r()], [.16, r(-6)], [.32, r(8)], [.48, r(-4)], [.64, r(8)], [.78, r(-4)], [.9, r(3)], [1, r()]),
      E:  T([0, e()], [.16, e(1, 1, 1.14)], [.76, e(1, 1, 1.14)], [.82, e(.12, 1, 1.1)], [.88, e()], [1, e()]),
      PR: T([0, pr()], [.32, pr()], [.4, pr(0, 0, -2)], [.48, pr(0, 0, 2)], [.56, pr(0, 0, -2)], [.66, pr()], [1, pr()]),
    } },
    save: { d: 3000, item: 'pencil', look: [[200, 9, 5], [2250, null]], fx: [[.76, 'ok', 800]], tr: {
      IT: T([0, it(0, 15, -20, 0, 0)], [.1, it(0, 0, 0, 1.15)], [.16, it()], [.28, it(-10, 48, -10)], [.34, it(4, 44, -4)], [.4, it(-8, 54, -12)], [.46, it(6, 50, -4)], [.52, it(-6, 60, -12)],
            [.58, it(8, 56, -4)], [.66, it(0, 50, -8)], [.76, it()], [.86, it()], [.94, it(0, 12, 20, 0, 0)], [1, it(0, 15, -20, 0, 0)]),
      P:  T([0, p()], [.1, p(...UP, 10)], [.28, p(54, -56, 40)], [.34, p(60, -58, 44)], [.4, p(54, -52, 38)], [.46, p(60, -55, 44)], [.52, p(54, -48, 38)], [.58, p(60, -51, 44)],
            [.66, p(56, -54, 40)], [.76, p(...UP, 10)], [.88, p(...UP, 10)], [.96, p(-2, 2, -3)], [1, p()]),
      H:  T([0, t()], [.08, t(0, 1.03, .96)], [.28, t(0, 1.01, .98, 5, 2)], [.4, t(0, 1.015, .975, 5.5, 2)], [.52, t(0, 1.01, .98, 5, 2)], [.66, t(0, 1.015, .975, 5, 2)], [.76, t(-3, .98, 1.03)], [.88, t(0, 1.03, .97)], [1, t()]),
      AL: T([0, r()], [.28, r(12)], [.4, r(9)], [.52, r(12)], [.66, r(9)], [.76, r(-8)], [.88, r(6)], [1, r()]),
      AR: T([0, r()], [.28, r(8)], [.4, r(5)], [.52, r(8)], [.66, r(5)], [.76, r(-6)], [.88, r(4)], [1, r()]),
      E:  T([0, e()], [.28, e(.68)], [.7, e(.68)], [.75, e(.12, 0)], [.9, e(.12, 0)], [.94, e()], [1, e()]),
      EH: T([0, o(0)], [.73, o(0)], [.75, o(1)], [.9, o(1)], [.925, o(0)], [1, o(0)]),
      PR: T([0, pr()], [.3, pr()], [.34, pr(0, 1, 0, 1.015, .985)], [.4, pr()], [.46, pr(0, 1, 0, 1.015, .985)], [.52, pr()], [.58, pr(0, 1, 0, 1.015, .985)], [.66, pr()], [1, pr()]),
    } },
    export: { d: 2900, item: 'paper', look: [[200, 9, 0], [1200, 9, -5], [2150, null]], fx: [[.52, 'up', 650], [.74, 'ok', 750]], tr: {
      IT: T([0, it(0, 15, -20, 0, 0)], [.1, it(0, 0, 0, 1.15)], [.16, it()], [.34, it(-40, -6, -30)], [.42, it(-44, -4, -34)], [.52, it(60, -70, 40, .9)], [.64, it(170, -150, 90, .6, 0)], [1, it(170, -150, 90, .6, 0)]),
      P:  T([0, p()], [.1, p(...UP, 10)], [.34, p(40, -92, -30)], [.42, p(38, -90, -34)], [.52, p(78, -80, 60)], [.64, p(70, -70, 50)], [.82, p(20, -20, 10)], [.94, p(-2, 2, -3)], [1, p()]),
      H:  T([0, t()], [.1, t(0, 1.03, .96)], [.34, t(0, 1.02, .98, -6, -2)], [.42, t(0, 1.04, .96, -7, -2)], [.52, t(-2, .98, 1.03, 7, 3)], [.64, t(0, 1.02, .98, 4, 2)], [.8, t(0, 1.02, .98)], [1, t()]),
      AL: T([0, r()], [.34, r(12)], [.42, r(14)], [.52, r(-16)], [.64, r(10)], [.8, r(-5)], [1, r()]),
      AR: T([0, r()], [.34, r(10)], [.42, r(12)], [.52, r(-14)], [.64, r(8)], [.8, r(-4)], [1, r()]),
      E:  T([0, e()], [.34, e(.7)], [.42, e(.55)], [.52, e(1, 1, 1.12)], [.74, e(1, 1, 1.05)], [.8, e(.12)], [.87, e()], [1, e()]),
    } },
    approve: { d: 3300, item: 'envelope', look: [[200, 9, 0], [1550, 9, -3], [2800, null]], tr: {
      IT: T([0, it(0, 15, -20, 0, 0)], [.1, it(0, 0, 0, 1.15)], [.16, it()], [.3, it(30, 10, 8)], [.38, it(34, 8, 10)], [.5, it(90, -20, -10, .9)], [.6, it(140, -50, 12, .8, .8)], [.7, it(200, -90, -8, .6, 0)], [1, it(200, -90, -8, .6, 0)]),
      P:  T([0, p()], [.1, p(...UP, 10)], [.3, p(78, -70, 50)], [.38, p(80, -70, 52)], [.5, p(74, -72, 46)], [.6, p(...UP, 24)], [.68, p(...UP, -2)], [.76, p(...UP, 22)], [.86, p(40, -40, 10)], [.95, p(-2, 2, -3)], [1, p()]),
      H:  T([0, t()], [.1, t(0, 1.03, .96)], [.3, t(0, 1.01, .98, 5, 2)], [.38, t(0, 1.01, .98, 6, 2)], [.5, t(-1, .99, 1.02, 3, 1)], [.6, t(-1.5, .985, 1.02, -2)], [.68, t(-.5, 1, 1, -1)], [.76, t(-1.5, .985, 1.02, -2)],
            [.86, t(1, 1.03, .95, 3)], [.93, t(-.5, .99, 1.01)], [1, t()]),
      AL: T([0, r()], [.3, r(10)], [.5, r(-6)], [.6, r(8)], [.68, r(-5)], [.76, r(7)], [.86, r(-6)], [.93, r(4)], [1, r()]),
      AR: T([0, r()], [.3, r(7)], [.5, r(-5)], [.6, r(-7)], [.68, r(5)], [.76, r(-6)], [.86, r(-5)], [.93, r(3)], [1, r()]),
      E:  T([0, e()], [.5, e()], [.56, e(.12, 0)], [.8, e(.12, 0)], [.84, e()], [1, e()]),
      EH: T([0, o(0)], [.54, o(0)], [.56, o(1)], [.8, o(1)], [.825, o(0)], [1, o(0)]),
    } },
    archive: { d: 3400, item: 'box', look: [[200, 9, 5], [850, 0, 0], [1400, 9, 5], [2900, null]], fx: [[.58, 'puff', 800]], tr: {
      IT: T([0, it(0, 75, 0, 0, 0)], [.1, it(0, 62, 0, 1.15)], [.16, it(0, 62)], [.5, it(0, 62)], [.56, it(0, 66, 0, 1.1, 1, .84)], [.64, it(0, 62)], [.84, it(0, 62)], [.93, it(0, 75, 0, 0, 0)], [1, it(0, 75, 0, 0, 0)]),
      H:  T([0, t()], [.1, t(0, 1.02, .975)], [.22, t(0, 1, 1, -3, -1)], [.32, t(0, 1, 1, 3, 1)], [.42, t(0, 1, 1, -2, -.5)], [.5, t(-2, .98, 1.03)], [.56, t(0, 1.05, .94, 4, 2)], [.64, t(0, 1.01, .99, 3, 1)], [.84, t(0, 1.01, .99, 2, 1)], [.93, t(0, 1.02, .975)], [1, t()]),
      P:  T([0, p()], [.16, p(20, -30, 10)], [.22, p(30, -40, 20)], [.32, p(24, -34, 12)], [.42, p(30, -40, 20)], [.5, p(60, -72, 60)], [.56, p(56, -30, 70)], [.64, p(56, -38, 68)], [.72, p(44, -36, 60)], [.8, p(56, -38, 68)], [.93, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.22, r(-8)], [.32, r(8)], [.42, r(-6)], [.5, r(10)], [.56, r(-14)], [.64, r(8)], [.84, r(4)], [1, r()]),
      AR: T([0, r()], [.22, r(8)], [.32, r(-8)], [.42, r(6)], [.5, r(-8)], [.56, r(-12)], [.64, r(6)], [.84, r(3)], [1, r()]),
      MS: T([0, ms(1)], [.18, ms(1)], [.24, ms(.14)], [.5, ms(.14)], [.6, ms(1)], [1, ms(1)]),
      E:  T([0, e()], [.2, e(.78)], [.36, e(.12)], [.4, e(.78)], [.5, e(.6)], [.56, e(.12)], [.64, e()], [1, e()]),
    } },

    /* ================= estados del sistema ================= */
    empty: { d: 3100, look: [[200, 9, 5], [800, -8, 2], [1300, 8, 0], [1800, 0, 0], [2650, null]], fx: [[.54, 'q', 1250]], tr: {
      H:  T([0, t()], [.1, t(0, 1.02, .97, 6, 2)], [.24, t(0, 1.02, .97, 6, 2)], [.32, t(0, 1, 1, -4, -2)], [.46, t(0, 1, 1, 4, 2)], [.58, t(-3, .97, 1.05)], [.78, t(-3, .97, 1.05)], [.89, t(0, 1.03, .97)], [1, t()]),
      P:  T([0, p()], [.1, p(30, -30, 30)], [.24, p(30, -30, 30)], [.34, p()], [.5, p()], [.58, p(62, -72, 62)], [.68, p(62, -76, 58)], [.78, p(62, -72, 62)], [.92, p(-2, 2, -3)], [1, p()]),
      PR: T([0, pr()], [.1, pr(-4, -6, -14)], [.24, pr(-4, -6, -12)], [.34, pr(0, 2, 0, 1.04, .96)], [.42, pr()], [1, pr()]),
      AL: T([0, r()], [.1, r(10)], [.32, r(-8)], [.46, r(9)], [.58, r(-17)], [.78, r(-15)], [.89, r(5)], [1, r()]),
      AR: T([0, r()], [.1, r(6)], [.32, r(-9)], [.46, r(8)], [.58, r(17)], [.78, r(15)], [.89, r(-4)], [1, r()]),
      MS: T([0, ms(1)], [.5, ms(1)], [.58, ms(.14)], [.8, ms(.14)], [.9, ms(1)], [1, ms(1)]),
      E:  T([0, e()], [.28, e()], [.31, e(.12)], [.35, e()], [.58, e(1, 1, 1.1)], [.78, e(1, 1, 1.1)], [.83, e(.12)], [.89, e()], [1, e()]),
    } },
    locked: { d: 3000, item: 'lock', look: [[200, 9, 3], [2400, null]], tr: {
      IT: T([0, it(10, 32, 0, 0, 0)], [.1, it(10, 20, 0, 1.15)], [.16, it(10, 20)], [.32, it(10, 20)], [.36, it(10, 20, -11)], [.4, it(10, 20, 11)], [.44, it(10, 20, -9)], [.48, it(10, 20, 8)], [.52, it(10, 20)], [.86, it(10, 20)], [.94, it(10, 32, 0, 0, 0)], [1, it(10, 32, 0, 0, 0)]),
      P:  T([0, p()], [.16, p(0, 2, 0)], [.32, p(56, -52, 52)], [.36, p(54, -52, 46)], [.4, p(58, -52, 58)], [.44, p(54, -52, 46)], [.48, p(58, -52, 56)], [.56, p(30, -30, 20)], [.66, p()], [1, p()]),
      H:  T([0, t()], [.1, t(0, 1.02, .975)], [.32, t(0, 1.01, .98, 5, 2)], [.5, t(0, 1.01, .98, 5, 2)], [.58, t(0, 1, 1, -4, -3)], [.66, t(0, 1, 1, 4, 3)], [.74, t(0, 1, 1, -3, -2)], [.82, t(0, 1, 1, 2, 1.5)], [.91, t(0, 1.02, .975)], [1, t()]),
      AL: T([0, r()], [.32, r(10)], [.5, r(-8)], [.58, r(8)], [.66, r(-14)], [.74, r(4)], [.82, r(-14)], [.91, r(-8)], [1, r()]),
      AR: T([0, r()], [.32, r(7)], [.5, r(8)], [.58, r(14)], [.66, r(-4)], [.74, r(14)], [.82, r(2)], [.91, r(8)], [1, r()]),
      MS: T([0, ms(1)], [.48, ms(1)], [.56, ms(-.7)], [.86, ms(-.7)], [.94, ms(1)], [1, ms(1)]),
      E:  T([0, e()], [.5, e()], [.56, e(.68)], [.86, e(.68)], [.93, e()], [1, e()]),
    } },
    offline: { d: 3400, item: 'wifi', look: [[200, 3, -5], [900, -6, -5], [1500, 7, -5], [2350, 0, 2], [3000, null]], tr: {
      IT: T([0, it(-12, -104, 0, 0, 0)], [.14, it(-12, -118, 0, 1.12)], [.2, it(-12, -118)], [.32, it(-12, -118, 0, 1, .3)], [.44, it(-12, -118)], [.56, it(-12, -118, 0, 1, .3)], [.68, it(-12, -118)], [.84, it(-12, -118)], [.92, it(-12, -104, 0, 0, 0)], [1, it(-12, -104, 0, 0, 0)]),
      AL: T([0, r()], [.1, r(6)], [.22, r(22)], [.36, r(-6)], [.5, r(22)], [.64, r(4)], [.76, r(-17)], [.9, r(-13)], [1, r()]),
      AR: T([0, r()], [.1, r(-4)], [.22, r(-14)], [.36, r(12)], [.5, r(-14)], [.64, r(8)], [.76, r(17)], [.9, r(12)], [1, r()]),
      H:  T([0, t()], [.1, t(0, 1.03, .96)], [.22, t(-2, .97, 1.05)], [.36, t(-2, .97, 1.05, -3)], [.5, t(-2, .97, 1.05, 3)], [.64, t(-1, .98, 1.03)], [.76, t(0, 1.04, .94)], [.9, t(0, 1.03, .96)], [1, t()]),
      P:  T([0, p()], [.22, p(10, -26, -16)], [.36, p(14, -30, -8)], [.5, p(10, -26, -16)], [.64, p(6, -12, -6)], [.76, p(0, 3, 4)], [1, p()]),
      MS: T([0, ms(1)], [.66, ms(1)], [.74, ms(.14)], [.9, ms(.14)], [.96, ms(1)], [1, ms(1)]),
      E:  T([0, e()], [.2, e(1, 1, 1.08)], [.64, e(1, 1, 1.08)], [.76, e(.6)], [.9, e(.6)], [.96, e()], [1, e()]),
    } },
    expiring: { d: 3400, item: 'clock', look: [[200, 9, 0], [1950, 0, 0], [3000, null]], tr: {
      IT: T([0, it(0, 15, -20, 0, 0)], [.1, it(0, 0, 0, 1.15)], [.16, it()], [.24, it(0, 0, -12)], [.28, it(0, 0, 12)], [.32, it(0, 0, -12)], [.36, it(0, 0, 12)], [.4, it(0, 0, -8)], [.44, it()], [.86, it()], [.94, it(0, 12, 20, 0, 0)], [1, it(0, 15, -20, 0, 0)]),
      P:  T([0, p()], [.1, p(...UP, 10)], [.24, p(...UP, 5)], [.28, p(...UP, 15)], [.32, p(...UP, 5)], [.36, p(...UP, 15)], [.44, p(...UP, 10)], [.86, p(...UP, 10)], [.96, p(-2, 2, -3)], [1, p()]),
      H:  T([0, t()], [.1, t(0, 1.03, .96)], [.16, t(0, 1, 1, 3, 1)], [.26, t(-1, .99, 1.02, 3, 1)], [.34, t(0, 1.01, .99, 3, 1)], [.44, t(0, 1, 1, 3, 1)], [.52, t(0, 1.02, .975)], [.62, t(-1.5, .96, 1.06)], [.72, t(-1.5, .96, 1.06)], [.82, t(0, 1.04, .95)], [.92, t(0, 1.01, .99)], [1, t()]),
      M:  T([0, m()], [.52, m()], [.6, m(1, 1.1, 1.5)], [.72, m(1, 1.1, 1.5)], [.8, m()], [1, m()]),
      E:  T([0, e()], [.16, e(1, 1, 1.1)], [.44, e(1, 1, 1.1)], [.52, e(.5)], [.62, e(.25)], [.72, e(.3)], [.8, e(.7)], [.86, e(.12)], [.92, e()], [1, e()]),
      AL: T([0, r()], [.16, r(10)], [.26, r(4)], [.34, r(10)], [.44, r(6)], [.62, r(13)], [.72, r(13)], [.82, r(-12)], [.92, r(4)], [1, r()]),
      AR: T([0, r()], [.16, r(7)], [.26, r(2)], [.34, r(7)], [.44, r(4)], [.62, r(-9)], [.72, r(-9)], [.82, r(11)], [.92, r(-3)], [1, r()]),
    } },

    /* ================= guía y ayuda ================= */
    tip: { d: 2900, item: 'bulb', look: [[250, 0, -5], [1350, 0, 0], [2400, null]], fx: [[.16, 'spark', 1000]], tr: {
      IT: T([0, it(-12, -104, 0, 0, 0)], [.14, it(-12, -126, 0, 1.28)], [.2, it(-12, -120)], [.32, it(-12, -120, 0, 1.12)], [.44, it(-12, -120)], [.56, it(-12, -120, 0, 1.12)], [.68, it(-12, -120)], [.84, it(-12, -120)], [.93, it(-12, -104, 0, 0, 0)], [1, it(-12, -104, 0, 0, 0)]),
      H:  T([0, t()], [.08, t(0, 1.06, .92)], [.18, t(-7, .96, 1.06)], [.3, t(0, 1.05, .94)], [.4, t(-1, .99, 1.02)], [.84, t(-1, .99, 1.02)], [.93, t(0, 1.02, .98)], [1, t()]),
      P:  T([0, p()], [.08, p(0, 3, 0)], [.2, p(62, -96, -14)], [.32, p(62, -101, -16)], [.44, p(62, -96, -14)], [.56, p(62, -101, -16)], [.68, p(62, -96, -14)], [.84, p(62, -96, -14)], [.95, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.08, r(-8)], [.18, r(16)], [.3, r(10)], [.4, r(14)], [.84, r(13)], [.93, r(-4)], [1, r()]),
      AR: T([0, r()], [.08, r(6)], [.18, r(-10)], [.3, r(-5)], [.4, r(-8)], [.84, r(-7)], [.93, r(3)], [1, r()]),
      E:  T([0, e()], [.08, e()], [.16, e(1, 1, 1.18)], [.84, e(1, 1, 1.14)], [.9, e(.12)], [.95, e()], [1, e()]),
      MO: T([0, oo()], [.1, oo()], [.16, oo(1, 1.1)], [.22, oo(1, 1)], [.4, oo(1, 1)], [.48, oo()], [1, oo()]),
      MS: T([0, ms()], [.1, ms()], [.15, ms(.3, 0)], [.42, ms(.3, 0)], [.5, ms()], [1, ms()]),
    } },

    /* ---------- con objeto (hoja / mochila); sin objeto también funcionan ---------- */
    download: { d: 3000, look: [[200, 9, 4], [2350, null]], fx: [[.14, 'down', 1750], [.76, 'ok', 900]], tr: {
      H:  T([0, t()], [.08, t(0, 1.03, .96)], [.16, t(-1, .99, 1.02, 3, 1)], [.28, t(0, 1.03, .96, 3, 1)], [.36, t(-1, .99, 1.02, 3, 1)],
            [.46, t(0, 1.03, .96, 3, 1)], [.54, t(-1, .99, 1.02, 3, 1)], [.64, t(0, 1.03, .96, 3, 1)], [.72, t(-1, .99, 1.02, 3, 1)],
            [.81, t(-5, .97, 1.05)], [.9, t(0, 1.05, .94)], [1, t()]),
      P:  T([0, p()], [.16, p(...ONP)], [.28, p(40, -45, 46)], [.36, p(...ONP)], [.46, p(40, -45, 46)], [.54, p(...ONP)], [.64, p(40, -45, 46)],
            [.72, p(...ONP)], [.81, p(66, -92, 20)], [.93, p(-2, 2, -3)], [1, p()]),
      PR: T([0, pr()], [.2, pr()], [.28, pr(0, 3, 0, 1.06, .92)], [.36, pr()], [.46, pr(0, 3, 0, 1.06, .92)], [.54, pr()], [.64, pr(0, 3, 0, 1.06, .92)],
            [.72, pr()], [.81, pr(0, -12, -6)], [.9, pr(0, 2, 0, 1.05, .94)], [1, pr()]),
      AL: T([0, r()], [.16, r(8)], [.28, r(-5)], [.36, r(6)], [.46, r(-5)], [.54, r(6)], [.64, r(-5)], [.72, r(6)], [.81, r(-10)], [.9, r(9)], [1, r()]),
      AR: T([0, r()], [.16, r(6)], [.28, r(-4)], [.36, r(5)], [.46, r(-4)], [.54, r(5)], [.64, r(-4)], [.72, r(5)], [.81, r(8)], [.9, r(-7)], [1, r()]),
      E:  T([0, e()], [.75, e()], [.79, e(.12, 0)], [.9, e(.12, 0)], [.94, e()], [1, e()]),
      EH: T([0, o(0)], [.77, o(0)], [.79, o(1)], [.9, o(1)], [.925, o(0)], [1, o(0)]),
    } },
    upload: { d: 3000, look: [[150, 9, 4], [650, 7, -5], [2300, null]], fx: [[.22, 'up', 1500], [.78, 'ok', 900]], tr: {
      H:  T([0, t()], [.1, t(0, 1.09, .87)], [.22, t(-2, .95, 1.08, -2)], [.34, t(-3, .94, 1.09, -2)], [.46, t(-2, .95, 1.08, -2)], [.58, t(-3, .94, 1.09, -2)],
            [.7, t(-2, .95, 1.08, -2)], [.8, t(0, 1.06, .92)], [.9, t(-1, .99, 1.02)], [1, t()]),
      PR: T([0, pr()], [.1, pr(0, 4, 0, 1.05, .93)], [.22, pr(-10, -95, -8)], [.34, pr(-10, -104, -5)], [.46, pr(-10, -95, -8)], [.58, pr(-10, -104, -5)],
            [.7, pr(-10, -95, -8)], [.8, pr(0, 3, 0, 1.06, .92)], [.9, pr(0, -4, 2)], [1, pr()]),
      P:  T([0, p()], [.1, p(20, -10, 30)], [.22, p(64, -96, 6)], [.34, p(64, -102, 2)], [.46, p(64, -96, 6)], [.58, p(64, -102, 2)], [.7, p(64, -96, 6)],
            [.8, p(...ONP)], [.92, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.1, r(-8)], [.22, r(10)], [.34, r(6)], [.46, r(10)], [.58, r(6)], [.7, r(10)], [.8, r(-9)], [.9, r(5)], [1, r()]),
      AR: T([0, r()], [.1, r(6)], [.22, r(-8)], [.34, r(-4)], [.46, r(-8)], [.58, r(-4)], [.7, r(-8)], [.8, r(8)], [.9, r(-4)], [1, r()]),
      E:  T([0, e()], [.1, e(.6)], [.22, e(1, 1, 1.1)], [.7, e(1, 1, 1.1)], [.8, e(.12)], [.88, e()], [1, e()]),
    } },
    angry: { d: 3100, fx: [[.2, 'mad', 1900], [.3, 'puff', 900], [.56, 'puff', 900]], tr: {
      BR: T([0, br()], [.12, br()], [.2, br(1, 0)], [.8, br(1, 0)], [.9, br()], [1, br()]),
      MS: T([0, ms(1)], [.12, ms(1)], [.2, ms(-1)], [.8, ms(-1)], [.9, ms(1)], [1, ms(1)]),
      E:  T([0, e()], [.2, e(1, 1, .86)], [.8, e(1, 1, .86)], [.9, e()], [1, e()]),
      H:  T([0, t()], [.1, t(0, 1.04, .95)], [.2, t(-1, 1.05, 1.04)], [.26, t(-1, 1.05, 1.04, 0, -1.2)], [.3, t(-1, 1.05, 1.04, 0, 1.2)], [.34, t(-1, 1.05, 1.04, 0, -1.2)],
            [.38, t(-1, 1.05, 1.04, 0, 1.2)], [.42, t(-1, 1.05, 1.04, 0, -1.2)], [.46, t(-1, 1.05, 1.04, 0, 1)], [.52, t(0, 1.08, .93)], [.58, t(-1, 1.05, 1.04)],
            [.64, t(0, 1.08, .93)], [.7, t(-1, 1.05, 1.04)], [.8, t(-1, 1.04, 1.03)], [.9, t(0, 1.02, .97)], [1, t()]),
      AL: T([0, r()], [.1, r(4)], [.2, r(-18)], [.3, r(-15)], [.4, r(-19)], [.52, r(-10)], [.58, r(-19)], [.64, r(-10)], [.7, r(-18)], [.8, r(-16)], [.9, r(5)], [1, r()]),
      AR: T([0, r()], [.1, r(4)], [.2, r(-14)], [.3, r(-11)], [.4, r(-15)], [.52, r(-7)], [.58, r(-15)], [.64, r(-7)], [.7, r(-14)], [.8, r(-12)], [.9, r(4)], [1, r()]),
      P:  T([0, p()], [.2, p(40, -82, 40)], [.46, p(40, -84, 38)], [.52, p(40, -44, 52)], [.58, p(40, -82, 40)], [.64, p(40, -44, 52)], [.7, p(40, -70, 44)], [.8, p(40, -66, 44)], [.92, p(-2, 2, -3)], [1, p()]),
      PR: T([0, pr()], [.48, pr()], [.52, pr(0, 5, 3, 1.08, .9)], [.58, pr(0, -6, -3)], [.64, pr(0, 5, 3, 1.08, .9)], [.72, pr(0, -3, -2)], [.82, pr()], [1, pr()]),
    } },
    happy: { d: 2900, fx: [[.2, 'spark', 1100], [.5, 'spark', 1100]], tr: {
      PR: T([0, pr()], [.1, pr(0, 4, 0, 1.06, .92)], [.36, pr(-20, -150, -300)], [.5, pr(-20, -172, -430)], [.68, pr(0, 4, -720, 1.07, .91)], [.78, pr(0, -6, -720)], [.88, pr(0, 0, -720)], [1, pr(0, 0, -720)]),
      H:  T([0, t()], [.1, t(0, 1.1, .86)], [.28, t(-12, .95, 1.07, -4)], [.44, t(0, 1.08, .89, -2)], [.56, t(-7, .97, 1.04, 4)], [.68, t(0, 1.08, .9, 2)], [.8, t(-3, .98, 1.03)], [.9, t(0, 1.03, .97)], [1, t()]),
      P:  T([0, p()], [.1, p(...ONP)], [.28, p(66, -95, 10)], [.4, p(66, -90, 28)], [.52, p(66, -94, 8)], [.62, p(50, -62, 40)], [.68, p(40, -46, 50)], [.8, p(40, -52, 48)], [.93, p(-2, 2, -3)], [1, p()]),
      AL: T([0, r()], [.1, r(-8)], [.28, r(-14)], [.44, r(14)], [.56, r(-10)], [.68, r(12)], [.8, r(-5)], [.9, r(3)], [1, r()]),
      AR: T([0, r()], [.1, r(6)], [.28, r(12)], [.44, r(-12)], [.56, r(9)], [.68, r(-10)], [.8, r(4)], [.9, r(-2)], [1, r()]),
      E:  T([0, e()], [.07, e(1, 1, 1.14)], [.1, e(1, 1, 1.14)], [.14, e(.12, 0)], [.8, e(.12, 0)], [.84, e()], [1, e()]),
      EH: T([0, o(0)], [.12, o(0)], [.14, o(1)], [.8, o(1)], [.825, o(0)], [1, o(0)]),
      M:  T([0, m()], [.1, m()], [.16, m(1, 1, 1.1)], [.3, m(1, 1.05, 1.25)], [.7, m(1, 1, 1)], [.78, m()], [1, m()]),
    } },
    waiting: { loop: true, fxOn: 'dots',
      in: { d: 760, tr: {   /* suspiro y se apoya en el objeto */
        H:  T([0, t()], [.4, t(-1, .98, 1.03)], [1, t(0, 1.02, .975, 2, .5)]),
        P:  T([0, p()], [.5, p(42, -58, 44)], [.85, p(40, -47, 52)], [1, p(...ONP)]),
        AL: T([0, r()], [.4, r(6)], [1, r(-10)]),
        AR: T([0, r()], [.4, r(-4)], [1, r(10)]),
        E:  T([0, e()], [.5, e()], [.62, e(.12)], [.8, e()], [1, e()]),
      } },
      cycle: { d: 3400, look: [[0, 9, 4], [1700, 6, -5]], tr: {
        H:  T([0, t(0, 1.02, .975, 2, .5)], [.5, t(0, 1.015, .98, -1)], [1, t(0, 1.02, .975, 2, .5)]),
        P:  T([0, p(...ONP)], [.06, p(40, -57, 44)], [.12, p(...ONP)], [.18, p(40, -57, 44)], [.24, p(...ONP)], [.3, p(40, -57, 44)], [.36, p(...ONP)], [1, p(...ONP)]),
        PR: T([0, pr()], [.12, pr(0, 1.5, 0, 1.02, .97)], [.15, pr()], [.24, pr(0, 1.5, 0, 1.02, .97)], [.27, pr()], [.36, pr(0, 1.5, 0, 1.02, .97)], [.39, pr()], [1, pr()]),
        AL: T([0, r(-10)], [.6, r(-13)], [.7, r(4)], [.78, r(-12)], [1, r(-10)]),
        AR: T([0, r(10)], [.6, r(13)], [.74, r(-3)], [.82, r(12)], [1, r(10)]),
        E:  T([0, e()], [.52, e()], [.57, e(.12)], [.66, e(.12)], [.72, e()], [1, e()]),
      } },
      out: { d: 640, tr: {
        H:  T([0, t()], [.4, t(0, 1.02, .975)], [1, t()]),
        P:  T([0, p()], [.85, p(-2, 2, -3)], [1, p()]),
        AL: T([0, r()], [.5, r(5)], [1, r()]),
        AR: T([0, r()], [.5, r(-4)], [1, r()]),
      } },
    },
    /* pasea por la página dando saltitos */
    roam: { loop: true,
      in: { d: 160, tr: { H: T([0, t()], [1, t()]) } },
      cycle: { d: 800, hook: '_roamStep', tr: {
        H:  T([0, t()], [.18, t(0, 1.09, .87)], [.48, t(-11, .95, 1.07, 4)], [.78, t(0, 1.09, .88)], [.9, t(-1, .99, 1.02)], [1, t()]),
        P:  T([0, p()], [.18, p(0, 3, 4)], [.48, p(10, -22, -18)], [.78, p(0, 3, 6)], [1, p()]),
        PR: T([0, pr()], [.18, pr(0, 3, 0, 1.04, .95)], [.48, pr(0, -8, 5)], [.78, pr(0, 3, 0, 1.05, .94)], [1, pr()]),
        AL: T([0, r()], [.18, r(6)], [.48, r(-13)], [.78, r(11)], [.9, r(-4)], [1, r()]),
        AR: T([0, r()], [.18, r(5)], [.48, r(-11)], [.78, r(9)], [.9, r(-3)], [1, r()]),
      } },
      out: { d: 520, tr: { H: T([0, t()], [.4, t(0, 1.05, .94)], [.75, t(-1, .99, 1.02)], [1, t()]) } },
    },
    /* arrastrar: la agarran por sorpresa y la levantan; cuelga y forcejea; al soltarla cae, rebota y se sacude el mareo */
    drag: { loop: true, soft: true, fx: [[0, 'bang', 1100]],
      in: { d: 460, tr: {
        H:  T([0, t()], [.2, t(0, .9, 1.06)], [.46, t(-1.5, 1.04, .97)], [.72, t(-.5, .96, 1.05)], [1, t(...HANG)]),
        E:  T([0, e()], [.16, e(1, 1, .78)], [.5, e(1, 1, .8)], [1, e(1, 1, .86)]),                    /* pupilas chiquitas: susto */
        MS: T([0, ms()], [.12, ms(.3, 0)], [1, ms(.3, 0)]),
        MO: T([0, oo()], [.08, oo()], [.2, oo(1, 1.25)], [.4, oo(1, .95)], [1, oo(1, 1.05)]),
        AL: T([0, r()], [.2, r(18)], [.46, r(-8)], [.72, r(8)], [1, r(4)]),
        AR: T([0, r()], [.2, r(-14)], [.46, r(8)], [.72, r(-6)], [1, r(-3)]),
        P:  T([0, p()], [.25, p(30, -60, -36)], [.55, p(34, -62, 10)], [1, p(24, -46, -30)]),
        PR: T([0, pr()], [.3, pr(0, 6, 9)], [.6, pr(0, 3, -4)], [1, pr(0, 4, 6)]),
      } },
      cycle: { d: 1500, tr: {   /* forcejea dos veces y descansa colgando */
        H:  T([0, t(...HANG)], [.1, t(0, .98, 1.03, 2.5)], [.2, t(0, .97, 1.04, -2.5)], [.3, t(0, .98, 1.03, 2.5)], [.4, t(0, .97, 1.04, -2)], [.55, t(...HANG)], [1, t(...HANG)]),
        P:  T([0, p(24, -46, -30)], [.1, p(36, -62, 16)], [.2, p(22, -44, -32)], [.3, p(36, -62, 16)], [.4, p(22, -44, -32)], [.55, p(24, -46, -30)], [.8, p(22, -40, -22)], [1, p(24, -46, -30)]),
        AL: T([0, r(4)], [.1, r(11)], [.2, r(-4)], [.3, r(10)], [.4, r(-3)], [.55, r(4)], [1, r(4)]),
        AR: T([0, r(-3)], [.1, r(-10)], [.2, r(5)], [.3, r(-9)], [.4, r(4)], [.55, r(-3)], [1, r(-3)]),
        E:  T([0, e(1, 1, .86)], [.4, e(1, 1, .86)], [.62, e(1, 1, .92)], [.68, e(.12, 1, .92)], [.75, e(1, 1, .9)], [1, e(1, 1, .86)]),
        MO: T([0, oo(1, 1.05)], [.1, oo(1, 1.2)], [.2, oo(1, 1)], [.3, oo(1, 1.2)], [.4, oo(1, 1)], [.55, oo(1, .9)], [1, oo(1, 1.05)]),
        PR: T([0, pr(0, 4, 6)], [.1, pr(0, 4, -6)], [.2, pr(0, 4, 7)], [.3, pr(0, 4, -6)], [.4, pr(0, 4, 6)], [1, pr(0, 4, 6)]),
      } },
      out: { d: 1250, fx: [[.26, 'spark', 900]], tr: {
        H:  T([0, t()], [.14, t(-5, .96, 1.07)], [.26, t(0, 1.18, .78)], [.4, t(-6, .95, 1.07)], [.54, t(0, 1.07, .91)], [.66, t(-1, .99, 1.02)],
              [.76, t(0, 1, 1, -3.5, -1.5)], [.84, t(0, 1, 1, 3, 1.5)], [.92, t(0, 1, 1, -1.5, -.5)], [1, t()]),
        E:  T([0, e()], [.14, e(1, 1, .8)], [.25, e(.12)], [.4, e(.12)], [.5, e(.8, 1, .92)], [.74, e(.8, 1, .92)], [.8, e(.12)], [.88, e()], [1, e()]),
        MO: T([0, oo()], [.14, oo(1, 1.2)], [.26, oo(1, .5)], [.32, oo()], [1, oo()]),
        MS: T([0, ms()], [.28, ms(.3, 0)], [.36, ms(1, 1)], [1, ms()]),
        AL: T([0, r()], [.14, r(14)], [.26, r(-22)], [.4, r(15)], [.54, r(-9)], [.66, r(5)], [.76, r(8)], [.84, r(-8)], [.92, r(4)], [1, r()]),
        AR: T([0, r()], [.14, r(-10)], [.26, r(20)], [.4, r(-13)], [.54, r(8)], [.66, r(-4)], [.76, r(7)], [.84, r(-7)], [.92, r(3)], [1, r()]),
        P:  T([0, p()], [.14, p(30, -58, -20)], [.26, p(0, 5, 10)], [.4, p(6, -18, -12)], [.54, p(0, 3, 5)], [.7, p()], [1, p()]),
        PR: T([0, pr()], [.26, pr(0, 4, 0, 1.12, .84)], [.4, pr(0, -12, -5)], [.54, pr(0, 2, 0, 1.05, .94)], [.7, pr()], [1, pr()]),
      } },
    },
    /* darse la vuelta: mira hacia atrás, toma impulso, gira con un saltito y aterriza mirando al otro lado */
    /* ===== poses de cuerpo completo (necesitan mascota-poses.js) ===== */
    /* giro completo: toma impulso y da la vuelta en el aire pasando por ocho ángulos dibujados */
    spin: { d: 1900, heavy: true, alt: 'happy', look: [[0, 0, 0]], fx: [[.5, 'spark', 1000]], tr: Object.assign(
      SEQ([['side', .15], ['b34', .225], ['back', .3], ['b34L', .375], ['sideL', .45], ['f34L', .525], ['front', .6], ['f34', .69]], .15, .78, .05, .9), {
      H: T([0, t()], [.07, t(0, 1.08, .88)], [.13, t(0, 1.1, .85)], [.24, t(-9, .95, 1.07)], [.42, t(-13, .98, 1.02)], [.6, t(-10, .98, 1.03)], [.74, t(-2, .96, 1.05)],
           [.8, t(0, 1.1, .86)], [.88, t(-2, .97, 1.04)], [.95, t(0, 1.02, .985)], [1, t()]),
    }) },
    /* de frente: se acomoda mirando al usuario y se balancea atenta */
    front: LOOPP('front', { d: 3400, tr: { H: T([0, t()], [.25, t(-.6, .995, 1.008, -1.6)], [.5, t()], [.75, t(-.6, .995, 1.008, 1.6)], [1, t()]) } }, { alt: 'nod' }, 640, 640),
    /* da la espalda (con shy lo hace sola mientras se escribe una contraseña) */
    away: { loop: true, alt: 'locked', look: [[0, 0, 0]],
      in: { d: 900, tr: Object.assign(SEQ([['side', .2], ['b34', .4], ['back', .6]], .2, null, .1, .9), {
        H: T([0, t()], [.1, t(0, 1.06, .92)], [.3, t(-4, .97, 1.04)], [.6, t(-3, .98, 1.03)], [.78, t(0, 1.06, .92)], [.91, t(-.6, .99, 1.015)], [1, t()]) }) },
      cycle: { d: 3800, tr: { H: T([0, t()], [.25, t(0, 1.006, .992, -1.3)], [.5, t(0, 1.012, .985)], [.75, t(0, 1.006, .992, 1.3)], [1, t()]) } },
      out: { d: 900, tr: Object.assign(SEQ([['back', 0], ['b34', .2], ['side', .4]], null, .6, .1, .9), {
        H: T([0, t()], [.1, t(0, 1.06, .92)], [.3, t(-4, .97, 1.04)], [.58, t(-3, .98, 1.03)], [.76, t(0, 1.06, .92)], [.9, t(-.6, .99, 1.015)], [1, t()]) }) },
    },
    /* salto grande dibujado paso a paso: se agacha, se estira al despegar, celebra arriba y cae despatarrada */
    jump: { d: 1800, heavy: true, alt: 'success', look: [[0, 0, -3]], fx: [[.4, 'spark', 1000]], tr: Object.assign(SEQ([['jump', .2]], .2, .715, .045), {
      H: T([0, t()], [.08, t(0, 1.06, .92)], [.17, t(0, 1.13, .8)], [.22, t(-2, 1.02, .97)], [.3, t(-22, .92, 1.12)], [.42, t(-37, .99, 1.02, -3)], [.5, t(-39, 1.02, .985, 0)], [.58, t(-36, 1, 1.01, 3)],
           [.68, t(-12, .93, 1.1)], [.74, t(0, 1.15, .78)], [.83, t(-4, .96, 1.06)], [.91, t(0, 1.04, .955)], [.96, t(-.5, .99, 1.01)], [1, t()]),
    }) },
    /* a rastras: avanza como oruga con cuatro dibujos por paso (pasea igual que roam) */
    crawl: { loop: true, heavy: true, alt: 'roam',
      in: { d: 560, tr: Object.assign(SEQ([['crawl', .5]], .5, null, .13), {
        H: T([0, t()], [.22, t(0, 1.04, .95)], [.5, t(0, 1.22, .64)], [.72, t(0, .98, 1.04)], [.88, t(0, 1.01, .99)], [1, t()]) }) },
      cycle: { d: 900, hook: '_roamStep', tr: {
        H: T([0, t()], [.2, t(0, .9, 1.12, 0, -1.5)], [.5, t(0, 1.12, .9, 0, 2.5)], [.78, t(0, 1.03, .97, 0, .5)], [1, t()]) } },
      out: { d: 700, tr: Object.assign(SEQ([['crawl', 0]], null, .4, .12), {
        H: T([0, t()], [.2, t(0, 1.05, .93)], [.4, t(0, 1.2, .66)], [.62, t(-4, .96, 1.07)], [.8, t(0, 1.04, .95)], [.92, t(-.5, .99, 1.01)], [1, t()]) }) },
    },
    /* siesta dibujada paso a paso: bosteza, cabecea, se va bajando y queda dormida */
    nap: { loop: true, alt: 'sleep', fxOn: 'zz', look: [[0, 0, 4]],
      in: { d: 1700, tr: Object.assign(SEQ([['nap', .56]], .56, null, .09), {
        H: T([0, t()], [.12, t(0, 1.02, .975)], [.3, t(-1.5, .96, 1.06)], [.42, t(-1.5, .96, 1.06)], [.56, t(0, 1.24, .6)], [.7, t(0, .97, 1.05)], [.85, t(0, 1.02, .975)], [1, t()]),
        M:  T([0, m()], [.12, m()], [.28, m(1, 1.1, 1.5)], [.42, m(1, 1.1, 1.5)], [.5, m()], [1, m()]),
        E:  T([0, e()], [.16, e(.5)], [.3, e(.25)], [.44, e(.3)], [.52, e(.12, 0)], [1, e(.12, 0)]),
        P:  T([0, p()], [.12, p(0, 2, 0)], [.28, p(...CHIN)], [.42, p(...CHIN)], [.54, p(0, 3, 2)], [1, p(0, 3, 2)]) }) },
      cycle: { d: 4800, tr: { H: T([0, t()], [.45, t(0, .985, 1.045)], [.55, t(0, .985, 1.045)], [1, t()]) } },
      out: { d: 1250, tr: Object.assign(SEQ([['nap', 0]], null, .4, .09), {
        H: T([0, t()], [.2, t(0, .97, 1.06)], [.4, t(0, 1.22, .62)], [.58, t(-5, .95, 1.08)], [.76, t(0, 1.05, .93)], [.9, t(-.6, .99, 1.012)], [1, t()]),
        E: T([0, e(.12, 0)], [.4, e(.12, 0)], [.5, e(.4)], [.62, e()], [.7, e(.12)], [.78, e()], [1, e()]) }) },
    },
    sad: { loop: true, alt: 'empty', look: [[0, 0, 0]],
      in: { d: 1250, tr: Object.assign(SEQ([['sad', .47]], .47, null, .1), {
        H: T([0, t()], [.14, t(-1, .985, 1.02)], [.3, t(0, 1.03, .96)], [.47, t(0, 1.17, .72)], [.64, t(0, .975, 1.035)], [.82, t(0, 1.015, .985)], [1, t()]) }) },
      cycle: { d: 4600, tr: { H: T([0, t()], [.26, t(-.4, .98, 1.035)], [.36, t(-.4, .98, 1.035)], [.56, t(0, 1.035, .95)], [.72, t(0, 1.02, .972, -1.2)], [1, t()]) } },
      out: { d: 980, tr: Object.assign(SEQ([['sad', 0]], null, .36, .1), {
        H: T([0, t()], [.2, t(0, 1.05, .92)], [.36, t(0, 1.16, .74)], [.58, t(-3, .96, 1.06)], [.78, t(0, 1.03, .965)], [.9, t(-.5, .99, 1.01)], [1, t()]) }) },
    },
    ponder: { loop: true, alt: 'think', look: [[0, 0, 0]], fx: [[0, 'q', 1300]],
      in: { d: 760, tr: Object.assign(SEQ([['think', .34]], .34, null, .12), {
        H: T([0, t()], [.18, t(0, 1.05, .93)], [.36, t(-2.5, .97, 1.04)], [.62, t(0, 1.03, .965)], [.82, t(-.5, .99, 1.01)], [1, t()]) }) },
      cycle: { d: 4000, tr: { H: T([0, t()], [.22, t(-.5, .995, 1.01, -2)], [.42, t(-.5, .995, 1.01, -2)], [.62, t(0, 1.01, .99, 1.4)], [.82, t(0, 1.01, .99, 1.4)], [1, t()]) } },
      out: { d: 760, tr: Object.assign(SEQ([['think', 0]], null, .36, .12), {
        H: T([0, t()], [.18, t(0, 1.05, .93)], [.38, t(-2.5, .97, 1.04)], [.64, t(0, 1.03, .965)], [.84, t(-.5, .99, 1.01)], [1, t()]) }) },
    },
    sit: { loop: true, alt: 'waiting', look: [[0, 0, 0]],
      in: { d: 900, tr: Object.assign(SEQ([['sit', .5]], .5, null, .09), {
        H: T([0, t()], [.14, t(0, 1.06, .91)], [.34, t(-6, .96, 1.06)], [.5, t(0, 1.12, .84)], [.66, t(-1.2, .98, 1.03)], [.82, t(0, 1.02, .98)], [1, t()]) }) },
      cycle: { d: 3600, tr: { H: T([0, t()], [.25, t(0, 1.01, .985, -1.5)], [.5, t(0, 1.015, .98)], [.75, t(0, 1.01, .985, 1.5)], [1, t()]) } },
      out: { d: 820, tr: Object.assign(SEQ([['sit', 0]], null, .44, .09), {
        H: T([0, t()], [.16, t(0, 1.06, .91)], [.3, t(0, 1.1, .86)], [.46, t(-5, .96, 1.06)], [.68, t(0, 1.05, .94)], [.86, t(-.6, .99, 1.012)], [1, t()]) }) },
    },
    excited: { d: 2500, alt: 'happy', look: [[0, 0, 0]], fx: [[.2, 'spark', 1100], [.5, 'spark', 1100]], tr: Object.assign(SEQ([['excited', .13]], .13, .84, .045), {
      H: T([0, t()], [.06, t(0, 1.05, .93)], [.12, t(0, 1.09, .87)], [.2, t(-8, .96, 1.06)], [.28, t(0, 1.07, .9)], [.36, t(-10, .95, 1.07, -2)], [.45, t(0, 1.08, .89)], [.53, t(-10, .95, 1.07, 2)],
           [.62, t(0, 1.08, .89)], [.7, t(-3, .98, 1.03)], [.78, t(0, 1.02, .98)], [.84, t(0, 1.08, .88)], [.91, t(-2, .97, 1.04)], [.96, t(0, 1.02, .985)], [1, t()]),
    }) },
    gasp: { d: 1900, alt: 'notify', look: [[0, 0, 0]], fx: [[.1, 'bang', 1100]], tr: Object.assign(SEQ([['gasp', .11]], .11, .8, .04), {
      H: T([0, t()], [.05, t(0, 1.04, .95)], [.11, t(0, 1.02, .98)], [.17, t(-7, .93, 1.11)], [.25, t(-1, 1.02, .98)], [.31, t(-2, .98, 1.03, 0, -.8)], [.37, t(-2, .98, 1.03, 0, .8)], [.43, t(-2, .98, 1.03, 0, -.6)],
           [.49, t(-2, .98, 1.03, 0, .6)], [.56, t(-1.5, .985, 1.02)], [.72, t(-1, .99, 1.015)], [.8, t(0, 1.06, .92)], [.9, t(-1, .99, 1.015)], [1, t()]),
    }) },
    wink: { d: 1900, alt: 'smile', look: [[0, 0, 0]], fx: [[.3, 'spark', 900]], tr: Object.assign(SEQ([['wink', .14]], .14, .8, .05), {
      H: T([0, t()], [.07, t(0, 1.04, .95)], [.14, t(0, 1.03, .965)], [.24, t(-2.5, .975, 1.035, 3)], [.34, t(-1, .995, 1.01, 2)], [.62, t(-1.4, .99, 1.015, 2.6)], [.74, t(-.5, 1, 1, 1)],
           [.8, t(0, 1.04, .955)], [.9, t(-.8, .99, 1.012)], [1, t()]),
    }) },
    lean: { d: 2300, alt: 'curious', look: [[0, 0, 0]], tr: Object.assign(SEQ([['lean', .15]], .15, .8, .055), {
      H: T([0, t()], [.07, t(0, 1.05, .93)], [.15, t(0, 1.03, .96, 2)], [.27, t(-1, .99, 1.015, -3, -1)], [.42, t(-1, .99, 1.015, -4.5, -1.6)], [.55, t(-1, .99, 1.015, -3.2, -1.2)],
           [.68, t(-1, .99, 1.015, -4.5, -1.6)], [.8, t(0, 1.04, .95, 1)], [.9, t(-1, .99, 1.015)], [1, t()]),
    }) },
    turn: { d: 760, tr: {
      H:  T([0, t()], [.2, t(0, 1.07, .91)], [.44, t(-8, .93, 1.09)], [.56, t(-8, .93, 1.09)], [.78, t(0, 1.09, .88)], [.9, t(-1, .985, 1.025)], [1, t()]),
      E:  T([0, e()], [.3, e()], [.4, e(.12)], [.6, e(.12)], [.7, e(1, 1, 1.08)], [1, e()]),
      AL: T([0, r()], [.2, r(8)], [.44, r(-20)], [.56, r(-20)], [.78, r(16)], [.9, r(-6)], [1, r()]),
      AR: T([0, r()], [.2, r(6)], [.44, r(-17)], [.56, r(-17)], [.78, r(13)], [.9, r(-5)], [1, r()]),
      P:  T([0, p()], [.2, p(0, 3, 4)], [.44, p(22, -34, -26)], [.56, p(22, -34, -26)], [.78, p(0, 4, 10)], [.9, p(0, -3, -3)], [1, p()]),
      PR: T([0, pr()], [.2, pr(0, 3, 0, 1.04, .95)], [.44, pr(6, -10, 10)], [.56, pr(6, -10, 10)], [.78, pr(0, 3, 0, 1.06, .93)], [.9, pr(0, -2, -2)], [1, pr()]),
    } },
  };


  /* ---------- objetos: renders 3D incrustados ---------- */
  const PROPS = __PROPS__;
  const ITEMS = __ITEMS__;

  /* capas que no desplazan nada: son las únicas que se animan con movimiento reducido */
  const SOFT = ['E', 'EH', 'ES', 'M', 'MO', 'MS', 'BR', 'IT', 'RG', 'CH', 'CF'];
  const rest = (key) => (REST[key] ? REST[key]() : q());

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  class SlimeMascot extends HTMLElement {
    static get observedAttributes() { return ['size', 'variant', 'facing', 'state', 'motion', 'label', 'decorative', 'costume']; }

    /** Registra trajes (lo llama mascota-trajes.js). Formato: { nombre: [{ slot: 'back'|'hat'|'front', html }] } */
    static addCostumes(map) {
      Object.assign(SlimeMascot.costumes, map);
      document.querySelectorAll('slime-mascot').forEach((el) => el._applyCostume && el._applyCostume());
    }
    /** Registra poses de cuerpo completo (lo llama mascota-poses.js). Formato: { nombre: { src, box:[l,t,w,h] en %, origin:[x,y] en % } } */
    static addPoses(map) {
      Object.assign(SlimeMascot.poses, map);
      document.querySelectorAll('slime-mascot').forEach((el) => el._applyPoses && el._applyPoses());
    }
    /** Traje que corresponde a una fecha según el calendario guatemalteco (o null). */
    static costumeForDate(d = new Date()) {
      const y = d.getFullYear(), m_ = d.getMonth() + 1, day = d.getDate();
      /* Domingo de Pascua (algoritmo de Meeus) → Semana Santa va de Domingo de Ramos a Domingo de Resurrección */
      const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e_ = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k_ = c % 4, l = (32 + 2 * e_ + 2 * i - h - k_) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451),
        em = Math.floor((h + l - 7 * mm + 114) / 31), ed = ((h + l - 7 * mm + 114) % 31) + 1;
      const easter = new Date(y, em - 1, ed), palm = new Date(y, em - 1, ed - 7), t0 = new Date(y, m_ - 1, day);
      if (t0 >= palm && t0 <= easter) return 'semanasanta';
      if (m_ === 2 && day >= 8 && day <= 14) return 'carino';
      if (m_ === 3 && day === 8) return 'mujer';
      if (m_ === 5 && day >= 4 && day <= 10) return 'madre';
      if (m_ === 6 && day >= 11 && day <= 17) return 'padre';
      if (m_ === 6 && day === 30) return 'ejercito';
      if (m_ === 10 && day === 1) return 'nino';
      if (m_ === 11 && day === 19) return 'hombre';
      const nov1 = new Date(y, 10, 1).getDay(), tg = 1 + ((4 - nov1 + 7) % 7) + 21;        // Acción de Gracias: cuarto jueves de noviembre
      if (m_ === 11 && day >= tg - 3 && day <= tg) return 'acciondegracias';
      if (m_ === 9 && day <= 15) return 'independencia';
      if (m_ === 10 && day >= 24) return 'halloween';
      if (m_ === 11 && day <= 2) return 'todossantos';
      if (m_ === 12 && day === 7) return 'quemadiablo';
      if (m_ === 12 && day <= 25) return 'navidad';
      if ((m_ === 12 && day >= 26) || (m_ === 1 && day <= 6)) return 'anionuevo';
      return null;
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = TPL;
      const $ = (s) => [...this.shadowRoot.querySelectorAll(s)];
      this._el = $('.stage')[0]; this._prop = $('.prop')[0]; this._item = $('.item')[0]; this._bub = $('.bubble')[0];
      this._t = { H: $('.hop'), P: $('.paw'), AL: $('.antL'), AR: $('.antR'), E: $('.pupil'), EH: $('.eh'), ES: $('.es'), M: $('.mo'), MS: $('.mouth'), BR: $('.br'), MO: $('.mo2'), PR: [], IT: $('.item'), D: $('.dir'), RG: $('.rig'), CH: $('.cs-hat2'), CF: $('.cs-front2') };
      this._poseBox = $('.poses')[0];
      this._dragEl = $('.drag')[0];
      this._pinch = { bx: $('.bx')[0], by: $('.by')[0], gx: $('.gx')[0], gy: $('.gy')[0], dx: $('.dx')[0], dy: $('.dy')[0] };
      /* la deformación local usa un filtro SVG; Safari no lo aplica bien sobre HTML, ahí se omite */
      this._canPinch = !/^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
      ['pointerdown', 'pointerup', 'click'].forEach((n) => this._bub.addEventListener(n, (ev) => ev.stopPropagation()));
      this._busy = null; this._next = null; this._held = []; this._timers = [];
      this._dir = 1; this._pos = { x: 0, y: 0 }; this._spring = { a: 0, v: 0, s: 1 };
      this._hit = $('.hit')[0]; this._ctl = $('.ctl')[0]; this._sr = $('.sr')[0];
      this._count = {}; this._rate = 1; this._awake = true;
      this.labels = { pause: 'Pausar animaciones', resume: 'Reanudar animaciones', hide: 'Ocultar mascota', show: 'Mostrar mascota' };
      /* textos para lectores de pantalla (solo con el atributo announce): el estado nunca depende solo de la animación */
      this.messages = { think: 'Cargando…', waiting: 'Esperando…', success: 'Completado', shake: 'Hay un error', download: 'Descargando…', upload: 'Subiendo…',
        save: 'Guardado', export: 'Exportado', approve: 'Enviado a aprobación', archive: 'Archivado', empty: 'Sin resultados', locked: 'Sin permiso',
        offline: 'Sin conexión', expiring: 'La sesión está por expirar', notify: 'Tienes un aviso' };
      this._mq = window.matchMedia ? matchMedia('(prefers-reduced-motion:reduce)') : null;
      this._onMq = () => this._syncMotion();
      this._onVis = () => this._setAwake(!document.hidden && this._inView !== false);
      $('.c-pause')[0].addEventListener('click', () => (this._userPaused ? this.resume() : this.pause()));
      $('.c-hide')[0].addEventListener('click', () => this.hide());
      $('.chip')[0].addEventListener('click', () => this.show());
      [this._ctl, $('.chip')[0]].forEach((el) => ['pointerdown', 'pointerup', 'click'].forEach((n) => el.addEventListener(n, (ev) => ev.stopPropagation())));
      const ctlOn = () => { clearTimeout(this._ctlT); if (!this.hasAttribute('no-controls')) this._el.classList.add('ctl-on'); };
      const ctlOff = () => { clearTimeout(this._ctlT); this._ctlT = setTimeout(() => this._el.classList.remove('ctl-on'), 1800); };
      [this._hit, this._ctl].forEach((el) => { el.addEventListener('pointerenter', ctlOn); el.addEventListener('pointerleave', ctlOff); });
      this._syncMotion();

      this._onMove = (ev) => {
        if (this._busy === 'sleep' || this._busy === 'nap') this.stop();
        this._armSleep();
        this._px = ev.clientX; this._py = ev.clientY; this._hasPointer = ev.pointerType === 'mouse';
        if (this._dragging) return;
        this._autoFace();
        if (!this._focusEl && !this._lookLock) this._look(ev.clientX, ev.clientY);
      };
      this._onDocClick = (ev) => {
        const el = ev.target.closest && ev.target.closest('[data-mascot]');
        if (el && !this.contains(el)) this.play(el.getAttribute('data-mascot'));
      };
      this._onFocusIn = (ev) => {
        const el = ev.target;
        if (el && el.matches && el.matches('input,textarea,select,[contenteditable]')) {
          this._focusEl = el;
          if (this._busy === 'sleep' || this._busy === 'nap') this.stop();
          if (!this._lookLock) this._lookEl(el);
          /* shy: mientras se escribe una contraseña se da la vuelta y no mira */
          if (this.hasAttribute('shy') && el.type === 'password') this.play('away');
        }
      };
      this._onFocusOut = () => { this._focusEl = null; if (this._busy === 'away' && this.hasAttribute('shy')) this.stop(); else if (this._next === 'away') this._next = null; };
      this._onViewport = () => this._autoFace();

      /* ----- arrastre ----- */
      this._onDown = (ev) => {
        if (ev.button > 0) return;
        this._press = { x: ev.clientX, y: ev.clientY, ox: this._pos.x, oy: this._pos.y, id: ev.pointerId, t: performance.now(), lx: ev.clientX, ly: ev.clientY, vx: 0, vy: 0 };
        if (!this.hasAttribute('no-drag')) { try { this._hit.setPointerCapture(ev.pointerId); } catch (_) {} }
      };
      this._onDragMove = (ev) => {
        const pr_ = this._press; if (!pr_ || ev.pointerId !== pr_.id || this.hasAttribute('no-drag')) return;
        const dx = ev.clientX - pr_.x, dy = ev.clientY - pr_.y;
        if (!this._dragging) {
          if (Math.hypot(dx, dy) < 7) return;
          this._startDrag();
        }
        const now = performance.now(), dt = Math.max(8, now - pr_.t);
        pr_.vx = pr_.vx * .6 + ((ev.clientX - pr_.lx) / dt) * 1000 * .4;
        pr_.vy = pr_.vy * .6 + ((ev.clientY - pr_.ly) / dt) * 1000 * .4;
        pr_.lx = ev.clientX; pr_.ly = ev.clientY; pr_.t = now;
        this._moveTo(pr_.ox + dx, pr_.oy + dy, 0);
        const sp = Math.hypot(pr_.vx, pr_.vy) || 1;
        if (sp > 420) this._lockLook((pr_.vx / sp * this._dir * 9).toFixed(1), (pr_.vy / sp * 5).toFixed(1));   // va rápido: mira hacia donde la llevan
        else if (this._grabLook) this._lockLook(...this._grabLook);                                                // si no, mira la mano
      };
      this._onUp = (ev) => {
        const pr_ = this._press; if (!pr_ || ev.pointerId !== pr_.id) return;
        this._press = null;
        if (this._dragging) {
          this._dragging = false; this.classList.remove('dragging');
          this._justDragged = performance.now();
          if (this._next === 'drag') this._next = null; else if (this._busy === 'drag') this.stop();
          this._unlockLook();
        }
      };
      this._onClick = () => {
        if (this._justDragged && performance.now() - this._justDragged < 350) return;
        if (!this.hasAttribute('no-click')) this.play('greet');
      };
    }

    connectedCallback() {
      this._applySize(); this._applyVariant(); this._applyCostume(); this._applyPoses();
      this.addEventListener('click', this._onClick);
      this.addEventListener('pointerdown', this._onDown);
      this.addEventListener('pointermove', this._onDragMove);
      this.addEventListener('pointerup', this._onUp);
      this.addEventListener('pointercancel', this._onUp);
      window.addEventListener('pointermove', this._onMove, { passive: true });
      window.addEventListener('resize', this._onViewport, { passive: true });
      window.addEventListener('scroll', this._onViewport, { passive: true });
      document.addEventListener('click', this._onDocClick);
      document.addEventListener('focusin', this._onFocusIn);
      document.addEventListener('focusout', this._onFocusOut);
      this._blinkLoop(); this._twitchLoop(); this._armSleep();
      requestAnimationFrame(() => this._autoFace(true));
      if (this._mq) (this._mq.addEventListener ? this._mq.addEventListener('change', this._onMq) : this._mq.addListener(this._onMq));
      document.addEventListener('visibilitychange', this._onVis);
      if ('IntersectionObserver' in window) {
        this._ioV = new IntersectionObserver((en) => { this._inView = en[en.length - 1].isIntersecting; this._onVis(); }, { rootMargin: '120px' });
        this._ioV.observe(this);
      }
      this._applyA11y();
      const saved = this._load();
      if (saved.paused) this.pause(true);
      if (saved.hidden) { this._el.classList.add('gone', 'hidden'); this._gone = true; return; }
      if (this.hasAttribute('intro')) {
        this._el.classList.add('hidden');
        const go = () => this.play('enter').then(() => this.play('greet'));
        if ('IntersectionObserver' in window) {
          this._io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { this._io.disconnect(); go(); } }, { threshold: .4 });
          this._io.observe(this);
        } else go();
      }
    }

    disconnectedCallback() {
      this.removeEventListener('click', this._onClick);
      this.removeEventListener('pointerdown', this._onDown);
      this.removeEventListener('pointermove', this._onDragMove);
      this.removeEventListener('pointerup', this._onUp);
      this.removeEventListener('pointercancel', this._onUp);
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('resize', this._onViewport);
      window.removeEventListener('scroll', this._onViewport);
      document.removeEventListener('click', this._onDocClick);
      document.removeEventListener('focusin', this._onFocusIn);
      document.removeEventListener('focusout', this._onFocusOut);
      if (this._io) this._io.disconnect();
      if (this._ioV) this._ioV.disconnect();
      if (this._mq) (this._mq.removeEventListener ? this._mq.removeEventListener('change', this._onMq) : this._mq.removeListener(this._onMq));
      document.removeEventListener('visibilitychange', this._onVis);
      this._unring();
      cancelAnimationFrame(this._physRaf); cancelAnimationFrame(this._pollRaf);
      [this._blinkT, this._sleepT, this._twT, ...this._timers].forEach(clearTimeout);
    }

    attributeChangedCallback(name) {
      if (name === 'size') this._applySize();
      if (name === 'variant') this._applyVariant();
      if (name === 'costume') this._applyCostume();
      if (name === 'facing') this._autoFace(true);
      if (name === 'motion') this._syncMotion();
      if (name === 'label' || name === 'decorative') this._applyA11y();
      if (name === 'state' && this.isConnected) this._applyState();
    }

    /* ---------- API pública ---------- */

    /** Reproduce una animación. Si hay otra en curso, espera a que vuelva al reposo y entonces entra. */
    play(name) {
      if (!A[name]) return Promise.resolve();
      if (!A[name].soft && (!this._hasPoses(A[name]) || (this._reduced && A[name].heavy))) {        // sin mascota-poses.js (o con movimiento reducido) usa la versión sencilla
        if (!this._hasPoses(A[name]) && !SlimeMascot._warned) { SlimeMascot._warned = true; console.warn('slime-mascot: "' + name + '" necesita mascota-poses.js'); }
        return A[name].alt ? this.play(A[name].alt) : Promise.resolve();
      }
      if (this._gone) { this._announce(name); return Promise.resolve(); }      // el usuario la ocultó: no reaparece sola
      if (this._busy) {
        if (this._next === name && this._nextP) return this._nextP;              // la misma ya está en cola: no se apila
        if (this._nextRes) this._nextRes();
        this._next = name;
        if (this._stopLoop) this._stopLoop();
        return (this._nextP = new Promise((res) => { this._nextRes = res; }));
      }
      return this._run(name);
    }

    /** Estado de la app → animación. Úsalo como atributo (state="loading") o propiedad. 'idle' termina cualquier bucle. */
    get state() { return this.getAttribute('state') || 'idle'; }
    set state(v) { this.setAttribute('state', v); }
    _applyState() {
      const map = { idle: null, loading: 'think', waiting: 'waiting', success: 'success', error: 'shake', empty: 'empty', offline: 'offline',
        locked: 'locked', expiring: 'expiring', downloading: 'download', uploading: 'upload', saved: 'save' };
      const s = this.state, n = s in map ? map[s] : (A[s] ? s : null);
      if (n) this.play(n); else this.stop();
    }

    /** Pausa todo el movimiento (lo mismo que el botón). La preferencia se recuerda. */
    pause(silent) { this._userPaused = true; this._syncMotion(); if (!silent) this._save(); }
    resume() { this._userPaused = false; this._syncMotion(); this._save(); }
    /** Oculta la mascota y deja un botón pequeño para traerla de vuelta. La preferencia se recuerda. */
    async hide() {
      if (this._gone || this._hiding) return;
      this._hiding = true; this.hush(); this._next = null; if (this._stopLoop) this._stopLoop();
      await this._idle(); await this._run('exit');
      this._gone = true; this._hiding = false; this._save();
      this._el.classList.add('gone');
      this.dispatchEvent(new CustomEvent('dismiss'));
    }
    show() {
      if (!this._gone) return Promise.resolve();
      this._gone = false; this._save(); this._el.classList.remove('gone');
      this.dispatchEvent(new CustomEvent('restore'));
      return this.play('enter');
    }
    get dismissed() { return !!this._gone; }
    get paused() { return !!this._userPaused; }
    /** Termina un bucle ('think', 'waiting', 'roam', 'sleep') volviendo suavemente al reposo. */
    stop() { this._next = null; if (this._stopLoop) this._stopLoop(); }
    /** Hace que mire a un punto de la pantalla (coordenadas de cliente). */
    lookAt(x, y) { this._look(x, y); }
    /** Voltea la mascota: 'left' o 'right'. */
    face(side) { this._face(side === 'left' ? -1 : 1); }
    /** Regresa a su lugar original después de arrastrarla o pasear. */
    resetPosition() { this._moveTo(0, 0, 500); }
    get busy() { return this._busy; }
    get animations() { return Object.keys(A).filter((n) => !['drag', 'point', 'turn'].includes(n) && (A[n].soft || this._hasPoses(A[n]))); }
    cheer() { return this.play('success'); }
    sleep() { return this.play('sleep'); }
    wake() { if (this._busy === 'sleep' || this._busy === 'nap') this.stop(); }

    /* ---------- motor ---------- */

    async _run(name, res) {
      this._busy = name;
      /* velocidad: atributo speed, y las animaciones ya vistas varias veces se acortan para no cansar */
      const a0 = A[name], seen = (this._count[name] = (this._count[name] || 0) + 1);
      this._rate = (name === 'turn' || a0.loop) ? 1 : (parseFloat(this.getAttribute('speed')) || 1) * (!a0.loop && seen > 3 && !['enter', 'exit'].includes(name) ? 1.3 : 1);
      this._announce(name);
      clearTimeout(this._sleepT);
      this.dispatchEvent(new CustomEvent('actionstart', { detail: name }));
      const a = A[name];
      try {
        if (name === 'enter') this._el.classList.remove('hidden');
        if (a.item) this._item.innerHTML = ITEMS[a.item] || '';
        const posed = this._posesOf(a).length > 0;
        if (posed) await this._loadPoses(a, true);
        if (a.loop) await this._runLoop(a); else await this._seg(a);
        if (posed) this._loadPoses(a, false);
        if (name === 'exit') this._el.classList.add('hidden');
      } catch (err) { this._release(); }
      this._clearTimers();
      if (!this._dragging) this._unlockLook();
      this._busy = null;
      this.dispatchEvent(new CustomEvent('actionend', { detail: name }));
      if (res) res();
      if (this._next) {
        const n = this._next, rr = this._nextRes;
        this._next = null; this._nextRes = null;
        return this._run(n, rr);
      }
      this._armSleep(); this._autoFace();
    }

    _anim(tr, opts, into, implicitFrom) {
      const noPose = Object.keys(tr).some((key) => key[0] === 'Q' && !this._t[key]);
      for (const key in tr) for (const el of this._t[key] || []) {
        if (noPose && (key[0] === 'Q' || key === 'RG' || key === 'CH' || key === 'CF')) continue;
        if (this._reduced && !SOFT.includes(key) && key[0] !== 'Q') continue;                     // movimiento reducido: solo cara y objetos, sin desplazamientos
        const kf = implicitFrom ? tr[key].filter((f) => f.offset > 0) : tr[key];
        into.push(el.animate(kf, opts));
      }
      return into;
    }
    _done(anims) { return Promise.all(anims.map((x) => x.finished.catch(() => {}))); }

    /** Un tramo: todas las capas animan juntas en una sola línea de tiempo. */
    _seg(a, hold) {
      const d = a.d / this._rate;
      this._cues(a, d);
      const anims = this._anim(a.tr, { duration: d, fill: hold ? 'forwards' : 'none' }, []);
      if (hold) this._held.push(...anims);
      return anims.length ? this._done(anims) : wait(hold ? 0 : Math.min(d, 700));
    }

    _cues(a, d) {
      (a.look || []).forEach(([ms_, lx, ly]) => this._later(ms_ / this._rate, () => (lx === null ? this._unlockLook() : this._lockLook(lx, ly))));
      (a.fx || []).forEach(([off, fx, ms_]) => this._later(off * d, () => this._fx(fx, ms_)));
    }

    /** Bucle: entrada sostenida → vueltas → salida. La salida arranca desde donde esté cada capa, así nunca hay salto. */
    async _runLoop(a) {
      const stopped = new Promise((res) => { this._stopLoop = res; });
      let live = true; stopped.then(() => { live = false; });
      this._cues(a, 0);
      await this._seg(a.in, true);
      const c = a.cycle; let cyc = [];
      if (live) {
        if (a.fxOn) this._fx(a.fxOn);
        cyc = this._anim(c.tr, { duration: c.d, iterations: Infinity }, []);
        if (!cyc.length) await stopped;
        else {
          let last = -1;
          const poll = () => {
            if (!live) return;
            const i = Math.floor((cyc[0].currentTime || 0) / c.d);
            if (i !== last) { last = i; this._cues(c, c.d); if (c.hook) this[c.hook](i, c.d); }
            this._pollRaf = requestAnimationFrame(poll);
          };
          poll();
          await stopped;
        }
      }
      if (c.sync && cyc.length) {
        const ct = cyc[0].currentTime || 0, left = c.d - (ct % c.d);
        await wait(left);
        cyc.forEach((x) => { x.pause(); x.currentTime = Math.round((ct + left) / c.d) * c.d - 1; });
      }
      this._stopLoop = null;
      if (a.fxOn) this._fx(a.fxOn, 0);
      this._clearTimers(); if (!this._dragging) this._unlockLook();
      /* salida: cubre todas las capas usadas y parte del valor actual de cada una */
      const out = Object.assign({}, a.out.tr);
      for (const key in Object.assign({}, a.in.tr, c.tr)) if (!out[key]) out[key] = T([0, rest(key)], [1, rest(key)]);
      this._cues(a.out, a.out.d);
      await this._done(this._anim(out, { duration: a.out.d }, [], true));
      cyc.forEach((x) => x.cancel());
      this._release();
    }

    _release() { this._held.forEach((x) => x.cancel()); this._held = []; }
    _later(ms_, fn) { this._timers.push(setTimeout(fn, ms_)); }
    _clearTimers() { this._timers.forEach(clearTimeout); this._timers = []; }

    _fx(name, ms_) {
      const c = 'fx-' + name, cl = this._el.classList;
      if (ms_ === 0) return cl.remove(c);
      cl.remove(c); void this._el.offsetWidth; cl.add(c);
      if (ms_) this._later(ms_, () => cl.remove(c));
    }

    /* ---------- mirada y cabeza ---------- */

    _setLook(lx, ly) {
      const s = this._el.style;
      s.setProperty('--lx', lx); s.setProperty('--ly', ly);   // pupilas (rápidas)
      s.setProperty('--hx', this._reduced ? 0 : lx); s.setProperty('--hy', this._reduced ? 0 : ly);   // cabeza y antenas (con inercia)
    }
    _lockLook(lx, ly) { this._lookLock = true; this._setLook(lx, ly); }
    _unlockLook() {
      if (!this._lookLock) return;
      this._lookLock = false;
      if (this._focusEl) this._lookEl(this._focusEl);
      else if (this._px != null) this._look(this._px, this._py);
      else this._setLook(0, 0);
    }
    _lookEl(el) { const b = el.getBoundingClientRect(); this._look(b.left + b.width / 2, b.top + b.height / 2); }
    _look(x, y) {
      if (this.hasAttribute('no-follow')) return;
      this._lx = x; this._ly = y;
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        if (this._lookLock) return;
        const b = this._el.getBoundingClientRect();
        if (!b.width) return;
        const ex = this._dir > 0 ? 0.66 : 0.31;               // posición de los ojos según hacia dónde mira
        const dx = (this._lx - (b.left + b.width * ex)) * this._dir, dy = this._ly - (b.top + b.height * 0.44);
        const d = Math.hypot(dx, dy) || 1, f = Math.min(1, d / 200);
        this._setLook(((dx / d) * 9 * f).toFixed(2), ((dy / d) * 5 * f).toFixed(2));
      });
    }

    /* ---------- izquierda / derecha ---------- */

    _face(dir) {
      if (dir === this._dir) return;
      this._dir = dir;                                       // la lógica ya cuenta con el lado nuevo; lo visible cambia a mitad del giro
      const el = this._t.D[0], from = -dir, flip = () => this._el.classList.toggle('left', dir < 0);
      if (this._reduced) return flip();
      if (this._turnA) { this._turnA.cancel(); clearTimeout(this._turnT); this._el.classList.toggle('left', from < 0); }
      const sx = (v, o_, y = 1) => ({ offset: o_, transform: `scale(${v},${y})`, easing: 'ease-in-out' });
      if (!this._busy && !this._dragging) {
        /* giro completo: primero voltea a ver, luego gira el cuerpo con un saltito */
        this._lockLook(-9, -1);
        this._turnA = el.animate([sx(from, 0), sx(from * 1.05, .2, .98), sx(from * .12, .46, 1.04), sx(dir * .12, .54, 1.04), sx(dir * 1.08, .78, .98), sx(dir * .97, .9), sx(dir, 1)], { duration: A.turn.d });
        this._turnT = setTimeout(() => { flip(); this._lockLook(9, -1); }, A.turn.d * .5);
        this.play('turn');
      } else {
        /* en pleno salto o colgando: media vuelta rápida sin interrumpir lo que hace */
        this._turnA = el.animate([sx(from, 0), sx(from * .1, .46, 1.05), sx(dir * .1, .54, 1.05), sx(dir * 1.06, .82), sx(dir, 1)], { duration: 340 });
        this._turnT = setTimeout(flip, 170);
      }
      this._turnA.finished.then(() => { this._turnA = null; }, () => {});
    }

    /** Decide hacia dónde mirar: al cursor si lo hay; si no, hacia el centro de la página según dónde esté ubicada. */
    _autoFace(force) {
      const mode = this.getAttribute('facing') || 'auto';
      if (mode === 'left' || mode === 'right') return this._face(mode === 'left' ? -1 : 1);
      if (this._dragging || (this._busy && !force)) return;
      const b = this._el.getBoundingClientRect(); if (!b.width) return;
      const cx = b.left + b.width / 2;
      if (this._hasPointer && this._px != null) {
        const off = (this._px - cx) * this._dir;
        if (off < -b.width * .45) this._face(-this._dir);     // el cursor quedó claramente a su espalda
      } else {
        const w = window.innerWidth;
        if (cx > w * .58) this._face(-1); else if (cx < w * .42) this._face(1);
      }
    }


    /* ---------- guía: señalar, hablar, caminar hasta un elemento, tutorial ---------- */

    _resolve(target) { return typeof target === 'string' ? document.querySelector(target) : target; }

    /** Señala un elemento con la patita y lo mira hasta que llames stop() o pidas otra animación. */
    pointAt(target) {
      const el = this._resolve(target); if (!el) return Promise.resolve();
      const b = this._el.getBoundingClientRect(), q = el.getBoundingClientRect();
      const hx = b.left + b.width * (this._dir > 0 ? .86 : .11), hy = b.top + b.height * .6;       // dónde queda la patita levantada
      const dx = (q.left + q.width / 2 - hx) * this._dir, dy = q.top + q.height / 2 - hy;
      const ang = Math.max(-25, Math.min(150, Math.atan2(dx, -dy) * 180 / Math.PI));               // 0 = arriba, 90 = al frente
      const rot = ang - 22, jx = Math.sin(ang * Math.PI / 180) * 7, jy = -Math.cos(ang * Math.PI / 180) * 7, lean = Math.max(-3, Math.min(6, (ang - 30) / 14));
      const d = Math.hypot(dx, dy) || 1, lk = [(dx / d * 9).toFixed(1), (dy / d * 5).toFixed(1)];
      A.point = { loop: true, look: [[80, ...lk]],
        in: { d: 520, tr: {
          H:  T([0, t()], [.35, t(0, 1.04, .95)], [1, t(-1, .99, 1.02, lean, lean / 3)]),
          P:  T([0, p()], [.3, p(0, 3, 0)], [.8, p(66 + jx, -90 + jy, rot + 6)], [1, p(66, -90, rot)]),
          AL: T([0, r()], [.5, r(12)], [1, r(8)]), AR: T([0, r()], [.5, r(-7)], [1, r(-4)]),
          E:  T([0, e()], [1, e(1, 1, 1.1)]),
        } },
        cycle: { d: 1100, look: [[0, ...lk]], tr: {
          P:  T([0, p(66, -90, rot)], [.22, p(66 + jx, -90 + jy, rot)], [.44, p(66, -90, rot)], [.66, p(66 + jx, -90 + jy, rot)], [.88, p(66, -90, rot)], [1, p(66, -90, rot)]),
          H:  T([0, t(-1, .99, 1.02, lean, lean / 3)], [.22, t(-.4, 1, 1.01, lean + 1, lean / 3 + .4)], [.44, t(-1, .99, 1.02, lean, lean / 3)], [.66, t(-.4, 1, 1.01, lean + 1, lean / 3 + .4)], [1, t(-1, .99, 1.02, lean, lean / 3)]),
          AL: T([0, r(8)], [.5, r(4)], [1, r(8)]), AR: T([0, r(-4)], [.5, r(-8)], [1, r(-4)]),
        } },
        out: { d: 520, tr: {
          P:  T([0, p()], [.85, p(-2, 2, -3)], [1, p()]),
          H:  T([0, t()], [.5, t(0, 1.02, .975)], [1, t()]),
          E:  T([0, e()], [.4, e(.12)], [.6, e()], [1, e()]),
        } },
      };
      return this.play('point');
    }

    /** Globo de texto. opts.ms lo cierra solo; opts.buttons = [{label, value, primary}] espera un clic. Devuelve el value elegido. */
    say(text, opts = {}) {
      const bub = this._bub, [step, txt, btns] = bub.children;
      clearTimeout(this._sayT); if (this._sayRes) this._sayRes();
      step.textContent = opts.step || ''; step.style.display = opts.step ? '' : 'none';
      txt.textContent = text; btns.innerHTML = '';
      return new Promise((res) => {
        this._sayRes = () => { this._sayRes = null; res(); };
        (opts.buttons || []).forEach((bt) => {
          const el = document.createElement('button'); el.type = 'button'; el.textContent = bt.label; if (bt.primary) el.className = 'pri';
          el.addEventListener('click', () => { this._sayRes = null; this.hush(); res(bt.value); });
          btns.appendChild(el);
        });
        bub.style.setProperty('--bx', '0px'); bub.classList.add('on');
        requestAnimationFrame(() => {                       // que no se salga de la pantalla
          const q = bub.getBoundingClientRect(), w = window.innerWidth; let bx = 0;
          if (q.left < 8) bx = 8 - q.left; else if (q.right > w - 8) bx = w - 8 - q.right;
          bub.style.setProperty('--bx', bx + 'px');
        });
        if (opts.ms) this._sayT = setTimeout(() => { this.hush(); }, opts.ms);
      });
    }
    hush() { clearTimeout(this._sayT); this._bub.classList.remove('on'); if (this._sayRes) this._sayRes(); }

    _idle() { return this._busy ? new Promise((res) => { const f = () => { if (!this._busy && !this._next) { this.removeEventListener('actionend', f); res(); } }; this.addEventListener('actionend', f); }) : Promise.resolve(); }

    /** Camina a saltitos hasta un desplazamiento (px) respecto a su lugar original. */
    async _walkTo(x, y) {
      if (Math.hypot(x - this._pos.x, y - this._pos.y) < 6) return;
      if (this._reduced) { this._moveTo(x, y, 250); return wait(260); }
      this._fixed = { x, y, step: Math.max(this.getBoundingClientRect().width * .6, Math.hypot(x - this._pos.x, y - this._pos.y) / 5) };
      await this.play('roam');
      this._fixed = null;
    }

    /** Camina hasta quedar junto a un elemento y voltea hacia él. */
    async moveNear(target) {
      const el = this._resolve(target); if (!el) return;
      const b = this.getBoundingClientRect(), q = el.getBoundingClientRect(), W = window.innerWidth, Hh = window.innerHeight, g = 10;
      const home = { l: b.left - this._pos.x, t: b.top - this._pos.y };
      let l, tp, dir;
      const cy = Math.max(60, Math.min(Hh - b.height - 8, q.top + q.height / 2 - b.height * .62));
      if (q.right + g + b.width <= W - 4) { l = q.right + g; tp = cy; dir = -1; }
      else if (q.left - g - b.width >= 4) { l = q.left - g - b.width; tp = cy; dir = 1; }
      else { l = Math.max(4, Math.min(W - b.width - 4, q.left + q.width / 2 - b.width / 2)); tp = Math.min(Hh - b.height - 4, q.bottom + g + 70); dir = q.left + q.width / 2 > l + b.width / 2 ? 1 : -1; }
      await this._walkTo(l - home.l, tp - home.t);
      this._face(dir);
      await wait(this._reduced ? 0 : 360);
    }

    _ring(el) {
      if (!this._ringEl) {
        const d = this._ringEl = document.createElement('div');
        d.style.cssText = 'position:fixed;pointer-events:none;border:3px solid var(--mascot-accent,#2f8fe8);border-radius:12px;box-shadow:0 0 0 5px rgba(47,143,232,.22);z-index:2147483000;transition:left .25s ease,top .25s ease,width .25s ease,height .25s ease,opacity .2s;opacity:0';
        document.body.appendChild(d);
      }
      this._ringFor = el;
      const tick = () => {
        if (!this._ringFor) return;
        const q = this._ringFor.getBoundingClientRect(), s = this._ringEl.style;
        s.left = q.left - 6 + 'px'; s.top = q.top - 6 + 'px'; s.width = q.width + 12 + 'px'; s.height = q.height + 12 + 'px'; s.opacity = 1;
        this._ringRaf = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(this._ringRaf); tick();
    }
    _unring() { this._ringFor = null; cancelAnimationFrame(this._ringRaf); if (this._ringEl) { this._ringEl.remove(); this._ringEl = null; } }

    /**
     * Tutorial guiado. pasos = [{ target: '#selector' | elemento, text: '...' }, ...]
     * opciones = { next: 'Siguiente', done: 'Listo', skip: 'Saltar', home: true }
     * Devuelve true si llegó al final, false si se saltó.
     */
    async tour(steps, opts = {}) {
      if (this._touring || this._gone) return false;
      this._touring = true;
      const back = document.activeElement, onKey = (ev) => { if (ev.key === 'Escape') { const s_ = this._bub.querySelector('button:not(.pri)') || this._bub.querySelector('button'); if (s_) s_.click(); } };
      document.addEventListener('keydown', onKey);
      const o_ = Object.assign({ next: 'Siguiente', done: 'Listo', skip: 'Saltar', home: true }, opts);
      const zi = this.style.zIndex, ps = this.style.position;
      if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
      this.style.zIndex = 2147483001;
      let completed = true;
      this.stop(); await this._idle();
      for (let i = 0; i < steps.length; i++) {
        const el = this._resolve(steps[i].target); if (!el) continue;
        this.hush(); this._unring();
        el.scrollIntoView({ block: 'center', behavior: this._reduced ? 'auto' : 'smooth' });
        await wait(this._reduced ? 50 : 480);
        await this.moveNear(el);
        this._ring(el);
        this.pointAt(el);
        const last = i === steps.length - 1;
        setTimeout(() => { const b_ = this._bub.querySelector('button.pri'); if (b_) b_.focus({ preventScroll: true }); }, 60);   // teclado: Enter avanza, Esc salta
        const v = await this.say(steps[i].text, { step: `${i + 1} / ${steps.length}`,
          buttons: (last ? [] : [{ label: o_.skip, value: 'skip' }]).concat([{ label: last ? o_.done : o_.next, value: 'next', primary: true }]) });
        this.stop(); await this._idle();
        if (v !== 'next') { completed = false; break; }
      }
      this.hush(); this._unring();
      if (o_.home) await this._walkTo(0, 0);
      await this.play(completed ? 'success' : 'nod');
      this.style.zIndex = zi; this.style.position = ps;
      this._touring = false;
      document.removeEventListener('keydown', onKey);
      if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (_) {} }
      return completed;
    }

    /* ---------- posición: arrastre y paseo ---------- */

    _moveTo(x, y, ms_, delay = 0, ease = 'ease-in-out') {
      this._pos.x = x; this._pos.y = y;
      this.style.transition = ms_ ? `translate ${ms_}ms ${ease} ${delay}ms` : 'none';
      this.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    }

    _startDrag() {
      this._dragging = true; this.classList.add('dragging');
      this._armSleep();
      /* punto exacto por donde la agarran: de ahí cuelga */
      const b = this._el.getBoundingClientRect(), pr_ = this._press, OX = __OX__;
      const gx = (pr_.x - b.left) / b.width * 100, gy = Math.max(4, Math.min(96, (pr_.y - b.top) / b.height * 100));
      const lx = this._dir > 0 ? gx : 2 * OX - gx;                                  // en coordenadas del dibujo (por si está volteada)
      this._dragEl.style.transformOrigin = `${lx.toFixed(1)}% ${gy.toFixed(1)}%`;
      /* ángulo de reposo: el cuerpo gira hasta que su centro queda debajo del agarre */
      const dx = (OX - gx) * b.width, dy = (62 - gy) * b.height;
      this._hang = Math.max(-78, Math.min(78, Math.atan2(dx, Math.max(dy, Math.abs(dx) * .25)) * 180 / Math.PI * .85));
      /* mira la mano que la agarra */
      const ex = lx - 66, ey = gy - 44, d = Math.hypot(ex, ey) || 1, f = Math.min(1, d / 22);
      this._grabLook = [(ex / d * 9 * f).toFixed(1), (ey / d * 5 * f).toFixed(1)];
      this._lockLook(...this._grabLook);
      this._spring.sv = 0.5;                                                         // tirón inicial: se estira de golpe y rebota como gelatina
      /* deformación local: mapa de desplazamiento centrado en el punto de agarre (la piel se estira hacia la mano) */
      if (this._canPinch && !this._reduced) {
        const W = this._el.offsetWidth, Hh = this._el.offsetHeight, hw = W * .25, cx = lx / 100 * W, cy = gy / 100 * Hh;
        /* mancha suave centrada en el agarre: ahí el desplazamiento es máximo y se desvanece hacia afuera */
        [this._pinch.bx, this._pinch.by].forEach((f_) => { f_.setAttribute('x', cx - hw); f_.setAttribute('y', cy - hw); f_.setAttribute('width', hw * 2); f_.setAttribute('height', hw * 2); });
        [this._pinch.gx, this._pinch.gy].forEach((f_) => { f_.setAttribute('stdDeviation', (W * .13).toFixed(1));
          f_.setAttribute('x', -.45 * W); f_.setAttribute('y', -.45 * Hh); f_.setAttribute('width', 1.9 * W); f_.setAttribute('height', 1.9 * Hh); });   // el desenfoque debe cubrir toda la región, no solo la mancha
        this._pinchW = W; this._pull = { x: 0, y: 0, vx: 0, vy: 0 };
        this._dragEl.style.filter = 'url(#pinch)';
      }
      this.play('drag');
      if (!this._reduced && !this._physOn) { this._physOn = true; this._physT = performance.now(); this._phys(); }
    }

    /** Péndulo con resorte colgado del punto de agarre + estirón elástico; al soltar se endereza. */
    _phys() {
      const now = performance.now(), dt = Math.min(.05, (now - this._physT) / 1000); this._physT = now;
      const sp = this._spring, pr_ = this._press, drag = this._dragging && pr_;
      if (drag) { pr_.vx *= .9; pr_.vy *= .9; }
      const vx = drag ? pr_.vx : 0, vy = drag ? pr_.vy : 0;
      /* ángulo (en pantalla): reposo colgante + inclinación contra el movimiento */
      const target = drag ? Math.max(-95, Math.min(95, this._hang - vx * .04)) : 0;
      const kk = drag ? 95 : 150, cc = drag ? 7.5 : 13;
      sp.v += ((target - sp.a) * kk - sp.v * cc) * dt; sp.a += sp.v * dt;
      /* estirón: resorte poco amortiguado para que tiemble como gelatina */
      const st = drag ? 1.035 + Math.min(.06, Math.abs(vy) * .00012 + Math.abs(vx) * .00003) : 1;
      sp.sv = (sp.sv || 0) + ((st - sp.s) * 210 - (sp.sv || 0) * 11) * dt; sp.s += sp.sv * dt;
      const s = this._el.style;
      /* tirón local: la mano jala la piel hacia arriba y hacia donde se mueve; el cuerpo queda rezagado y tiembla */
      const pl = this._pull;
      if (pl) {
        const W = this._pinchW; let tx = 0, ty = 0;
        if (drag) { tx = vx * .05; ty = -W * .085 + vy * .05; const L = Math.hypot(tx, ty), mx_ = W * .2; if (L > mx_) { tx *= mx_ / L; ty *= mx_ / L; } }
        pl.vx += ((tx - pl.x) * 260 - pl.vx * 10) * dt; pl.x += pl.vx * dt;
        pl.vy += ((ty - pl.y) * 260 - pl.vy * 10) * dt; pl.y += pl.vy * dt;
        /* a coordenadas del dibujo (deshacer volteo y giro) */
        const ang = -(sp.a * this._dir) * Math.PI / 180, wx = pl.x * this._dir, wy = pl.y;
        const lx_ = wx * Math.cos(ang) - wy * Math.sin(ang), ly_ = wx * Math.sin(ang) + wy * Math.cos(ang);
        this._pinch.dx.setAttribute('scale', (-2.3 * lx_).toFixed(2)); this._pinch.dy.setAttribute('scale', (-2.3 * ly_).toFixed(2));
        s.setProperty('--tx', (-pl.x * this._dir).toFixed(2)); s.setProperty('--ty', (-pl.y).toFixed(2));   // el punto agarrado se queda bajo el cursor
      }
      s.setProperty('--dr', (sp.a * this._dir).toFixed(2));
      s.setProperty('--ds', sp.s.toFixed(4)); s.setProperty('--dw', (1 / Math.sqrt(Math.max(.5, sp.s))).toFixed(4));
      s.setProperty('--ag', Math.max(-40, Math.min(40, -sp.a * this._dir * .5 - sp.v * this._dir * .03)).toFixed(1));   // las antenas cuelgan y llegan tarde
      const still = !pl || (Math.hypot(pl.x, pl.y) < .15 && Math.hypot(pl.vx, pl.vy) < 2);
      if (!drag && still && Math.abs(sp.a) < .05 && Math.abs(sp.v) < .5 && Math.abs(sp.s - 1) < .002 && Math.abs(sp.sv || 0) < .01) {
        if (pl) { this._dragEl.style.filter = ''; this._pull = null; ['--tx', '--ty'].forEach((k_) => s.setProperty(k_, 0)); }
        ['--dr', '--ag'].forEach((k_) => s.setProperty(k_, 0)); s.setProperty('--ds', 1); s.setProperty('--dw', 1);
        sp.a = sp.v = sp.sv = 0; sp.s = 1; this._physOn = false; return;
      }
      this._physRaf = requestAnimationFrame(() => this._phys());
    }

    /** Un saltito del paseo: elige destino dentro del contenedor (o la ventana) y avanza hacia él. */
    _roamStep(i, d) {
      const b = this.getBoundingClientRect(), w = b.width, h = b.height;
      const home = { l: b.left - this._pos.x, t: b.top - this._pos.y };
      let area = { l: 8, t: 8, r: window.innerWidth - 8, b: window.innerHeight - 8 };
      const par = this.parentElement && this.parentElement.getBoundingClientRect();
      if (this.getAttribute('roam') !== 'viewport' && par && par.width > w * 1.8) {
        area = { l: Math.max(par.left, area.l), t: Math.max(par.top, area.t), r: Math.min(par.right, area.r), b: Math.min(par.bottom, area.b) };
      }
      const minX = area.l - home.l, maxX = Math.max(minX, area.r - w - home.l), minY = area.t - home.t, maxY = Math.max(minY, area.b - h - home.t);
      if (this._fixed) {                                     // caminar hasta un punto concreto (tutorial)
        const f = this._fixed; let dx = f.x - this._pos.x, dy = f.y - this._pos.y; const dist = Math.hypot(dx, dy);
        if (dist < 4) { this.stop(); return; }
        if (dist > f.step) { dx *= f.step / dist; dy *= f.step / dist; }
        if (Math.abs(dx) > 6) this._face(dx > 0 ? 1 : -1);
        this._lockLook(7, Math.max(-5, Math.min(5, dy / f.step * 6)).toFixed(1));
        this._moveTo(this._pos.x + dx, this._pos.y + dy, d * .6, d * .18, 'cubic-bezier(.3,.1,.6,1)');
        if (dist <= f.step) this._later(d * .8, () => this.stop());
        return;
      }
      const g = this._goal;
      if (!g || g.left <= 0) {
        this._goal = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY), left: 2 + Math.floor(Math.random() * 5), rest: Math.random() < .5 ? 1 : 0 };
        if (g && g.rest) { this._lockLook(0, 0); return; }                       // un saltito en su lugar antes de cambiar de rumbo
      }
      const goal = this._goal; goal.left--;
      let dx = goal.x - this._pos.x, dy = goal.y - this._pos.y; const dist = Math.hypot(dx, dy), step = w * .42;
      if (dist < 4) { goal.left = 0; return; }
      if (dist > step) { dx *= step / dist; dy *= step / dist; } else goal.left = 0;
      if (Math.abs(dx) > 6) this._face(dx > 0 ? 1 : -1);
      this._lockLook(7, Math.max(-5, Math.min(5, dy / step * 6)).toFixed(1));
      this._moveTo(this._pos.x + dx, this._pos.y + dy, d * .6, d * .18, 'cubic-bezier(.3,.1,.6,1)');
    }

    /* ---------- accesibilidad, control del usuario y ahorro ---------- */

    _syncMotion() {
      const m_ = this.getAttribute('motion');
      this._reduced = !!this._userPaused || m_ === 'reduced' || (m_ !== 'full' && !!(this._mq && this._mq.matches)) || !this._el.animate;
      const cl = this._el.classList; cl.toggle('still', this._reduced); cl.toggle('paused', !!this._userPaused);
      const bp = this.shadowRoot.querySelector('.c-pause'), bh = this.shadowRoot.querySelector('.c-hide'), ch = this.shadowRoot.querySelector('.chip');
      bp.setAttribute('aria-label', this._userPaused ? this.labels.resume : this.labels.pause); bp.title = bp.getAttribute('aria-label');
      bp.setAttribute('aria-pressed', String(!!this._userPaused));
      bh.setAttribute('aria-label', this.labels.hide); bh.title = this.labels.hide; ch.setAttribute('aria-label', this.labels.show); ch.title = this.labels.show;
      if (this._reduced) { this._setLook(0, 0); if (this._busy === 'roam' || this._busy === 'sleep') this.stop(); }
    }

    _applyA11y() {
      const d = this._t.D[0];
      if (this.hasAttribute('decorative')) { d.setAttribute('aria-hidden', 'true'); d.removeAttribute('role'); d.removeAttribute('aria-label'); }
      else { d.removeAttribute('aria-hidden'); d.setAttribute('role', 'img'); d.setAttribute('aria-label', this.getAttribute('label') || 'Mascota'); }
    }

    _announce(name) {
      if (!this.hasAttribute('announce') || !this.messages[name]) return;
      this._sr.textContent = ''; setTimeout(() => { this._sr.textContent = this.messages[name]; }, 30);
    }

    /** En pausa total cuando no se ve (fuera de pantalla o pestaña oculta). */
    _setAwake(on) {
      if (on === this._awake) return;
      this._awake = on; this._el.classList.toggle('away', !on);
      const all = this.shadowRoot.getAnimations ? this.shadowRoot.getAnimations() : [];
      all.forEach((x) => { try { if (on) { if (x.playState === 'paused') x.play(); } else if (x.playState === 'running') x.pause(); } catch (_) {} });
      if (on) this._armSleep(); else clearTimeout(this._sleepT);
    }

    _key() { return 'slime-mascot:' + (this.id || 'default'); }
    _load() { if (this.hasAttribute('no-persist')) return {}; try { return JSON.parse(localStorage.getItem(this._key()) || '{}') || {}; } catch (_) { return {}; } }
    _save() { if (this.hasAttribute('no-persist')) return; try { localStorage.setItem(this._key(), JSON.stringify({ hidden: !!this._gone, paused: !!this._userPaused })); } catch (_) {} }

    /* ---------- vida en reposo ---------- */

    _applySize() {
      const s = parseFloat(this.getAttribute('size'));
      if (s > 0) { this.style.width = s + 'px'; this._el.style.fontSize = s / 13 + 'px'; }
    }

    /** Crea (una sola vez) la capa de cada pose registrada. La imagen se carga hasta que una animación la necesita. */
    _applyPoses() {
      for (const n in SlimeMascot.poses) {
        if (this._t['Q' + n]) continue;
        const P_ = SlimeMascot.poses[n], im = document.createElement('img');
        im.className = 'po'; im.alt = ''; im.draggable = false; im.decoding = 'async';
        im.style.cssText = `left:${P_.box[0]}%;top:${P_.box[1]}%;width:${P_.box[2]}%;height:${P_.box[3]}%;transform-origin:${P_.origin[0]}% ${P_.origin[1]}%`;
        this._poseBox.appendChild(im); this._t['Q' + n] = [im];
      }
    }
    /** Poses que usa una animación (se deducen de sus pistas Q…). */
    _posesOf(a) {
      const set = new Set();
      [a, a.in, a.cycle, a.out].forEach((seg) => { if (seg && seg.tr) for (const key in seg.tr) if (key[0] === 'Q') set.add(key.slice(1)); });
      return [...set];
    }
    _hasPoses(a) { return this._posesOf(a).every((n) => this._t['Q' + n]); }
    async _loadPoses(a, on) {
      const names = this._posesOf(a).filter((n) => this._t['Q' + n]), ims = names.map((n) => this._t['Q' + n][0]);
      if (!on) return ims.forEach((im) => im.classList.remove('on'));
      await Promise.all(ims.map((im, i) => {
        if (!im.src) im.src = SlimeMascot.poses[names[i]].src;
        im.classList.add('on');
        return im.decode ? im.decode().catch(() => {}) : null;
      }));
    }

    /** Viste el traje del atributo costume ("navidad", "halloween"… o "auto" para elegirlo por fecha). */
    _applyCostume() {
      let name = this.getAttribute('costume');
      if (name === 'auto') name = SlimeMascot.costumeForDate();
      const parts = (name && SlimeMascot.costumes[name]) || [], slots = { back: '', hat: '', front: '' };
      parts.forEach((p_) => { if (p_.slot in slots) slots[p_.slot] += p_.html; });
      for (const s_ in slots) this.shadowRoot.querySelectorAll('.cs-' + s_ + ',.cs-' + s_ + '2').forEach((el) => { if (el.innerHTML !== slots[s_]) el.innerHTML = slots[s_]; });
    }
    get costumes() { return Object.keys(SlimeMascot.costumes); }

    _applyVariant() {
      const v = this.getAttribute('variant');
      this._prop.innerHTML = PROPS[v] || '';
      this._t.PR = PROPS[v] ? [this._prop] : [];
    }

    _armSleep() {
      clearTimeout(this._sleepT);
      if (this.hasAttribute('no-sleep')) return;
      if (this.hasAttribute('calm')) return;                                   // modo tranquilo: sin siesta automática
      this._sleepT = setTimeout(() => { if (!this._busy && !this._dragging && this._awake && !this._reduced && !this._el.classList.contains('hidden')) this.play('sleep'); }, 30000);
    }

    _blinkLoop() {
      this._blinkT = setTimeout(() => {
        if (this._awake && !this._userPaused) {
          this._el.classList.add('blink');
          setTimeout(() => this._el.classList.remove('blink'), 120);
        }
        this._blinkLoop();
      }, 2200 + Math.random() * 3800);
    }

    /** De vez en cuando una antena da un tironcito. */
    _twitchLoop() {
      this._twT = setTimeout(() => {
        if (!this._busy && !this._reduced && this._awake) {
          const key = Math.random() < .5 ? 'AL' : 'AR', s = key === 'AL' ? 1 : -1;
          this._t[key][0].animate(T([0, r()], [.3, r(9 * s)], [.6, r(-4 * s)], [.82, r(2 * s)], [1, r()]), { duration: 620 });
        }
        this._twitchLoop();
      }, 5000 + Math.random() * 5000);
    }
  }

  SlimeMascot.costumes = {};
  SlimeMascot.poses = {};
  if (!customElements.get('slime-mascot')) customElements.define('slime-mascot', SlimeMascot);
})();
