"""Limpia magenta atrapado, iguala el color de cada grupo al dibujo articulado y guarda n_<nombre>.png"""
import cv2, numpy as np, json, os
from scipy import ndimage as ndi
meta=json.load(open('kmeta.json'))
rig=cv2.imread('/home/claude/work/all_rgba.png',-1)[71:71+778,10:10+790]
def masks(p):
    hsv=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV).astype(int); h,s,v=hsv[...,0],hsv[...,1],hsv[...,2]; a=p[...,3]>200
    return a&(h>85)&(h<125)&(s>40)&(v>110), a&((h<18)|(h>170))&(s>90)&(v>50)&(v<235)
def lab(p): return cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2LAB).astype(np.float32)
def clean(p,fac):
    x=p[...,:3].astype(np.float32); b,g,r=x[...,0],x[...,1],x[...,2]
    k=(np.minimum(r,b)-g)/np.maximum(np.maximum(r,b),1)
    mag=ndi.binary_opening((k>.55)&(p[...,3]>60),iterations=1)
    l,n=ndi.label(mag); kill=np.zeros_like(mag)
    for i in range(1,n+1):
        m=l==i
        if m.sum()>30*fac*fac: kill|=ndi.binary_dilation(m,iterations=fac+1)
    if kill.any():
        al=p[...,3].astype(np.float32)*(1-cv2.GaussianBlur(kill.astype(np.float32),(0,0),.5*fac)); al[kill]=0
        idx=ndi.distance_transform_edt(ndi.binary_dilation(kill,iterations=fac),return_distances=False,return_indices=True)
        p=p.copy(); p[...,:3]=p[...,:3][idx[0],idx[1]]; p[...,3]=al.astype(np.uint8)
    # tinte magenta que se cuela en bordes translúcidos: lo lleva al azul del cuerpo conservando la luz
    al=p[...,3]>40; band=al&~ndi.binary_erosion(al,iterations=9*fac)
    hsv=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV).astype(int); spill=band&(hsv[...,0]>=128)&(hsv[...,0]<=166)&(hsv[...,1]>30)
    if spill.any():
        L=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2LAB).astype(np.float32); blue=al&(hsv[...,0]>88)&(hsv[...,0]<118)&(hsv[...,1]>50)
        if blue.any():
            w=cv2.GaussianBlur(spill.astype(np.float32),(0,0),fac)[...,None]; tgt=L.copy(); tgt[...,1:]=L[blue][:,1:].mean(0)
            p=p.copy(); p[...,:3]=cv2.cvtColor(np.clip(L*(1-w)+tgt*w,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR)
    return p
groups={}
for n,m in meta.items(): groups.setdefault('gpt' if m['fac']==2 else 'gem',[]).append(n)
RS=[(lab(rig)[m].mean(0),lab(rig)[m].std(0)) for m in masks(rig)]
for g,names in groups.items():
    P={n:clean(cv2.imread(f'k_{n}.png',-1),meta[n]['fac']) for n in names if os.path.exists(f'k_{n}.png')}
    st=[]
    for i in range(2):
        xs=np.concatenate([lab(p)[masks(p)[i]][::7] for p in P.values()]); st.append((xs.mean(0),xs.std(0)))
    print(g,len(P),'azul',st[0][0].round(1),'->',RS[0][0].round(1),'cafe',st[1][0].round(1),'->',RS[1][0].round(1))
    for n,p in P.items():
        L=lab(p); out=L.copy(); v=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV)[...,2:3].astype(np.float32)
        for i,strength in ((0,.85),(1,.8)):
            ms,ss=st[i]; mr,sr=RS[i]; m=cv2.GaussianBlur(masks(p)[i].astype(np.float32),(0,0),2)[...,None]*strength*np.clip((v-70)/50,0,1)
            out=out*(1-m)+((L-ms)*np.clip(sr/ss,.75,1.3)+mr)*m
        q=p.copy(); q[...,:3]=cv2.cvtColor(np.clip(out,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR); cv2.imwrite(f'n_{n}.png',q)
