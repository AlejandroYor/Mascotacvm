import json
D=json.load(open('work/sprites.json'))
I=D['poses']['idle']; SW,SH=D['stage']; OX,OY=D['origin']; vx,vy,vw,vh=D['view']
def box(b): return 'left:%.3f%%;top:%.3f%%;width:%.3f%%;height:%.3f%%'%tuple(b)
def img(cls,b,src,extra=''): return f'<img class="{cls}" style="{box(b)};{extra}" src="{src}" alt="" draggable="false">'
L=['<div class="cs cs-back"></div><div class="rig">']
L.append(img('base',[0,0,100,100],I['src']))
L.append('<div class="cs cs-hat"></div>')
for c,a in zip(('antL','antR'),I['ants']):
    px=a['box'][0]+a['pivot'][0]*a['box'][2]/100; py=a['box'][1]+a['pivot'][1]*a['box'][3]/100
    L.append(f'<div class="aw" style="transform-origin:{px:.2f}% {py:.2f}%">'+img('ant '+c,a['box'],a['src'],'transform-origin:%.1f%% %.1f%%'%tuple(a['pivot']))+'</div>')
L.append(img('mouth',I['mouth']['box'],I['mouth']['src']))
for q in I['pupils']: L.append(img('pupil',q['box'],q['src']))
L.append(f'''<svg class="face" viewBox="{vx} {vy} {vw} {vh}" aria-hidden="true">
<defs><clipPath id="mc"><path d="M562 471 Q584 479 605 462 Q607 497 590 505 Q570 511 562 471Z"/></clipPath></defs>
<g class="eh" fill="none" stroke="#15161d" stroke-linecap="round">
<path transform="translate(470 420) rotate(-11)" d="M-38 14 Q0 -40 38 14" stroke-width="13"/>
<path transform="translate(639 381) rotate(-11)" d="M-26 10 Q0 -29 26 10" stroke-width="10.5"/></g>
<g class="es" fill="none" stroke="#15161d" stroke-linecap="round">
<path transform="translate(470 414) rotate(-11)" d="M-36 -6 Q0 26 36 -6" stroke-width="12"/>
<path transform="translate(639 377) rotate(-11)" d="M-25 -5 Q0 19 25 -5" stroke-width="10"/></g>
<g class="br">
<g transform="translate(470 416) rotate(-11)"><path d="M-50 -84 L50 -84 L50 -30 L-50 -56Z" fill="#eef3fb"/><path d="M-50 -56 L50 -30" stroke="#15161d" stroke-width="11" stroke-linecap="round"/></g>
<g transform="translate(637 378) rotate(-11)"><path d="M-33 -62 L36 -62 L36 -44 L-33 -22Z" fill="#f1f5fc"/><path d="M-33 -22 L36 -44" stroke="#15161d" stroke-width="9" stroke-linecap="round"/></g></g>
<g class="mo2"><ellipse cx="584" cy="481" rx="11.5" ry="13.5" transform="rotate(-11 584 481)" fill="#2b1226" stroke="#17233f" stroke-width="3.5"/><ellipse cx="585" cy="487" rx="6" ry="4" transform="rotate(-11 585 487)" fill="#ff7d96" opacity=".85"/></g>
<g class="mo"><path d="M562 471 Q584 479 605 462 Q607 497 590 505 Q570 511 562 471Z" fill="#2b1226" stroke="#17233f" stroke-width="4" stroke-linejoin="round"/>
<ellipse cx="588" cy="499" rx="12" ry="7" transform="rotate(-11 588 499)" fill="#ff7d96" clip-path="url(#mc)"/></g>
</svg>''')
L.append(img('over',I['over']['box'],I['over']['src']))
L.append('<div class="cs cs-front"></div>')
L.append('</div><div class="poses"></div><div class="cs cs-hat2"></div><div class="cs cs-front2"></div>')
L.append('<div class="prop"></div>')
L.append('<div class="item"></div>')
L.append('<div class="rig">'+img('paw',I['paw']['box'],I['paw']['src'],'transform-origin:%.1f%% %.1f%%'%tuple(I['paw']['pivot']))+'</div>')
import io,base64
from PIL import Image
def uri(n,q=88):
    im=Image.open(f'r3d/out/{n}.png').convert('RGBA'); bb=im.getbbox(); 
    buf=io.BytesIO(); im.save(buf,'WEBP',quality=q,method=6,alpha_quality=100)
    return '<img src="data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()+'" alt="" draggable="false">', len(buf.getvalue())
FXN=('ok','down','up','mad','bang','q','star_b','star_g'); FX={n:uri('fx_'+n,86) for n in FXN}
PR={n:uri(n) for n in ('sheet','bag')}; IT={n:uri(n) for n in ('lupa','pencil','paper','envelope','box','lock','clock','bulb','wifi')}
print('objetos KB',sum(v[1] for v in list(PR.values())+list(IT.values()))//1024)
tpl=open('component.tpl.js').read()
js=(tpl.replace('__RATIO__',f'{SW} / {SH}').replace('__ORIGIN__',f'{OX:.2f}% {OY:.2f}%').replace('__OX__',f'{OX:.2f}')
       .replace('__LAYERS__','\n'.join(L))
       .replace('__PROPS__',json.dumps({k:v[0] for k,v in PR.items()})).replace('__ITEMS__',json.dumps({k:v[0] for k,v in IT.items()})))
PAJ=json.load(open('work/pose_anchors.json'))
js=js.replace('__POSEANCH__',json.dumps(PAJ,separators=(',',':'))).replace('__HATO__','%s%% %s%%'%tuple(PAJ['rigHat'])).replace('__NECKO__','%s%% %s%%'%tuple(PAJ['rigNeck']))
js=js.replace('__FXMAP__',json.dumps({n:FX[n][0] for n in FXN}))
open('mascota.js','w').write(js)
open('demo-mascota.html','w').write(open('demo.tpl.html').read().replace('__JS__',js.replace('</script>','<\\/script>')))
print(len(js)//1024,'KB')
