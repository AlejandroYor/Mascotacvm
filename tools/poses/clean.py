import cv2,numpy as np,json
from scipy import ndimage as ndi
meta=json.load(open('meta.json')); ns=list(meta)
R=15; yy,xx=np.mgrid[-R:R+1,-R:R+1]; disk=(yy*yy+xx*xx<=R*R)
tiles=[]
def big(m):
    lab,n=ndi.label(m)
    if n<2: return m
    s=ndi.sum(np.ones_like(lab),lab,range(1,n+1)); return lab==(1+int(np.argmax(s)))
for nm in ns:
    p=cv2.imread(f'p_{nm}.png',-1); a=p[...,3].astype(int)
    up=cv2.imread(f'up_{nm}.png'); ub,ug,ur=[up[...,i].astype(int) for i in range(3)]
    navy=ndi.binary_opening((ub>ur+35)&(ug<95)&(ub<170)&(a>128),iterations=3)
    lab,n=ndi.label(navy); kill=np.zeros_like(navy)
    for i in range(1,n+1):
        m=lab==i
        if m.sum()>500: kill|=ndi.binary_dilation(m,iterations=5)
    solid=big((a>128)&~kill)
    ys=np.where(solid.any(1))[0]; y0,y1=ys.min(),ys.max(); cut=int(y1-(y1-y0)*.12)
    op=cv2.morphologyEx(solid.astype(np.uint8),cv2.MORPH_OPEN,disk.astype(np.uint8))>0
    s2=solid.copy(); s2[cut:]=op[cut:]; s2=big(s2)
    al=cv2.GaussianBlur(s2.astype(np.float32),(0,0),2.0)*255
    p[...,3]=np.minimum(p[...,3],al).astype(np.uint8)
    cv2.imwrite(f'q_{nm}.png',p)
    ys=np.where(s2.any(1))[0]; y1=ys.max()
    t=p[max(0,y1-170):y1+30]; aa=t[...,3:]/255.; t=(t[...,:3]*aa+np.array([90,90,90])*(1-aa)).astype(np.uint8)
    c=np.full((200,960,3),90,np.uint8); c[:t.shape[0],:t.shape[1]]=t[:200,:960]; cv2.putText(c,nm,(5,20),0,.7,(255,255,255),2); tiles.append(c)
while len(tiles)%4: tiles.append(np.full((200,960,3),90,np.uint8))
cv2.imwrite('bottoms.jpg',cv2.resize(np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]),None,fx=.5,fy=.5))
