
import io,base64,json,numpy as np
from PIL import Image
D=json.load(open('work/sprites.json')); vx,vy,vw,vh=D['view']
def part(name,slot,mode,ax,ay,w,q=86):
    im=Image.open(f'r3d/out/cs/{name}.png').convert('RGBA'); im=im.crop(im.getbbox())
    asp=im.height/im.width; h=w*asp
    left={'bc':ax-w/2,'tc':ax-w/2,'c':ax-w/2}[mode]; top={'bc':ay-h,'tc':ay,'c':ay-h/2}[mode]
    buf=io.BytesIO(); im.save(buf,'WEBP',quality=q,method=6,alpha_quality=100)
    st='left:%.2f%%;top:%.2f%%;width:%.2f%%;height:%.2f%%'%((left-vx)/vw*100,(top-vy)/vh*100,w/vw*100,h/vh*100)
    return {'slot':slot,'html':f'<img style="{st}" src="data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}" alt="" draggable="false">'},len(buf.getvalue())
SPEC=json.load(open('costumes.json'))
out={}; tot=0
for cname,parts in SPEC.items():
    out[cname]=[]
    for p in parts:
        d,n=part(*p); out[cname].append(d); tot+=n
js="""/*! Trajes para <slime-mascot>. Cargar después de mascota.js:
 *   <script src="mascota.js" defer></script>
 *   <script src="mascota-trajes.js" defer></script>
 *   <slime-mascot costume="navidad"></slime-mascot>      (o costume="auto" para elegirlo por fecha)
 * Trajes: """+' · '.join(SPEC)+"""
 */
(() => {
  const C = """+json.dumps(out)+""";
  const reg = () => customElements.get('slime-mascot').addCostumes(C);
  customElements.get('slime-mascot') ? reg() : customElements.whenDefined('slime-mascot').then(reg);
})();
"""
open('mascota-trajes.js','w').write(js)
html=open('demo-mascota.html').read()
if '__TRAJES__' in html: open('demo-mascota.html','w').write(html.replace('__TRAJES__',js.replace('</script>','<\\/script>')))
print('trajes KB',len(js)//1024)
