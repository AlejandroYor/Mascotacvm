import cv2, numpy as np, json
from scipy import ndimage as ndi
im=cv2.imread('/mnt/user-data/uploads/61fffcfa-image.png'); H,W=im.shape[:2]
boxes=json.load(open('boxes.json'))
def name(q):
    cx=(q[0]+q[2])/2; cy=(q[1]+q[3])/2
    row=0 if cy<320 else 1 if cy<640 else 2
    cols=[125,360,575,790,1015,1225,1435]; c=int(np.argmin([abs(cx-v) for v in cols]))
    N=[['front','f34','side','b34','back','b34b','f34b'],['happy','excited','wink','gasp','sad','nap','think'],['sit','crawl','lean','jump','top','bottom','x']]
    return N[row][c]
sr=cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel('e4.pb'); sr.setModel('edsr',4)
meta={}
for q in boxes:
    nm=name(q); pad=14
    x0,y0,x1,y1=max(0,q[0]-pad),max(0,q[1]-pad),min(W,q[2]+pad),min(H,q[3]+pad)
    crop=im[y0:y1,x0:x1]
    up=sr.upsample(crop)
    cv2.imwrite(f'up_{nm}.png',up)
    meta[nm]=[x0,y0,x1,y1]; print(nm,up.shape,flush=True)
json.dump(meta,open('meta.json','w'))
