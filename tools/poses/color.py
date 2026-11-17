import cv2,numpy as np,json
meta=json.load(open('meta.json')); ns=list(meta)
src=cv2.imread('/home/claude/work/all_rgba.png',-1)[71:71+778,10:10+790]
def masks(p):
    hsv=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV).astype(int); h,s,v=hsv[...,0],hsv[...,1],hsv[...,2]; a=p[...,3]>200
    blue=a&(h>85)&(h<125)&(s>60)&(v>110)
    brown=a&((h<18)|(h>170))&(s>90)&(v>50)
    return blue,brown
def stats(p,m):
    lab=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2LAB).astype(np.float32); x=lab[m]; return x.mean(0),x.std(0)
ref=cv2.imread('q_f34.png',-1)
T={}
for i,k in enumerate(('blue','brown')):
    ms,ss=stats(ref,masks(ref)[i]); mr,sr=stats(src,masks(src)[i]); T[k]=(ms,ss,mr,sr); print(k,ms,ss,mr,sr)
def apply(p,strength=(.85,.8)):
    lab=cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2LAB).astype(np.float32); out=lab.copy()
    for i,k in enumerate(('blue','brown')):
        ms,ss,mr,sr=T[k]; m=cv2.GaussianBlur(masks(p)[i].astype(np.float32),(0,0),2)[...,None]*strength[i]*np.clip((cv2.cvtColor(p[...,:3],cv2.COLOR_BGR2HSV)[...,2:3].astype(np.float32)-70)/50,0,1)
        g=np.clip(sr/ss,.75,1.3); tgt=(lab-ms)*g+mr
        out=out*(1-m)+tgt*m
    q=p.copy(); q[...,:3]=cv2.cvtColor(np.clip(out,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR); return q
for nm in ns: cv2.imwrite(f'c_{nm}.png',apply(cv2.imread(f'q_{nm}.png',-1)))
def on(p,f=1):
    p=cv2.resize(p,None,fx=f,fy=f,interpolation=cv2.INTER_AREA); a=p[...,3:]/255.; return (p[...,:3]*a+255*(1-a)).astype(np.uint8)
f=cv2.imread('c_f34.png',-1); e=cv2.imread('c_sad.png',-1)
B=on(f,778/f.shape[0]); E=on(e,.75); E=np.vstack([np.full((778-E.shape[0],E.shape[1],3),255,np.uint8),E])
cv2.imwrite('cmp.jpg',np.hstack([on(src),B,E]))
