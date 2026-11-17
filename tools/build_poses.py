"""Construye mascota-poses.js: poses de cuerpo completo recortadas de las hojas generadas (ps/n_*.png) y de los bocetos (ps/c_*.png)."""
import cv2, numpy as np, json, base64, os
D=json.load(open('work/sprites.json')); SW,SH=D['stage']
RIG_CX, RIG_FLOOR = 480.6, 752.0
KM=json.load(open('ps/kmeta.json'))
# escala de cada hoja: px ampliados -> px del escenario (ver sugerencia impresa: alto de los lentes)
SCALE={'59c4b9ff-image.png':727/882,'9e4aa0d3-image.png':727/882}
SCALE.update(json.load(open('ps/scales.json')) if os.path.exists('ps/scales.json') else {})
# solo ChatGPT: tandas 1 y 2 (ángulos) + hoja de bocetos original (gestos)
OLD={n:727/840 for n in ('jump','crawl','nap','sad','think','sit','excited','gasp','wink','lean')}
ORDER=['front','f34','side','b34','back','b34L','sideL','f34L','jump','crawl','nap','sad','think','sit','excited','gasp','wink','lean']
NECK=('front','excited','wink','gasp','think','sit','lean','jump')
PMUL={'takeoff':.8,'lifted':.85,'hang':.85,'kick':.85}
HATDY={'crawl':6,'nap':7}
BYGLASSES=('lifted','hang','kick')
ROT={'lean':-13,'jump':-6,'excited':-4,'nap':10,'crawl':4,'front':9,'back':9,'side':3}
OVR=json.load(open('ps/hat_ovr.json')) if os.path.exists('ps/hat_ovr.json') else {}
def brown(p):
    hsv=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV).astype(int); h,s,v=hsv[...,0],hsv[...,1],hsv[...,2]
    return (p[...,3]>200)&((h<18)|(h>170))&(s>90)&(v>50)&(v<235)
rig=cv2.imread('work/all_rgba.png',-1)[71:71+778,10:10+790]
gy,gx=np.where(brown(rig)); RG_=(gx.mean(),gy.mean()); RBH=np.percentile(gy,98)-np.percentile(gy,2)
RH=(469.36,124.0)
out={}; total=0; ANCH={}; sug={}
for n in ORDER:
    f=f'ps/c_{n}.png' if n in OLD else f'ps/n_{n}.png'
    if not f or not os.path.exists(f): continue
    p=cv2.imread(f,-1); m=p[...,3]>128
    ys=np.where(m.any(1))[0]; xs=np.where(m.any(0))[0]; x0,y0,x1,y1=xs.min(),ys.min(),xs.max(),ys.max()
    by,bx=np.where(brown(p)); bh=np.percentile(by,98)-np.percentile(by,2)
    if n in OLD: s=OLD[n]
    else:
        src=KM[n]['src']; sug.setdefault(src,[]).append((n,round(RBH/bh,3),y1-y0))
        if src not in SCALE: continue
        s=SCALE[src]*PMUL.get(n,1)
    top=m.copy(); top[int(y0+(y1-y0)*.55):]=False; cx=np.where(top)[1].mean()
    pad=8; X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(p.shape[1],x1+pad),min(p.shape[0],y1+pad)
    crop=p[Y0:Y1,X0:X1]; w=(X1-X0)*s; h=(Y1-Y0)*s
    if n in BYGLASSES: left=RG_[0]-(bx.mean()-X0)*s; topy=RG_[1]-(by.mean()-Y0)*s; ox,oy=(bx.mean()-X0)/(X1-X0)*100,(by.mean()-Y0)/(Y1-Y0)*100
    else: left=RIG_CX-(cx-X0)*s; topy=RIG_FLOOR-(y1-Y0)*s; ox,oy=(cx-X0)/(X1-X0)*100,(y1-Y0)/(Y1-Y0)*100
    img=cv2.resize(crop,(round(w*.72),round(h*.72)),interpolation=cv2.INTER_AREA)
    ok,buf=cv2.imencode('.webp',img,[cv2.IMWRITE_WEBP_QUALITY,84]); total+=len(buf)
    out[n]={'src':'data:image/webp;base64,'+base64.b64encode(buf.tobytes()).decode(),
            'box':[round(float(left)/SW*100,3),round(float(topy)/SH*100,3),round(float(w)/SW*100,3),round(float(h)/SH*100,3)],'origin':[round(float(ox),2),round(float(oy),2)]}
    ax,ay=left+(bx.mean()-X0)*s, topy+(by.mean()-Y0)*s
    d=[round(float(ax-RG_[0])/SW*100,2),round(float(ay-RG_[1])/SH*100,2),ROT.get(n,0)]
    a={'hat':OVR.get(n,[d[0],round(d[1]+HATDY.get(n,0),2),d[2]])}
    if n in NECK: a['neck']=d
    ANCH[n]=a
for src,v in sug.items(): print(src,'escala',SCALE.get(src),'| sugerida (lentes), alto:',v)
js='/*! Poses de cuerpo completo para <slime-mascot>. Cargar despues de mascota.js */\n(function(){var P='+json.dumps(out,separators=(',',':'))+';\nfunction go(){customElements.get("slime-mascot").addPoses(P)}\nif(customElements.get("slime-mascot"))go();else customElements.whenDefined("slime-mascot").then(go);})();\n'
open('mascota-poses.js','w').write(js); print(len(out),'poses; total',total//1024,'KB; js',len(js)//1024,'KB')
json.dump({'ox':round(RIG_CX/SW*100,2),'rigHat':[round(RH[0]/SW*100,2),round(RH[1]/SH*100,2)],'rigNeck':[round(float(RG_[0])/SW*100,2),round(float(RG_[1])/SH*100,2)],'poses':ANCH},open('work/pose_anchors.json','w'))
