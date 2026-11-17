import cv2, numpy as np, json
from scipy import ndimage as ndi
im=cv2.imread('work/src.png'); H,W=im.shape[:2]
B,G,R=[im[...,i].astype(int) for i in range(3)]
gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
body=ndi.binary_opening(R>38,iterations=1)
passable=(~body)|(gray<42)
pl,_=ndi.label(passable); border=np.unique(np.concatenate([pl[0],pl[-1],pl[:,0],pl[:,-1]]))
outside=np.isin(pl,border[border>0])
filled=ndi.binary_opening(~outside,iterations=2)
filled=ndi.binary_fill_holes(filled)
body=body&filled
lab,n=ndi.label(filled); sizes=ndi.sum(filled,lab,range(1,n+1))
filled=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>5000])
# huecos encerrados: pupilas (negras) se quedan; fondo visto a través del lente (azul marino) se vuelve transparente
holes=filled&~body; hl,hn=ndi.label(holes); through=np.zeros((H,W),bool)
for i in range(1,hn+1):
    m=hl==i; sz=m.sum()
    if sz<40: continue
    mb,mr=B[m].mean(),R[m].mean()
    ring=ndi.binary_dilation(m,iterations=5)&~m
    brownish=((R[ring]>B[ring]+25).mean()>0.12)
    navy=(mb<140) and (mb-mr)>30 and brownish   # fondo visto a través del lente (pegado al marco); la boca se queda
    if navy: through|=m
solid=filled&~ndi.binary_dilation(through,iterations=1)
np.save('work/solid.npy',filled)
core=ndi.binary_erosion(solid,iterations=2)
_,idx=ndi.distance_transform_edt(~core,return_indices=True)
col=im[idx[0],idx[1]]                       # color del interior más cercano → bordes sin halo oscuro
near=ndi.binary_dilation(solid,iterations=3)
alpha=cv2.GaussianBlur(ndi.binary_erosion(solid,iterations=1).astype(np.float32),(0,0),0.9)
rgb=np.where(core[...,None],im,col)
rgba=np.dstack([rgb,(alpha*255).astype(np.uint8)])
cv2.imwrite('work/all_rgba.png',rgba)
lab,n=ndi.label(filled); boxes=[[sl[1].start,sl[0].start,sl[1].stop,sl[0].stop] for sl in ndi.find_objects(lab)]
boxes.sort(key=lambda b:(b[0]>780, b[0]>1180, b[1])); print(boxes)
json.dump(boxes,open('work/boxes.json','w'))
a=alpha[...,None]
for name,c in [('white',(255,255,255)),('dark',(47,22,4))]:
    cv2.imwrite(f'work/prev_{name}.jpg',(rgb*a+np.array(c)*(1-a)).astype(np.uint8))
