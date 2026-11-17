import cv2, numpy as np, json, base64, io
from scipy import ndimage as ndi
from PIL import Image
im=cv2.imread('work/src.png')
rgba=cv2.imread('work/all_rgba.png',cv2.IMREAD_UNCHANGED)
solid=np.load('work/solid.npy')
H,W=solid.shape
boxes=json.load(open('work/boxes.json'))
names=['idle','smile','happy','curious','sleep']
lab,_=ndi.label(solid)
_,idx=ndi.distance_transform_edt(lab==0,return_indices=True)
owner=lab[idx[0],idx[1]]
def enc(a,q=90):
    b=io.BytesIO(); Image.fromarray(cv2.cvtColor(a,cv2.COLOR_BGRA2RGBA)).save(b,'WEBP',quality=q,method=6,alpha_quality=100)
    return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode(), len(b.getvalue())
out={'poses':{}}; total=0
SB=boxes[0]; sx0,sy0,sx1,sy1=max(SB[0]-24,0),SB[1]-24,min(SB[2]+70,800),min(SB[3]+24,H)
SW,SH=sx1-sx0,sy1-sy0; GX=(SB[0]+SB[2])/2-sx0; GY=SB[3]-sy0
out['stage']=[SW,SH]; out['origin']=[GX/SW*100,GY/SH*100]
for name,b in zip(names,boxes):
    k={'idle':1,'smile':2.15,'happy':2.0,'curious':2.0,'sleep':2.0}[name]
    if name=='idle': c=[sx0,sy0,sx1,sy1]
    else: c=[max(b[0]-24,0),max(b[1]-24,0),min(b[2]+24,W),min(b[3]+24,H)]
    crop=rgba[c[1]:c[3],c[0]:c[2]].copy()
    own=owner[c[1]:c[3],c[0]:c[2]]==lab[(b[1]+b[3])//2,(b[0]+b[2])//2] if False else None
    # owner label = label of this component
    l=np.bincount(lab[b[1]:b[3],b[0]:b[2]].ravel())[1:].argmax()+1
    own=cv2.GaussianBlur((owner[c[1]:c[3],c[0]:c[2]]==l).astype(np.float32),(0,0),3)
    a=crop[...,3].astype(np.float32)/255*own
    # fade to zero at crop borders
    h,w=a.shape; m=4
    xs_=np.arange(w)[None,:]+0*a; ys_=np.arange(h)[:,None]+0*a
    ramp=np.minimum(np.minimum(xs_,w-1-xs_),np.minimum(ys_,h-1-ys_))/m
    a*=np.clip(ramp,0,1)
    sol=cv2.GaussianBlur(solid[c[1]:c[3],c[0]:c[2]].astype(np.float32),(0,0),1.2)
    g=b[3]-c[1]
    yy=np.arange(h)[:,None].astype(np.float32)
    t=np.clip((yy-(g-14))/18,0,1); t=t*t*(3-2*t)
    wf=0*t
    ch=crop.copy(); ch[...,3]=np.clip(a*(1-wf)*255,0,255)
    fl=crop.copy(); fl[...,3]=np.clip(a*wf*255,0,255)
    pose={'box':[ (GX-((b[0]+b[2])/2-c[0])*k)/SW*100, (GY-(b[3]-c[1])*k)/SH*100, (c[2]-c[0])*k/SW*100, (c[3]-c[1])*k/SH*100 ]}
    if name=='idle':
        gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        B,G,R=[im[...,i].astype(int) for i in range(3)]
        base=ch.copy(); pup=[]
        gx0,gy0,gx1,gy1=270,270,770,560   # glasses region (image coords)
        reg=np.zeros((H,W),bool); reg[gy0:gy1,gx0:gx1]=True
        brown=(R>B+25)&(R>G+15)
        brown=ndi.binary_closing(brown,iterations=2)
        notb=(~brown)&reg
        nl,_=ndi.label(notb)
        interior=np.zeros((H,W),bool)
        for (px0,py0,px1,py1) in [(432,362,508,470),(605,327,661,408)]:
            cx,cy=(px0+px1)//2,(py0+py1)//2
            core=np.zeros((H,W),bool); core[py0:py1,px0:px1]=gray[py0:py1,px0:px1]<45
            comp0=nl==nl[py0-6,cx]
            lens0=ndi.binary_erosion(ndi.binary_fill_holes(comp0|core),iterations=3)
            lum=np.median(gray[lens0&(gray>150)]) if (lens0&(gray>150)).any() else 220
            wx0,wy0,wx1,wy1=px0-22,py0-22,px1+22,py1+22
            win=np.zeros((H,W),bool); win[wy0:wy1,wx0:wx1]=True
            for thr in range(175,60,-5):
                dk=lens0&win&(gray<thr)
                dl,_=ndi.label(dk); pm=dl==dl[cy,cx]
                if not(pm[wy0,:].any() or pm[wy1-1,:].any() or pm[:,wx0].any() or pm[:,wx1-1].any()): break
            print('thr',thr,'lens lum',lum)
            for thr2 in range(150,40,-5):
                dk=win&(gray<thr2); dl,_=ndi.label(dk); pu=dl==dl[cy,cx]
                if not(pu[wy0,:].any() or pu[wy1-1,:].any() or pu[:,wx0].any() or pu[:,wx1-1].any()): break
            print('thr2',thr2); pm=pm|pu
            pm=ndi.binary_fill_holes(pm); pm=ndi.binary_dilation(pm,iterations=3)
            ys,xs=np.where(pm); bx=[xs.min()-3,ys.min()-3,xs.max()+4,ys.max()+4]
            print('pupil bbox',bx,pm.sum())
            sa=cv2.GaussianBlur(pm.astype(np.float32),(0,0),1.0)
            ps=np.dstack([im,(sa*255).astype(np.uint8)])[bx[1]:bx[3],bx[0]:bx[2]]
            uri,n=enc(ps,92); total+=n
            pup.append({'src':uri,'box':[(bx[0]-sx0)/SW*100,(bx[1]-sy0)/SH*100,(bx[2]-bx[0])/SW*100,(bx[3]-bx[1])/SH*100]})
            # inpaint base under pupil
            lensfull=ndi.binary_fill_holes(comp0|pm)
            hole=ndi.binary_dilation(pm,iterations=7)&lensfull
            valid=(ndi.binary_erosion(lensfull,iterations=2)&~hole&(gray>150)&~brown).astype(np.float32)
            x0,y0,x1,y1=bx[0]-60,bx[1]-60,bx[2]+60,bx[3]+60
            sub=im[y0:y1,x0:x1].astype(np.float32); v=valid[y0:y1,x0:x1]
            fill=np.zeros_like(sub); wsum=np.zeros(v.shape,np.float32)
            for sg in (5,10,20,40,80,160):
                wv=cv2.GaussianBlur(v,(0,0),sg); cv_=cv2.GaussianBlur(sub*v[...,None],(0,0),sg)
                take=(wsum==0)&(wv>0.01)
                fill[take]=(cv_/np.maximum(wv,1e-4)[...,None])[take]; wsum[take]=1
            print('unfilled',int((wsum==0).sum()))
            fill=cv2.GaussianBlur(fill,(0,0),5)
            hm=cv2.GaussianBlur(hole[y0:y1,x0:x1].astype(np.float32),(0,0),1.5)[...,None]
            hm=hm*lensfull[y0:y1,x0:x1,None]
            ip=(fill*hm+sub*(1-hm)).astype(np.uint8)
            base[y0-sy0:y1-sy0,x0-sx0:x1-sx0,:3]=ip
            comp=comp0
            lens=ndi.binary_fill_holes(comp|pm)
            print('lens area',lens.sum(), 'touches region edge', lens[gy0,:].any() or lens[gy1-1,:].any() or lens[:,gx0].any() or lens[:,gx1-1].any())
            interior|=lens
        pts=np.array([(660,651.5),(681,675),(679,725),(660,770),(630,800),(595,808.5),(570,802.5),(559,785),(562.5,760),(580,725),(600,695),(625,665),(645,652.5)],np.float32)
        pm_=np.zeros((H,W),np.uint8); cv2.fillPoly(pm_,[np.round(pts*8).astype(np.int32)],1,shift=3)
        pm_=cv2.GaussianBlur(pm_.astype(np.float32),(0,0),4)>0.5
        pawm=ndi.binary_dilation(pm_,iterations=4)
        hole=ndi.binary_dilation(pm_,iterations=11)&solid
        ys,xs=np.where(pawm); pb=[xs.min()-4,ys.min()-4,xs.max()+5,ys.max()+5]
        pa=cv2.GaussianBlur(pawm.astype(np.float32),(0,0),1.5)*(base[...,3][0:0] if False else 1)
        full_a=np.zeros((H,W),np.float32); full_a[sy0:sy1,sx0:sx1]=base[...,3]/255.0
        paw=np.dstack([im,(pa*full_a*255).astype(np.uint8)])[pb[1]:pb[3],pb[0]:pb[2]]
        cv2.imwrite('work/paw.png',paw)
        uri,n=enc(paw,90); total+=n
        pose['paw']={'src':uri,'box':[(pb[0]-sx0)/SW*100,(pb[1]-sy0)/SH*100,(pb[2]-pb[0])/SW*100,(pb[3]-pb[1])/SH*100]}
        # rellenar el cuerpo bajo la patita
        x0,y0,x1,y1=max(pb[0]-90,sx0),max(pb[1]-90,sy0),min(pb[2]+90,sx1),min(pb[3]+90,sy1)
        valid=(ndi.binary_erosion(solid,iterations=4)&~hole).astype(np.float32)
        sub=im[y0:y1,x0:x1].astype(np.float32); v=valid[y0:y1,x0:x1]
        fill=np.zeros_like(sub); wsum=np.zeros(v.shape,np.float32)
        for sg in (6,12,24,48,96):
            wv=cv2.GaussianBlur(v,(0,0),sg); cv_=cv2.GaussianBlur(sub*v[...,None],(0,0),sg)
            take=(wsum==0)&(wv>0.02)
            fill[take]=(cv_/np.maximum(wv,1e-4)[...,None])[take]; wsum[take]=1
        fill=cv2.GaussianBlur(fill,(0,0),6)
        hm=cv2.GaussianBlur(hole[y0:y1,x0:x1].astype(np.float32),(0,0),3)[...,None]
        base[y0-sy0:y1-sy0,x0-sx0:x1-sx0,:3]=(fill*hm+base[y0-sy0:y1-sy0,x0-sx0:x1-sx0,:3]*(1-hm)).astype(np.uint8)
        # boca como capa (para poder voltearla a "enojado")
        Bc,Gc,Rc=[im[...,i].astype(int) for i in range(3)]
        mreg=np.zeros((H,W),bool); mreg[440:530,530:640]=True
        mm=mreg&(gray<140)&(Bc>Rc+10)
        ml,_=ndi.label(mm); mm=ml==ml[478,584] if ml[478,584] else mm
        mm=ndi.binary_dilation(mm,iterations=3)
        ys,xs=np.where(mm); mb=[xs.min()-4,ys.min()-4,xs.max()+5,ys.max()+5]
        msp=np.dstack([im,(cv2.GaussianBlur(mm.astype(np.float32),(0,0),1.0)*255).astype(np.uint8)])[mb[1]:mb[3],mb[0]:mb[2]]
        uri,n=enc(msp,92); total+=n
        pose['mouth']={'src':uri,'box':[(mb[0]-sx0)/SW*100,(mb[1]-sy0)/SH*100,(mb[2]-mb[0])/SW*100,(mb[3]-mb[1])/SH*100]}
        mh=ndi.binary_dilation(mm,iterations=5)
        x0,y0,x1,y1=mb[0]-40,mb[1]-40,mb[2]+40,mb[3]+40
        valid=(solid&~mh&~brown&(gray>150)).astype(np.float32)
        sub=im[y0:y1,x0:x1].astype(np.float32); v=valid[y0:y1,x0:x1]
        fill=np.zeros_like(sub); wsum=np.zeros(v.shape,np.float32)
        for sg in (4,8,16,32,64):
            wv=cv2.GaussianBlur(v,(0,0),sg); cv_=cv2.GaussianBlur(sub*v[...,None],(0,0),sg)
            take=(wsum==0)&(wv>0.02)
            fill[take]=(cv_/np.maximum(wv,1e-4)[...,None])[take]; wsum[take]=1
        fill=cv2.GaussianBlur(fill,(0,0),3)
        hm=cv2.GaussianBlur(mh[y0:y1,x0:x1].astype(np.float32),(0,0),2)[...,None]
        base[y0-sy0:y1-sy0,x0-sx0:x1-sx0,:3]=(fill*hm+base[y0-sy0:y1-sy0,x0-sx0:x1-sx0,:3]*(1-hm)).astype(np.uint8)
        # antenas como capas con pivote en la base
        ants=[]
        for (ax0,ax1,yc,sx_0,sx_1,pvx) in [(330,500,196,424,478,451),(530,640,203,554,596,575)]:
            la=np.zeros((H,W),np.float32)
            la[:yc,ax0:ax1]=1
            for j in range(10): la[yc+j,sx_0:sx_1]=1-(j+1)/11.0
            la*=full_a
            ys,xs=np.where(la>0); ab=[xs.min()-3,ys.min()-3,xs.max()+4,ys.max()+4]
            asp=np.dstack([base[...,:3][ab[1]-sy0:ab[3]-sy0,ab[0]-sx0:ab[2]-sx0],(la[ab[1]:ab[3],ab[0]:ab[2]]*255).astype(np.uint8)])
            uri,n=enc(asp,90); total+=n
            ants.append({'src':uri,'box':[(ab[0]-sx0)/SW*100,(ab[1]-sy0)/SH*100,(ab[2]-ab[0])/SW*100,(ab[3]-ab[1])/SH*100],
                         'pivot':[(pvx-ab[0])/(ab[2]-ab[0])*100,(yc-ab[1])/(ab[3]-ab[1])*100]})
            keep=np.ones((H,W),np.float32)
            keep[:yc-6,ax0:ax1]=0
            for j in range(6): keep[yc-6+j,ax0:ax1]=(j+1)/7.0
            base[...,3]=(base[...,3]*keep[sy0:sy1,sx0:sx1]).astype(np.uint8)
        pose['ants']=ants
        pose['paw']['pivot']=[(590-pb[0])/(pb[2]-pb[0])*100,(805-pb[1])/(pb[3]-pb[1])*100]
        out['view']=[int(sx0),int(sy0),int(SW),int(SH)]
        interior=ndi.binary_erosion(interior,iterations=1)
        cv2.imwrite('work/interior.png',(interior[gy0:gy1,gx0:gx1]*255).astype(np.uint8))
        oa=(1-cv2.GaussianBlur(interior.astype(np.float32),(0,0),0.8))
        ov=base[gy0-sy0:gy1-sy0,gx0-sx0:gx1-sx0].copy()
        ov[...,3]=(ov[...,3].astype(np.float32)*oa[gy0:gy1,gx0:gx1]).astype(np.uint8)
        # only keep overlay near lenses
        near=cv2.dilate(interior.astype(np.uint8),np.ones((41,41),np.uint8))[gy0:gy1,gx0:gx1]
        ov[...,3]=ov[...,3]*near
        uri,n=enc(ov,90); total+=n
        pose['over']={'src':uri,'box':[(gx0-sx0)/SW*100,(gy0-sy0)/SH*100,(gx1-gx0)/SW*100,(gy1-gy0)/SH*100]}
        pose['pupils']=pup
        ch=base
        cv2.imwrite('work/idle_base.png',base)
    uri,n=enc(ch,84); total+=n; pose['src']=uri
    uri,n2=enc(fl,60); total+=n2; pose['floor']=uri
    print(name,c,n,n2)
    out['poses'][name]=pose
print('total bytes',total)
json.dump(out,open('work/sprites.json','w'))
