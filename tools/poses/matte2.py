import cv2, numpy as np, json, sys
from scipy import ndimage as ndi
meta=json.load(open('meta.json'))
def matte(nm):
    up=cv2.imread(f'up_{nm}.png'); h,w=up.shape[:2]
    b,g,r=[up[...,i].astype(int) for i in range(3)]
    sure=((g>150)|((r>g+30)&(r>80)))
    sure=ndi.binary_opening(sure,iterations=2)
    lab,n=ndi.label(ndi.binary_fill_holes(ndi.binary_closing(sure,iterations=6)))
    if n>1:
        sizes=ndi.sum(np.ones_like(lab),lab,range(1,n+1)); keep=lab==(1+int(np.argmax(sizes)))
    else: keep=lab>0
    sure&=keep
    fgs=ndi.binary_erosion(ndi.binary_fill_holes(sure&keep),iterations=6)
    prob=ndi.binary_dilation(keep,iterations=10)
    far=~ndi.binary_dilation(keep,iterations=26)
    m=np.full((h,w),cv2.GC_PR_BGD,np.uint8); m[prob]=cv2.GC_PR_FGD; m[fgs]=cv2.GC_FGD; m[far]=cv2.GC_BGD
    bg=np.zeros((1,65)); fg=np.zeros((1,65))
    cv2.grabCut(up,m,None,bg,fg,4,cv2.GC_INIT_WITH_MASK)
    a=((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD))
    a=ndi.binary_fill_holes(ndi.binary_opening(a,iterations=3))
    lab,n=ndi.label(a)
    if n>1:
        sizes=ndi.sum(np.ones_like(lab),lab,range(1,n+1)); a=lab==(1+int(np.argmax(sizes)))
    a=ndi.binary_erosion(a,iterations=2)
    # sangrado de color hacia el borde para que no quede halo oscuro
    idx=ndi.distance_transform_edt(~ndi.binary_erosion(a,iterations=3),return_distances=False,return_indices=True)
    col=up[idx[0],idx[1]]
    inner=ndi.binary_erosion(a,iterations=3)
    out=np.where(inner[...,None],up,col)
    al=cv2.GaussianBlur(a.astype(np.float32),(0,0),2.2)
    rgba=np.dstack([out,(al*255).astype(np.uint8)])
    cv2.imwrite(f'p_{nm}.png',rgba)
    return rgba
names=sys.argv[1:] or list(meta)
for nm in names: matte(nm); print(nm,flush=True)
