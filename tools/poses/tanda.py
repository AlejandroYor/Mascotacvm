"""Procesa una hoja con fondo magenta: separa poses, amplía, recorta por croma.
uso: tanda.py imagen factor(2|4) nombre1 nombre2 ...  (de izquierda a derecha; '-' para saltar una)"""
import cv2, numpy as np, json, sys, os
from scipy import ndimage as ndi
src=sys.argv[1]; fac=int(sys.argv[2]); names=sys.argv[3:]
im=cv2.imread(src); H,W=im.shape[:2]
def key(x):
    x=x.astype(np.float32); b,g,r=x[...,0],x[...,1],x[...,2]
    return (np.minimum(r,b)-g)/np.maximum(np.maximum(r,b),1)       # magenta (también en sombra): ~1; personaje: <=0.3
fg=key(im)<.5
fg=ndi.binary_fill_holes(ndi.binary_opening(fg,iterations=2))
lab,n=ndi.label(fg); sl=ndi.find_objects(lab)
boxes=[(s[1].start,s[0].start,s[1].stop,s[0].stop) for i,s in enumerate(sl) if (lab[s]==i+1).sum()>.006*H*W]
boxes.sort(); print(len(boxes),'poses',boxes,flush=True)
assert len(boxes)==len(names),(len(boxes),names)
sr=cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel('/home/claude/ps/e%d.pb'%fac); sr.setModel('edsr',fac)
def big(m):
    lab,n=ndi.label(m)
    if n<2: return m
    s=ndi.sum(np.ones_like(lab),lab,range(1,n+1)); return lab==(1+int(np.argmax(s)))
bgc=np.median(im[:10].reshape(-1,3),0).astype(np.float32)
meta=json.load(open('/home/claude/ps/kmeta.json')) if os.path.exists('/home/claude/ps/kmeta.json') else {}
for (x0,y0,x1,y1),nm in zip(boxes,names):
    if nm=='-' or os.path.exists(f'/home/claude/ps/k_{nm}.png'): continue
    pad=14; X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(W,x1+pad),min(H,y1+pad)
    up=sr.upsample(im[Y0:Y1,X0:X1]).astype(np.float32)
    k=key(up); a=1-np.clip((k-.22)/(.85-.22),0,1)
    solid=big(ndi.binary_fill_holes(ndi.binary_opening(a>.5,iterations=fac)))
    a=np.where(ndi.binary_erosion(solid,iterations=2*fac),1,a)*ndi.binary_dilation(solid,iterations=fac)
    a=cv2.GaussianBlur(a.astype(np.float32),(0,0),.45*fac)
    A=np.clip(a,.05,1)[...,None]; F=np.clip((up-(1-A)*bgc)/A,0,255)          # quita la mezcla con el fondo
    inner=ndi.binary_erosion(a>.97,iterations=fac)
    idx=ndi.distance_transform_edt(~inner,return_distances=False,return_indices=True)
    near=F[idx[0],idx[1]]; w=np.clip((a-.6)/.38,0,1)[...,None]*inner[...,None]
    col=F*w+near*(1-w)                                                          # el borde toma el color interior: sin halo magenta
    cv2.imwrite(f'/home/claude/ps/k_{nm}.png',np.dstack([np.clip(col,0,255),a*255]).astype(np.uint8))
    meta[nm]={'fac':fac,'h':(y1-y0)*fac,'w':(x1-x0)*fac,'src':os.path.basename(src)}; print(nm,meta[nm],flush=True)
    json.dump(meta,open('/home/claude/ps/kmeta.json','w'))
