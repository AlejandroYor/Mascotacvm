import cv2, numpy as np, json, sys
from scipy import ndimage as ndi
im=cv2.imread('/mnt/user-data/uploads/61fffcfa-image.png'); H,W=im.shape[:2]
b,g,r=[im[...,i].astype(int) for i in range(3)]
core=((g>135)|((r>g+25)&(r>70)))
core=ndi.binary_closing(core,iterations=2); core=ndi.binary_fill_holes(core)
lab,n=ndi.label(core); sl=ndi.find_objects(lab)
boxes=[]
for i,s in enumerate(sl):
    a=(lab[s]==i+1).sum(); h=s[0].stop-s[0].start; w=s[1].stop-s[1].start
    if a>6000 and h>90: boxes.append([s[1].start,s[0].start,s[1].stop,s[0].stop,int(a)])
boxes.sort(key=lambda q:(round((q[1]+q[3])/2/340),q[0]))
for q in boxes: print(q)
json.dump(boxes,open('boxes.json','w'))
