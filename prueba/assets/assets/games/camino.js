// ======== Racha 7.3 · «Tu camino» v2 (niveles 1–3) — todo en código, reutilizable en Flutter ========
// Mundos: 1 Celeste = costa (mar, playa, palmeras, faro) · 2 Menta = bosque y río (pinos, cabaña, cascada, ciervo)
// · 3 Lila = valle de flores lilas (cipreses, sauces, molino, mesetas, globos). Césped con textura de matas que cambia de color.
let W=390, PX=34, TOP=150, BOT=140, DAYS=90, H=TOP+BOT+DAYS*PX, S=2, TODAY=18, RW=64;
const INK='#22324F';
let g, seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}, R=(a,b)=>a+(b-a)*rnd();
let yOf=d=>H-BOT-d*PX;let dOf=y=>(H-BOT-y)/PX;
let xOf=d=>W/2+Math.sin(d/DAYS*Math.PI*4.4+0.5)*96+Math.sin(d*0.19)*8;
let lvOf=d=>Math.max(0,Math.min(2,Math.floor(d/30)));
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const lin=(y0,y1,st)=>{const l=g.createLinearGradient(0,y0,0,y1);st.forEach(([o,c])=>l.addColorStop(o,c));return l;};
const rad=(x,y,r0,r1,st)=>{const l=g.createRadialGradient(x,y,r0,x,y,r1);st.forEach(([o,c])=>l.addColorStop(o,c));return l;};
function txt(t,x,y,sz,c,wt,al,fam){g.font=`${wt||700} ${sz}px ${fam||'F'}`;g.fillStyle=c;g.textAlign=al||'center';g.textBaseline='middle';g.fillText(t,x,y);}
function hx(c){const n=parseInt(c.slice(1),16);return [n>>16,(n>>8)&255,n&255];}
function mix(a,b,t){const A=hx(a),B=hx(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function sh(c,k){const A=hx(c);return 'rgb('+A.map(v=>Math.max(0,Math.min(255,Math.round(k>0?v+(255-v)*k:v*(1+k))))).join(',')+')';}
function shadow(x,y,rx,ry,a){g.fillStyle=`rgba(30,50,40,${a??.2})`;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();}
function flipAt(x,f){g.translate(x,0);g.scale(f,1);g.translate(-x,0);}
// ---------- ocupación ----------
let occ=[]; let free=(x,y,r,edge)=>(edge||(x>r*.4&&x<W-r*.4))&&occ.every(o=>Math.hypot(o[0]-x,(o[1]-y)*1.2)>o[2]+r); let take=(x,y,r)=>occ.push([x,y,r]);
// ---------- color del suelo por día (cambia poco a poco) ----------
let GR=[[0,'#8EDB6A'],[12,'#86D865'],[24,'#7FD6A3'],[36,'#79D9B4'],[52,'#86DFC0'],[62,'#B9A6EE'],[74,'#C3AEF4'],[90,'#B79DEE']];
function grassAt(d){for(let i=1;i<GR.length;i++)if(d<=GR[i][0]){const t=(d-GR[i-1][0])/(GR[i][0]-GR[i-1][0]);return mix(GR[i-1][1],GR[i][1],Math.max(0,Math.min(1,t)));}return GR[GR.length-1][1];}
// ---------- formas irregulares (agua, arena) ----------
function blob(cx,cy,rx,ry,k,seedB){const pts=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2,n=1+Math.sin(a*3+seedB)*.12*k+Math.sin(a*5+seedB*2)*.08*k+Math.sin(a*2+seedB*.7)*.1*k;pts.push([cx+Math.cos(a)*rx*n,cy+Math.sin(a)*ry*n]);}return pts;}
function path(pts){g.beginPath();pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;i?g.quadraticCurveTo(p[0],p[1],mx,my):g.moveTo(mx,my);});g.closePath();}
function water(cx,cy,rx,ry,sb,opt){const sand=blob(cx,cy+3,rx+12,ry+10,1,sb),wat=blob(cx,cy,rx,ry,1,sb+.3);
 g.fillStyle='rgba(40,80,60,.18)';g.save();g.translate(0,4);path(sand);g.fill();g.restore();
 g.fillStyle=opt&&opt.sand?'#F3E2B3':'#D9E8B8';path(sand);g.fill();
 g.fillStyle=lin(cy-ry,cy+ry,[[0,opt&&opt.deep?'#4FC3F7':'#8FDBFF'],[1,opt&&opt.deep?'#1E88E5':'#3BA3E8']]);path(wat);g.fill();
 g.save();path(wat);g.clip();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2.6;path(blob(cx,cy,rx*.93,ry*.9,1,sb+.3));g.stroke();
 g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=2;g.lineCap='round';for(let i=0;i<6;i++){const x=cx+R(-rx*.6,rx*.5),y=cy+R(-ry*.6,ry*.6);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+7,y-3,x+14,y);g.stroke();}g.restore();return wat;}
// ---------- vegetación (varios estilos + volteo horizontal) ----------
function treeRound(x,y,s,c,f){g.save();flipAt(x,f);shadow(x+6*s,y+2*s,20*s,6*s,.25);g.fillStyle=lin(y-22*s,y,[[0,'#A47448'],[1,'#7C5332']]);g.beginPath();g.moveTo(x-4*s,y);g.lineTo(x-2.5*s,y-24*s);g.lineTo(x+2.5*s,y-24*s);g.lineTo(x+4*s,y);g.fill();
 const t=y-40*s;[[0,0,22],[-13,6,14],[13,5,15],[0,-12,15]].forEach(([dx,dy,r],i)=>{g.fillStyle=rad(x+dx*s-r*.4*s,t+dy*s-r*.45*s,1,r*1.3*s,[[0,sh(c[0],.28)],[.6,c[0]],[1,c[1]]]);g.beginPath();g.arc(x+dx*s,t+dy*s,r*s,0,7);g.fill();});
 g.fillStyle='rgba(255,255,255,.32)';g.beginPath();g.ellipse(x-8*s,t-14*s,6*s,3.6*s,-.5,0,7);g.fill();g.restore();}
function pine(x,y,s,c,f){g.save();flipAt(x,f);shadow(x+5*s,y+2*s,14*s,5*s,.25);g.fillStyle='#7C5332';g.fillRect(x-2.6*s,y-10*s,5.2*s,11*s);
 for(let i=0;i<3;i++){const ty=y-10*s-i*13*s,w=(17-i*4)*s;g.fillStyle=lin(ty-18*s,ty,[[0,sh(c[0],.18)],[1,c[1]]]);g.beginPath();g.moveTo(x-w,ty);g.quadraticCurveTo(x-w*.3,ty-6*s,x,ty-20*s);g.quadraticCurveTo(x+w*.3,ty-6*s,x+w,ty);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(x-w*.7,ty-2*s);g.lineTo(x-1,ty-18*s);g.lineTo(x-w*.1,ty-3*s);g.fill();}g.restore();}
function palm(x,y,s,f){g.save();flipAt(x,f);shadow(x+12*s,y+2*s,16*s,5*s,.22);g.strokeStyle='#B98552';g.lineWidth=5*s;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4*s,y-22*s,x+12*s,y-42*s);g.stroke();g.strokeStyle='rgba(120,80,40,.4)';g.lineWidth=1.4*s;for(let i=1;i<7;i++){const t=i/7;g.beginPath();g.arc(x+12*s*t*t+2*s*t,y-42*s*t,2.6*s,0,Math.PI);g.stroke();}
 const tx=x+12*s,ty=y-42*s;[[-2.6,'#5FCB62'],[-1.9,'#4DB858'],[-1.1,'#62D06A'],[-0.35,'#4DB858'],[0.35,'#5FCB62'],[3.6,'#4DB858'],[2.8,'#62D06A']].forEach(([a,c])=>{g.fillStyle=c;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a-.25)*18*s,ty+Math.sin(a-.25)*18*s-4*s,tx+Math.cos(a)*30*s,ty+Math.sin(a)*30*s+6*s);g.quadraticCurveTo(tx+Math.cos(a+.25)*16*s,ty+Math.sin(a+.25)*16*s,tx,ty);g.fill();});
 g.fillStyle='#8A5A2E';[[-3,2],[3,3],[0,5]].forEach(([dx,dy])=>{g.beginPath();g.arc(tx+dx*s,ty+dy*s,3*s,0,7);g.fill();});g.restore();}
function cypress(x,y,s,c){shadow(x+4*s,y+2*s,9*s,4*s,.25);g.fillStyle=lin(y-56*s,y,[[0,sh(c[0],.2)],[1,c[1]]]);g.beginPath();g.moveTo(x,y-58*s);g.quadraticCurveTo(x+11*s,y-34*s,x+7*s,y-2*s);g.quadraticCurveTo(x,y+2*s,x-7*s,y-2*s);g.quadraticCurveTo(x-11*s,y-34*s,x,y-58*s);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-3*s,y-36*s,2.4*s,12*s,.1,0,7);g.fill();}
function willow(x,y,s,c,f){g.save();flipAt(x,f);shadow(x+5*s,y+2*s,22*s,6*s,.22);g.fillStyle='#7C5332';g.fillRect(x-3*s,y-26*s,6*s,27*s);const t=y-38*s;g.fillStyle=rad(x-8*s,t-8*s,2,30*s,[[0,sh(c[0],.25)],[1,c[1]]]);g.beginPath();g.ellipse(x,t,24*s,16*s,0,0,7);g.fill();
 g.strokeStyle=c[0];g.lineWidth=2.4*s;g.lineCap='round';for(let i=-5;i<=5;i++){g.beginPath();g.moveTo(x+i*4.4*s,t+6*s);g.quadraticCurveTo(x+i*4.8*s,t+18*s,x+i*4.2*s,t+28*s-Math.abs(i)*1.6*s);g.stroke();}g.restore();}
function bush(x,y,s,c,style,f){g.save();flipAt(x,f);shadow(x+3*s,y+2*s,15*s,5*s,.2);const P=[[[-9,0,9],[0,-5,11],[10,0,9]],[[-6,0,8],[6,-2,10]],[[-11,1,7],[-3,-4,9],[7,-3,9],[13,2,6]]][style%3];
 P.forEach(([dx,dy,r])=>{g.fillStyle=rad(x+dx*s-3*s,y+dy*s-9*s,1,r*1.3*s,[[0,sh(c[0],.28)],[1,c[1]]]);g.beginPath();g.arc(x+dx*s,y+dy*s-6*s,r*s,0,7);g.fill();});
 if(style===1){g.fillStyle='#FF8FB1';[[-4,-10],[5,-12],[9,-6]].forEach(([dx,dy])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,1.8*s,0,7);g.fill();});}g.restore();}
function rock(x,y,s,c){shadow(x+3,y+2,12*s,4*s,.22);g.fillStyle=lin(y-14*s,y,[[0,sh(c,.25)],[1,sh(c,-.15)]]);g.beginPath();g.moveTo(x-12*s,y);g.quadraticCurveTo(x-12*s,y-12*s,x-2*s,y-14*s);g.quadraticCurveTo(x+11*s,y-12*s,x+12*s,y);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(x-4*s,y-9*s,4*s,2*s,-.3,0,7);g.fill();}
// ---------- elementos únicos ----------
// Celeste (costa)
function lighthouse(x,y,s){shadow(x+8*s,y+2*s,16*s,5*s,.25);g.fillStyle='#E9E2D2';rr(x-14*s,y-6*s,28*s,8*s,3*s);g.fill();for(let i=0;i<4;i++){g.fillStyle=i%2?'#FFFFFF':'#E8505B';g.beginPath();const y0=y-6*s-i*12*s,w0=(10-i*1.1)*s,w1=(10-(i+1)*1.1)*s;g.moveTo(x-w0,y0);g.lineTo(x-w1,y0-12*s);g.lineTo(x+w1,y0-12*s);g.lineTo(x+w0,y0);g.fill();}
 g.fillStyle='#22324F';rr(x-7*s,y-62*s,14*s,10*s,2*s);g.fill();g.fillStyle='#FFE27A';rr(x-5*s,y-61*s,10*s,8*s,2*s);g.fill();g.fillStyle='#E8505B';g.beginPath();g.moveTo(x-8*s,y-62*s);g.lineTo(x,y-70*s);g.lineTo(x+8*s,y-62*s);g.fill();g.fillStyle='rgba(255,240,150,.25)';g.beginPath();g.moveTo(x,y-57*s);g.lineTo(x+60*s,y-75*s);g.lineTo(x+60*s,y-45*s);g.fill();}
function umbrella(x,y,s,c){shadow(x+3,y+2,13*s,4*s,.18);g.fillStyle='#F3E2B3';rr(x-12*s,y-3*s,22*s,6*s,2*s);g.fill();g.strokeStyle='#8A6A44';g.lineWidth=1.6*s;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-22*s);g.stroke();for(let i=0;i<6;i++){g.fillStyle=i%2?'#fff':c;g.beginPath();g.moveTo(x,y-26*s);g.arc(x,y-20*s,15*s,Math.PI+i*Math.PI/6,Math.PI+(i+1)*Math.PI/6);g.fill();}}
function boat(x,y,s){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x,y+4*s,20*s,3*s,0,0,7);g.fill();g.fillStyle='#B57E4C';g.beginPath();g.moveTo(x-16*s,y);g.lineTo(x+16*s,y);g.lineTo(x+11*s,y+6*s);g.lineTo(x-11*s,y+6*s);g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(x,y-1*s);g.lineTo(x,y-28*s);g.lineTo(x+14*s,y-3*s);g.fill();g.fillStyle='#FF8FB1';g.beginPath();g.moveTo(x-1,y-24*s);g.lineTo(x-12*s,y-3*s);g.lineTo(x-1,y-3*s);g.fill();}
function beachHut(x,y,s,c){shadow(x+4,y+2,14*s,4*s,.2);for(let i=0;i<4;i++){g.fillStyle=i%2?'#fff':c;g.fillRect(x-12*s+i*6*s,y-18*s,6*s,18*s);}g.fillStyle='#22324F';g.beginPath();g.moveTo(x-15*s,y-18*s);g.lineTo(x,y-28*s);g.lineTo(x+15*s,y-18*s);g.fill();g.fillStyle='#8A6A44';rr(x-3*s,y-10*s,6*s,10*s,1.5*s);g.fill();}
function sandcastle(x,y,s){shadow(x+3,y+2,13*s,4*s,.18);g.fillStyle=lin(y-20*s,y,[[0,'#F8E4A8'],[1,'#E2C27C']]);g.fillRect(x-12*s,y-10*s,24*s,10*s);g.fillRect(x-4*s,y-20*s,8*s,12*s);[-12,-6,0,6].forEach(dx=>g.fillRect(x+dx*s,y-13*s,4*s,3*s));g.fillStyle='#E8505B';g.beginPath();g.moveTo(x,y-20*s);g.lineTo(x,y-28*s);g.lineTo(x+6*s,y-25*s);g.fill();}
function starfish(x,y,s){g.fillStyle='#FF9A62';g.beginPath();for(let i=0;i<10;i++){const r=i%2?2.5*s:6*s,a=-Math.PI/2+i*Math.PI/5;g.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));}g.fill();}
function kite(x,y,s){g.strokeStyle='rgba(34,50,79,.4)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-14*s,y+20*s,x-6*s,y+42*s);g.stroke();g.fillStyle='#7FC4FF';g.beginPath();g.moveTo(x,y-10*s);g.lineTo(x+8*s,y);g.lineTo(x,y+12*s);g.lineTo(x-8*s,y);g.fill();g.fillStyle='#FFD34D';g.beginPath();g.moveTo(x,y-10*s);g.lineTo(x+8*s,y);g.lineTo(x,y);g.fill();}
// Menta (bosque y río)
function cabin(x,y,s){shadow(x+8*s,y+3*s,26*s,6*s,.25);g.fillStyle=lin(y-22*s,y,[[0,'#C48C58'],[1,'#9A6A40']]);g.fillRect(x-20*s,y-22*s,40*s,22*s);g.strokeStyle='rgba(90,55,30,.5)';g.lineWidth=1.4*s;for(let i=1;i<5;i++){g.beginPath();g.moveTo(x-20*s,y-22*s+i*4.4*s);g.lineTo(x+20*s,y-22*s+i*4.4*s);g.stroke();}
 g.fillStyle='#2FB792';g.beginPath();g.moveTo(x-26*s,y-20*s);g.lineTo(x,y-40*s);g.lineTo(x+26*s,y-20*s);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.moveTo(x-26*s,y-20*s);g.lineTo(x,y-40*s);g.lineTo(x-4*s,y-20*s);g.fill();g.fillStyle='#FFE9A8';rr(x-14*s,y-16*s,8*s,7*s,1.5*s);g.fill();g.fillStyle='#6B4426';rr(x+3*s,y-13*s,8*s,13*s,2*s);g.fill();g.fillStyle='#8A8A8A';g.fillRect(x+10*s,y-38*s,5*s,10*s);g.fillStyle='rgba(255,255,255,.7)';[[13,-44,4],[17,-50,5],[14,-57,6]].forEach(([dx,dy,r])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,7);g.fill();});}
function deer(x,y,s,f){g.save();flipAt(x,f);shadow(x,y+1,10*s,3*s,.2);g.fillStyle='#C98B5A';g.beginPath();g.ellipse(x,y-12*s,11*s,6*s,0,0,7);g.fill();g.fillRect(x-8*s,y-8*s,2.4*s,9*s);g.fillRect(x+6*s,y-8*s,2.4*s,9*s);g.fillRect(x+7*s,y-24*s,4*s,12*s);g.beginPath();g.ellipse(x+11*s,y-25*s,5*s,4*s,0,0,7);g.fill();g.fillStyle='#fff';[[-4,-13],[0,-14],[4,-12]].forEach(([dx,dy])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,1.3*s,0,7);g.fill();});g.strokeStyle='#8A5A34';g.lineWidth=1.4*s;g.beginPath();g.moveTo(x+9*s,y-28*s);g.lineTo(x+7*s,y-35*s);g.moveTo(x+8*s,y-32*s);g.lineTo(x+4*s,y-34*s);g.stroke();g.fillStyle=INK;g.beginPath();g.arc(x+13*s,y-26*s,1.1*s,0,7);g.fill();g.restore();}
function logPile(x,y,s){shadow(x+3,y+2,14*s,4*s,.2);[[-7,0],[7,0],[0,-7]].forEach(([dx,dy])=>{g.fillStyle='#9A6A40';g.beginPath();g.ellipse(x+dx*s,y+dy*s-4*s,7*s,5*s,0,0,7);g.fill();g.fillStyle='#E9C99B';g.beginPath();g.ellipse(x+dx*s+2*s,y+dy*s-4*s,4*s,4*s,0,0,7);g.fill();g.strokeStyle='#C49A6A';g.lineWidth=1;g.beginPath();g.arc(x+dx*s+2*s,y+dy*s-4*s,2*s,0,7);g.stroke();});}
function mushroom(x,y,s,c){shadow(x+2,y+1,8*s,2.5*s,.2);g.fillStyle='#FFF6E8';rr(x-4*s,y-10*s,8*s,11*s,3*s);g.fill();g.fillStyle=rad(x-3*s,y-14*s,1,12*s,[[0,sh(c,.3)],[1,c]]);g.beginPath();g.ellipse(x,y-11*s,11*s,7*s,0,Math.PI,0);g.fill();g.fillStyle='#fff';[[-5,-14],[2,-16],[6,-12]].forEach(([dx,dy])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,1.6*s,0,7);g.fill();});}
function waterwheel(x,y,s){g.save();g.translate(x,y);g.strokeStyle='#8A5A34';g.lineWidth=3*s;g.beginPath();g.arc(0,0,14*s,0,7);g.stroke();for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.fillStyle='#B57E4C';g.fillRect(-2*s,-18*s,4*s,8*s);g.restore();}g.fillStyle='#6B4426';g.beginPath();g.arc(0,0,3*s,0,7);g.fill();g.restore();}
function fox(x,y,s,f){g.save();flipAt(x,f);shadow(x,y+1,9*s,3*s,.2);g.fillStyle='#FF8A3D';g.beginPath();g.ellipse(x,y-7*s,9*s,5*s,0,0,7);g.fill();g.beginPath();g.ellipse(x-11*s,y-8*s,7*s,3.4*s,-.4,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.ellipse(x-16*s,y-10*s,2.4*s,2*s,0,0,7);g.fill();g.fillStyle='#FF8A3D';g.beginPath();g.arc(x+9*s,y-11*s,5*s,0,7);g.fill();g.beginPath();g.moveTo(x+6*s,y-14*s);g.lineTo(x+7*s,y-20*s);g.lineTo(x+10*s,y-15*s);g.moveTo(x+10*s,y-15*s);g.lineTo(x+13*s,y-19*s);g.lineTo(x+13*s,y-13*s);g.fill();g.fillStyle=INK;g.beginPath();g.arc(x+11*s,y-11*s,1*s,0,7);g.fill();g.restore();}
// Lila (valle de flores)
function windmill(x,y,s){shadow(x+8,y+2,18*s,5*s,.22);g.fillStyle=lin(y-50*s,y,[[0,'#FFF8EE'],[1,'#E6D6C8']]);g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x-8*s,y-42*s);g.lineTo(x+8*s,y-42*s);g.lineTo(x+12*s,y);g.closePath();g.fill();g.fillStyle='#7A5AF8';g.beginPath();g.moveTo(x-11*s,y-42*s);g.lineTo(x,y-56*s);g.lineTo(x+11*s,y-42*s);g.fill();g.fillStyle='#7E5634';rr(x-3*s,y-12*s,6*s,12*s,2*s);g.fill();
 g.save();g.translate(x,y-44*s);g.rotate(.3);for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.fillStyle='#fff';g.strokeStyle='#C9B6A0';g.lineWidth=1;rr(2*s,-3.5*s,26*s,7*s,2*s);g.fill();g.stroke();}g.restore();g.fillStyle='#5A3FD0';g.beginPath();g.arc(x,y-44*s,2.6*s,0,7);g.fill();}
function plateau(x,y,w,h,ch){shadow(x+8,y+ch+h*.3,w*.55,h*.35,.18);const c=['#F2DCC8','#D6AE97','#B48772'];g.save();g.beginPath();g.ellipse(x,y,w/2,h/2,0,0,Math.PI);g.lineTo(x-w/2,y);g.ellipse(x,y+ch,w/2,h/2,0,Math.PI,0,true);g.closePath();g.fillStyle=lin(y,y+ch+h/2,[[0,c[0]],[1,c[1]]]);g.fill();g.clip();for(let i=1;i<4;i++){g.strokeStyle=c[2];g.globalAlpha=.5;g.lineWidth=2.4;g.beginPath();g.ellipse(x,y+ch*i/4,w/2,h/2,0,0,Math.PI);g.stroke();}g.restore();
 g.fillStyle='#9D7FE6';g.beginPath();g.ellipse(x,y+3,w/2+1,h/2+3,0,0,7);g.fill();g.fillStyle=lin(y-h/2,y+h/2,[[0,'#D4C2FF'],[1,'#B9A0F2']]);g.beginPath();g.ellipse(x,y,w/2,h/2,0,0,7);g.fill();for(let i=0;i<14;i++){g.fillStyle=i%2?'#fff':'#8C67E8';g.beginPath();g.arc(x+R(-w*.4,w*.4),y+R(-h*.3,h*.3),1.6,0,7);g.fill();}}
function crystal(x,y,s){shadow(x+4,y+1,11*s,3*s,.22);[[-6,0,.8,'#C9B3FF'],[0,-4,1.2,'#9C7BFF'],[7,1,.7,'#E3D6FF']].forEach(([dx,dy,k,c])=>{const cx=x+dx*s,cy=y+dy*s,h=22*k*s,w=6*k*s;g.fillStyle=c;g.beginPath();g.moveTo(cx-w,cy);g.lineTo(cx-w,cy-h*.7);g.lineTo(cx,cy-h);g.lineTo(cx+w,cy-h*.7);g.lineTo(cx+w,cy);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.moveTo(cx-w,cy-h*.7);g.lineTo(cx,cy-h);g.lineTo(cx,cy);g.lineTo(cx-w,cy);g.fill();});}
function balloon(x,y,s,c){shadow(x+3,y,10*s,3*s,.2);g.fillStyle='#B07A44';rr(x-6*s,y-9*s,12*s,9*s,2*s);g.fill();g.strokeStyle='rgba(80,60,40,.6)';g.lineWidth=1;g.beginPath();g.moveTo(x-6*s,y-9*s);g.lineTo(x-9*s,y-22*s);g.moveTo(x+6*s,y-9*s);g.lineTo(x+9*s,y-22*s);g.stroke();g.fillStyle=rad(x-6*s,y-40*s,2,26*s,[[0,sh(c,.45)],[1,c]]);g.beginPath();g.ellipse(x,y-34*s,16*s,18*s,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2.4*s;g.beginPath();g.ellipse(x,y-34*s,6*s,18*s,0,0,7);g.stroke();}
function wisteria(x,y,s){shadow(x+6,y+2,22*s,5*s,.2);g.strokeStyle='#8A5A34';g.lineWidth=3*s;g.beginPath();g.moveTo(x-18*s,y);g.lineTo(x-18*s,y-28*s);g.moveTo(x+18*s,y);g.lineTo(x+18*s,y-28*s);g.moveTo(x-22*s,y-28*s);g.lineTo(x+22*s,y-28*s);g.stroke();for(let i=-4;i<=4;i++){for(let k=0;k<4;k++){g.fillStyle=k%2?'#B79CFF':'#9B7BFF';g.beginPath();g.ellipse(x+i*4.6*s,y-26*s+k*4*s,2.6*s,2.8*s,0,0,7);g.fill();}}}
function butterfly(x,y,c){g.fillStyle=c;g.beginPath();g.ellipse(x-4,y,5,3.6,-.6,0,7);g.ellipse(x+4,y,5,3.6,.6,0,7);g.fill();g.fillStyle=INK;g.fillRect(x-.7,y-3,1.4,6);}
// ---------- césped con textura de matas ----------
function grass(){for(let y=0;y<H;y+=6){g.fillStyle=grassAt(dOf(y));g.fillRect(0,y,W,6.5);}
 for(let i=0;i<9000;i++){const x=rnd()*W,y=rnd()*H,d=dOf(y),c=grassAt(d);g.strokeStyle=rnd()<.5?sh(c,-.12):sh(c,.18);g.lineWidth=1.3;g.lineCap='round';g.beginPath();g.moveTo(x-2,y);g.quadraticCurveTo(x-2.5,y-3,x-3.5,y-5);g.moveTo(x,y);g.lineTo(x,y-6);g.moveTo(x+2,y);g.quadraticCurveTo(x+2.5,y-3,x+3.5,y-5);g.stroke();}
 // flores del suelo por mundo (en el lila, el césped está lleno de florecitas lilas)
 for(let i=0;i<2600;i++){const x=rnd()*W,y=rnd()*H,d=dOf(y);if(d<58){if(rnd()<.18){g.fillStyle=['#FFFFFF','#FFE27A','#7FC4FF'][i%3];g.beginPath();g.arc(x,y,1.6,0,7);g.fill();}}else{g.fillStyle=['#8C67E8','#B79CFF','#FFFFFF','#FF9AD5'][i%4];g.beginPath();g.arc(x,y,1.9,0,7);g.fill();}}}
// ---------- calzada (más ancha, losas rectangulares de colores suaves, estilo juego de pueblo) ----------
function road(){const pts=[];for(let d=-3;d<=DAYS+3;d+=.2)pts.push([xOf(d),yOf(d),d]);const pth=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));};
 g.lineCap='round';g.lineJoin='round';g.save();g.translate(0,8);pth();g.strokeStyle='rgba(40,60,40,.25)';g.lineWidth=RW+12;g.stroke();g.restore();
 pth();g.strokeStyle='#A08A70';g.lineWidth=RW+8;g.stroke();g.save();g.translate(0,4);pth();g.strokeStyle='#B9A386';g.lineWidth=RW+4;g.stroke();g.restore();pth();g.strokeStyle='#D9CBB0';g.lineWidth=RW;g.stroke();
 let row=0;for(let d=-3;d<=DAYS+3;d+=.34){const x=xOf(d),y=yOf(d),a=Math.atan2(yOf(d+.05)-y,xOf(d+.05)-x),nx=-Math.sin(a),ny=Math.cos(a);row++;const cols=4,cw=RW/cols;
  for(let c=0;c<=cols;c++){const off=(c-cols/2)*cw+(row%2?cw/2:0);if(Math.abs(off)>RW/2-cw*.42)continue;const px=x+nx*off,py=y+ny*off,t=(row*7+c*13)%6;
   const base=['#F3E9D4','#EADFC7','#F6EEDD','#E7DCC6','#EFE3CB','#F1E6D1'][t];g.save();g.translate(px,py);g.rotate(a);g.fillStyle=base;rr(-5.2,-cw/2+1.1,10.4,cw-2.2,2.4);g.fill();g.fillStyle='rgba(255,255,255,.65)';g.fillRect(-4.2,-cw/2+1.5,8.4,1.2);g.fillStyle='rgba(120,100,80,.2)';g.fillRect(-4.2,cw/2-2.5,8.4,1.2);g.restore();}}
 g.save();g.globalAlpha=.2;g.beginPath();pts.filter(p=>p[2]>=0&&p[2]<=TODAY).forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokeStyle='#FFD34D';g.lineWidth=RW-10;g.stroke();g.restore();}
// ---------- premios, hitos, carteles, Tiny ----------
const PR={7:['ball','Bola de fútbol'],14:['shield','Escudo'],20:['acc','Gorro de lana'],28:['shield','Escudo'],35:['music','Lofi alegre'],42:['shield','Escudo'],45:['prem','1 día Premium'],50:['ball','Bola España'],55:['music','Meditación'],56:['shield','Escudo'],64:['bg','Fondo: Bosque'],70:['acc','Bufanda'],77:['amb','Sonido: Olas'],84:['shield','Escudo'],85:['music','Curiosidad']};
const RING={shield:'#2E9BE6',music:'#FF5F9E',prem:'#F2A516',acc:'#E8505B',ball:'#22324F',bg:'#7A5AF8',amb:'#18B5C9'};
function icon(kind,x,y,k){g.save();g.translate(x,y);g.scale(k,k);
 if(kind==='shield'){g.fillStyle=lin(-13,15,[[0,'#8ED8FF'],[1,'#2E9BE6']]);g.beginPath();g.moveTo(0,-13);g.lineTo(11,-8);g.lineTo(10,4);g.quadraticCurveTo(7,11,0,15);g.quadraticCurveTo(-7,11,-10,4);g.lineTo(-11,-8);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.moveTo(-1,-10);g.lineTo(-1,12);g.quadraticCurveTo(-6,9,-7.5,3);g.lineTo(-8,-6);g.closePath();g.fill();}
 if(kind==='music'){g.fillStyle='#FF5F9E';g.fillRect(-1,-12,4,17);g.beginPath();g.moveTo(3,-12);g.quadraticCurveTo(12,-9,10,-2);g.quadraticCurveTo(9,-6,3,-7);g.fill();g.beginPath();g.ellipse(-4,6,6.5,5,-.4,0,7);g.fill();}
 if(kind==='prem'){g.fillStyle=lin(-11,10,[[0,'#FFE27A'],[1,'#F2A516']]);g.beginPath();g.moveTo(-12,6);g.lineTo(-13,-8);g.lineTo(-5,-1);g.lineTo(0,-11);g.lineTo(5,-1);g.lineTo(13,-8);g.lineTo(12,6);g.closePath();g.fill();rr(-12,7,24,4,1.5);g.fill();}
 if(kind==='acc'){g.fillStyle=lin(-10,4,[[0,'#FF7A85'],[1,'#D93C4A']]);g.beginPath();g.moveTo(-11,4);g.quadraticCurveTo(-12,-10,0,-10);g.quadraticCurveTo(12,-10,11,4);g.closePath();g.fill();g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.4;[-5,0,5].forEach(dx=>{g.beginPath();g.moveTo(dx,-8);g.lineTo(dx*1.2,3);g.stroke();});g.fillStyle='#fff';rr(-13,2,26,7,3.5);g.fill();g.fillStyle='#F2D6D9';[-8,-3,2,7].forEach(dx=>g.fillRect(dx,3,1.4,5));g.fillStyle='#fff';g.beginPath();g.arc(0,-12,4.2,0,7);g.fill();}
 if(kind==='ball'){g.fillStyle='#fff';g.beginPath();g.arc(0,0,12,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=1.6;g.stroke();g.fillStyle=INK;g.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*1.2566;g.lineTo(4.6*Math.cos(a),4.6*Math.sin(a));}g.fill();for(let i=0;i<5;i++){const a=-Math.PI/2+i*1.2566;g.beginPath();g.moveTo(4.6*Math.cos(a),4.6*Math.sin(a));g.lineTo(11*Math.cos(a),11*Math.sin(a));g.stroke();}}
 if(kind==='bg'){g.fillStyle='#8C67E8';rr(-12,-9,24,18,4);g.fill();g.fillStyle='#BDEBFF';rr(-10,-7,20,10,2);g.fill();g.fillStyle='#5DBB4A';g.beginPath();g.moveTo(-10,7);g.lineTo(-3,-2);g.lineTo(2,3);g.lineTo(6,-1);g.lineTo(10,7);g.fill();}
 if(kind==='amb'){g.strokeStyle='#18B5C9';g.lineWidth=3;g.lineCap='round';for(let i=0;i<3;i++){g.beginPath();g.moveTo(-11,-6+i*6);g.quadraticCurveTo(-5,-10+i*6,0,-6+i*6);g.quadraticCurveTo(5,-2+i*6,11,-6+i*6);g.stroke();}}
 g.restore();}
const POS={};
function station(d,kind,pos){const x=xOf(pos),y=yOf(pos),done=d<TODAY,r=21;POS[d]=[x,y];
 g.fillStyle='rgba(60,50,40,.28)';g.beginPath();g.ellipse(x,y+10,r+7,9,0,0,7);g.fill();g.fillStyle=lin(y-r,y+r+6,[[0,'#FFFFFF'],[1,'#E2E8F2']]);g.beginPath();g.arc(x,y-4,r,0,7);g.fill();g.fillStyle=sh(RING[kind],-.15);g.beginPath();g.arc(x,y+1,r-1,0,Math.PI);g.fill();
 g.fillStyle=lin(y-r-4,y+r,[[0,'#FFFFFF'],[1,'#F1F5FB']]);g.beginPath();g.arc(x,y-5,r-2,0,7);g.fill();g.lineWidth=3.4;g.strokeStyle=RING[kind];g.beginPath();g.arc(x,y-5,r-3.6,0,7);g.stroke();icon(kind,x,y-5,.9);g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(x-7,y-16,5,2.4,-.5,0,7);g.fill();
 if(done){g.fillStyle='#3CCB5A';g.beginPath();g.arc(x+14,y-19,7.5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x+10.5,y-19);g.lineTo(x+13,y-16.5);g.lineTo(x+17.5,y-21.5);g.stroke();}
 const t='Día '+d;g.font='900 9.5px N';const w=g.measureText(t).width+10;rr(x-w/2,y+14,w,14,7);g.fillStyle=done?'#3CCB5A':INK;g.fill();txt(t,x,y+21.5,9.5,'#fff',900,'center','N');}
function milestone(d){const sd=Math.cos(d/DAYS*Math.PI*4.4+0.5)>0?1:-1,x=xOf(d)+sd*50,y=yOf(d);shadow(x+3,y+2,8,3,.22);g.fillStyle=lin(y-18,y,[[0,'#F4F1EA'],[1,'#C9C2B4']]);rr(x-7,y-17,14,18,6);g.fill();txt('S'+d/7,x,y-8,8.5,'#6E6656',900,'center','N');}
const LV=[{n:'Celeste',c:'#3EA6E8'},{n:'Menta',c:'#17A882'},{n:'Lila',c:'#8A63F5'}];
function levelSign(d,lv){const sd=Math.cos(d/DAYS*Math.PI*4.4+0.5)>0?-1:1;let x=xOf(d)+sd*122,y=yOf(d)-10;x=Math.max(70,Math.min(W-70,x));
 shadow(x+4,y+26,40,6,.25);g.fillStyle='#8A5A34';rr(x-3,y-4,6,32,2);g.fill();g.save();g.translate(x,y-14);g.rotate(sd*-.04);g.fillStyle='rgba(0,0,0,.18)';rr(-60,-20,120,44,14);g.fill();g.fillStyle=lin(-22,22,[[0,sh(LV[lv].c,.15)],[1,sh(LV[lv].c,-.12)]]);rr(-60,-24,120,44,14);g.fill();g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;rr(-56,-20,112,36,11);g.stroke();txt('NIVEL '+(lv+1),0,-10,10.5,'rgba(255,255,255,.9)',900,'center','N');txt(LV[lv].n,0,5,19,'#fff',700);g.restore();}
function tiny(x,y,w){const s=w/120;g.save();g.translate(x-w/2,y-w*.66);g.scale(s,s);g.fillStyle='rgba(30,50,40,.22)';g.beginPath();g.ellipse(60,100,46,8,0,0,7);g.fill();const body=(dy,c)=>{g.fillStyle=c;[[34,58+dy,24],[60,40+dy,30],[88,56+dy,23]].forEach(([a,b,r])=>{g.beginPath();g.arc(a,b,r,0,7);g.fill();});rr(12,52+dy,96,36,18);g.fill();};body(5,'#D9E6F2');body(0,'#fff');g.fillStyle=INK;g.beginPath();g.ellipse(48,62,5,6.6,0,0,7);g.ellipse(72,62,5,6.6,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(50,59.5,1.8,0,7);g.arc(74,59.5,1.8,0,7);g.fill();g.fillStyle='rgba(255,143,192,.75)';g.beginPath();g.ellipse(37,73,6,4,0,0,7);g.ellipse(83,73,6,4,0,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(51,73);g.quadraticCurveTo(60,83,69,73);g.stroke();g.restore();}
function cloudPuff(x,y,s,a){g.save();g.globalAlpha=a??1;g.fillStyle=lin(y-16*s,y+12*s,[[0,'#FFFFFF'],[1,'#E3F1FF']]);[[-16,4,11],[-4,-4,15],[12,0,12],[22,6,8]].forEach(([dx,dy,r])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,7);g.fill();});rr(x-26*s,y+2*s,54*s,12*s,6*s);g.fill();g.restore();}
function bird(x,y,s){g.strokeStyle='rgba(34,50,79,.6)';g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.moveTo(x-7*s,y);g.quadraticCurveTo(x-3*s,y-5*s,x,y);g.quadraticCurveTo(x+3*s,y-5*s,x+7*s,y);g.stroke();}
function plane(x,y){g.fillStyle='rgba(255,255,255,.95)';rr(x-16,y-3,32,6,3);g.fill();g.beginPath();g.moveTo(x-2,y);g.lineTo(x-10,y-12);g.lineTo(x-5,y-12);g.lineTo(x+6,y);g.fill();g.fillStyle='#FF8FB1';g.fillRect(x+12,y-6,4,6);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.beginPath();g.moveTo(x-18,y);g.lineTo(x-80,y+2);g.stroke();}
// ================= v3 · más 3D (luz arriba-izquierda, sombras suaves abajo-derecha) =================
function shadow(x,y,rx,ry,a){a=a??.22;g.save();g.translate(x+rx*.12,y+ry*.25);g.scale(1,ry/rx);g.fillStyle=rad(0,0,rx*.15,rx*1.15,[[0,`rgba(18,48,36,${a*1.6})`],[.55,`rgba(18,48,36,${a})`],[1,'rgba(18,48,36,0)']]);g.beginPath();g.arc(0,0,rx*1.15,0,7);g.fill();g.restore();}
function ball3d(x,y,r,c,spec){g.fillStyle=rad(x-r*.38,y-r*.42,r*.08,r*1.3,[[0,sh(c,.5)],[.42,c],[.82,sh(c,-.2)],[1,sh(c,-.32)]]);g.beginPath();g.arc(x,y,r,0,7);g.fill();if(spec!==0){g.fillStyle='rgba(255,255,255,.38)';g.beginPath();g.ellipse(x-r*.38,y-r*.45,r*.32,r*.18,-.6,0,7);g.fill();}}
const cyl=(x0,x1,c)=>{const l=g.createLinearGradient(x0,0,x1,0);l.addColorStop(0,sh(c,.3));l.addColorStop(.35,c);l.addColorStop(1,sh(c,-.35));return l;};
let FC=0; const flip=()=>(FC++%2?1:-1);
function treeRound(x,y,s,c,f){shadow(x+8*s,y+1,24*s,7*s,.3);g.fillStyle=cyl(x-4*s,x+4*s,'#9A6A40');g.beginPath();g.moveTo(x-4.5*s,y);g.lineTo(x-2.6*s,y-26*s);g.lineTo(x+2.6*s,y-26*s);g.lineTo(x+4.5*s,y);g.fill();
 const t=y-42*s;[[0,-13,15],[-14*f,4,14],[13*f,3,15],[0,2,21],[-5*f,-6,13]].forEach(([dx,dy,r],i)=>ball3d(x+dx*s,t+dy*s,r*s,i<3?sh(c[0],-.14):c[0],i>2?1:0));
 g.fillStyle='rgba(0,40,20,.18)';g.beginPath();g.ellipse(x,t+18*s,15*s,4*s,0,0,7);g.fill();}
function bush(x,y,s,c,n,f){const P=[[[0,0,11]],[[-6,1,8],[6,-1,10]],[[-9,1,8],[0,-4,10],[10,1,8]],[[-11,2,7],[-3,-3,9],[7,-2,9],[13,3,6]]][n%4];
 shadow(x+4*s,y+1,(8+n*4)*s,5*s,.26);P.slice().sort((a,b)=>a[1]-b[1]).forEach(([dx,dy,r])=>ball3d(x+dx*f*s,y+dy*s-6*s,r*s,c[0]));
 if(n%4===2){g.fillStyle='#FF8FB1';[[-4,-12],[5,-14],[9,-7]].forEach(([dx,dy])=>ball3d(x+dx*f*s,y+dy*s,1.9*s,'#FF7FA8',0));}}
function pine(x,y,s,c){shadow(x+7*s,y+1,17*s,5*s,.3);g.fillStyle=cyl(x-3*s,x+3*s,'#8A5A34');g.fillRect(x-3*s,y-10*s,6*s,11*s);
 for(let i=0;i<3;i++){const ty=y-8*s-i*12.5*s,w=(19-i*4.6)*s,h=21*s;g.fillStyle='rgba(0,40,30,.28)';g.beginPath();g.ellipse(x+2*s,ty+1.5*s,w*.8,3.2*s,0,0,7);g.fill();
  g.fillStyle=lin(ty-h,ty,[[0,sh(c[1],.05)],[1,sh(c[1],-.18)]]);g.beginPath();g.moveTo(x,ty-h);g.quadraticCurveTo(x+w*.3,ty-h*.4,x+w,ty);g.quadraticCurveTo(x+w*.5,ty+3.4*s,x,ty+3*s);g.closePath();g.fill();
  g.fillStyle=lin(ty-h,ty,[[0,sh(c[0],.35)],[1,sh(c[0],.02)]]);g.beginPath();g.moveTo(x,ty-h);g.quadraticCurveTo(x-w*.3,ty-h*.4,x-w,ty);g.quadraticCurveTo(x-w*.5,ty+3.4*s,x,ty+3*s);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.6*s;g.lineCap='round';g.beginPath();g.moveTo(x-1*s,ty-h+4*s);g.quadraticCurveTo(x-w*.3,ty-h*.35,x-w*.75,ty-1*s);g.stroke();}}
function palm(x,y,s,f){const tx=x+14*s*f,ty=y-46*s,bz=t=>[(1-t)*(1-t)*x+2*(1-t)*t*(x+3*s*f)+t*t*tx,(1-t)*(1-t)*y+2*(1-t)*t*(y-26*s)+t*t*ty];
 shadow(x+14*s*f+6*s,y+1,22*s,6*s,.26);shadow(x+2*s,y,7*s,3*s,.3);
 for(let i=0;i<=10;i++){const t=i/10,[px,py]=bz(t),w=(4.6-1.8*t)*s;g.fillStyle=cyl(px-w,px+w,i%2?'#C99258':'#B9824A');g.beginPath();g.ellipse(px,py,w,w*.75,0,0,7);g.fill();g.fillStyle='rgba(255,235,200,.35)';g.beginPath();g.ellipse(px-w*.3,py-w*.4,w*.5,w*.2,0,0,7);g.fill();}
 const fr=[[-2.75,30,0],[-2.2,32,0],[-0.95,32,0],[-0.4,30,0],[-1.57,24,0],[2.6,26,1],[0.5,28,1],[-3.0,22,1]];
 fr.forEach(([a0,L,front])=>{const a=f>0?a0:Math.PI-a0,ex=tx+Math.cos(a)*L*s,ey=ty+Math.sin(a)*L*s+(10-Math.abs(Math.sin(a))*7)*s,mx=tx+Math.cos(a)*L*.5*s,my=ty+Math.sin(a)*L*.5*s-5*s,nx=-Math.sin(a)*6*s,ny=Math.cos(a)*6*s;
  const c1=front?'#7BE05A':'#5FC94A',c2=front?'#45B83E':'#2F9A3A';g.fillStyle=c1;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(mx-nx,my-ny,ex,ey);g.quadraticCurveTo(mx,my,tx,ty);g.fill();g.fillStyle=c2;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(mx+nx,my+ny,ex,ey);g.quadraticCurveTo(mx,my,tx,ty);g.fill();
  g.strokeStyle='rgba(30,90,30,.5)';g.lineWidth=1*s;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(mx,my,ex,ey);g.stroke();});
 [[-3,3],[3,4],[0,6]].forEach(([dx,dy])=>ball3d(tx+dx*s,ty+dy*s,3.2*s,'#8A5A2E'));}
function cypress(x,y,s,c){shadow(x+5*s,y+1,10*s,4*s,.3);const l=g.createLinearGradient(x-9*s,0,x+9*s,0);l.addColorStop(0,sh(c[0],.35));l.addColorStop(.4,c[0]);l.addColorStop(1,sh(c[1],-.15));g.fillStyle=l;g.beginPath();g.moveTo(x,y-60*s);g.quadraticCurveTo(x+12*s,y-34*s,x+7.5*s,y-2*s);g.quadraticCurveTo(x,y+2*s,x-7.5*s,y-2*s);g.quadraticCurveTo(x-12*s,y-34*s,x,y-60*s);g.fill();
 for(let i=0;i<5;i++){g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(x-3*s,y-48*s+i*9*s,3*s,4*s,.3,0,7);g.fill();g.fillStyle='rgba(30,10,60,.12)';g.beginPath();g.ellipse(x+4*s,y-44*s+i*9*s,3*s,4*s,-.3,0,7);g.fill();}}
function willow(x,y,s,c){shadow(x+8*s,y+1,26*s,7*s,.26);g.fillStyle=cyl(x-3*s,x+3*s,'#7C5332');g.fillRect(x-3*s,y-26*s,6*s,27*s);const t=y-40*s;
 g.lineCap='round';for(let i=-6;i<=6;i++){g.strokeStyle=i<0?sh(c[0],.15):c[1];g.lineWidth=2.6*s;g.beginPath();g.moveTo(x+i*4*s,t+4*s);g.quadraticCurveTo(x+i*4.6*s,t+18*s,x+i*4.1*s,t+30*s-Math.abs(i)*1.7*s);g.stroke();}
 blob3d([[-12,2,13],[12,2,13],[0,-4,17]].map(([dx,dy,r])=>[x+dx*s,t+dy*s,r*s]),c[0]);}
function rock(x,y,s,c){shadow(x+4,y+1,13*s,4*s,.28);g.fillStyle=sh(c,-.25);g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x-9*s,y-10*s);g.lineTo(x-1*s,y-15*s);g.lineTo(x+9*s,y-11*s);g.lineTo(x+12*s,y);g.closePath();g.fill();
 g.fillStyle=sh(c,.3);g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x-9*s,y-10*s);g.lineTo(x-1*s,y-15*s);g.lineTo(x+1*s,y-5*s);g.lineTo(x-3*s,y);g.closePath();g.fill();g.fillStyle=c;g.beginPath();g.moveTo(x-1*s,y-15*s);g.lineTo(x+9*s,y-11*s);g.lineTo(x+5*s,y-4*s);g.lineTo(x+1*s,y-5*s);g.closePath();g.fill();}
// ---- agua sin orilla (estanques): borde de tierra hundido + reflejo, sin arena ----
function pond(cx,cy,rx,ry,sb,c1,c2,lilies){const wat=blob(cx,cy,rx,ry,1,sb),gc=grassAt(dOf(cy));g.fillStyle=sh(gc,.18);path(blob(cx,cy-2,rx+4,ry+4,1,sb));g.fill();g.fillStyle=sh(gc,-.35);path(blob(cx,cy+2,rx+2,ry+3,1,sb));g.fill();
 g.fillStyle=lin(cy-ry,cy+ry,[[0,c2],[.35,c1],[1,sh(c1,.25)]]);path(wat);g.fill();g.save();path(wat);g.clip();g.fillStyle='rgba(10,40,90,.22)';path(blob(cx,cy-ry*.9,rx*1.1,ry*.5,1,sb));g.fill();
 g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.lineCap='round';for(let i=0;i<5;i++){const x=cx+R(-rx*.5,rx*.4),y=cy+R(-ry*.2,ry*.6);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+6,y-3,x+12,y);g.stroke();}g.restore();
 for(let i=0;i<(lilies||0);i++){const px=cx+R(-rx*.6,rx*.6),py=cy+R(-ry*.4,ry*.5);g.fillStyle='rgba(0,40,60,.25)';g.beginPath();g.ellipse(px+1.5,py+1.5,6,3.6,0,0,7);g.fill();g.fillStyle=lin(py-4,py+4,[[0,'#9BE27A'],[1,'#4DAF4E']]);g.beginPath();g.ellipse(px,py,6,3.6,0,.5,Math.PI*2-.1);g.lineTo(px,py);g.fill();if(i%2)ball3d(px+1,py-2,2.2,'#FF9AD5',0);}
 return wat;}
// ---- costa con playa grande (solo Celeste) ----
function coastDepth(y,side,d0,d1){const d=dOf(y),t=(d-d0)/(d1-d0);if(t<=0||t>=1)return 0;const env=Math.pow(Math.sin(Math.PI*t),.55);let dp=(84+Math.sin(y/37)*16+Math.sin(y/13)*5)*env;const rx=xOf(d),lim=side<0?rx-RW/2-62:W-(rx+RW/2)-62;return Math.max(0,Math.min(dp,lim));}
const SAND=[];
function coast(side,d0,d1,list){const ys=[];for(let y=yOf(d1)-10;y<=yOf(d0)+10;y+=4)ys.push(y);const ex=v=>side<0?v:W-v,E=side<0?-6:W+6;
 const poly=add=>{g.beginPath();g.moveTo(E,ys[0]);ys.forEach(y=>{const dp=coastDepth(y,side,d0,d1);g.lineTo(ex(dp>0?dp+add(y,dp):0),y);});g.lineTo(E,ys[ys.length-1]);g.closePath();};
 const sw=(y,dp)=>Math.min(46,dp*.6)+Math.sin(y/23)*6;
 ys.forEach((y,i)=>{const dp=coastDepth(y,side,d0,d1);if(dp>8&&i%3==0){take(ex(dp*.45),y,dp*.45);if(dp>30)SAND.push([ex(dp+sw(y,dp)*.5),y,dp,ex(dp*.5)]);}});
 list.push([-1e9,()=>{g.save();g.translate(side<0?4:-4,5);poly(sw);g.fillStyle='rgba(30,70,40,.22)';g.fill();g.restore();
  poly(sw);g.fillStyle=lin(yOf(d1),yOf(d0),[[0,'#FBEABB'],[1,'#F4DDA2']]);g.fill();
  for(let i=0;i<120;i++){const y=R(yOf(d1),yOf(d0)),dp=coastDepth(y,side,d0,d1);if(dp<20)continue;g.fillStyle='rgba(200,160,90,.35)';g.beginPath();g.arc(ex(dp+R(4,sw(y,dp))),y,1,0,7);g.fill();}
  poly(()=>7);g.fillStyle='#E7C98C';g.fill();
  const sl=g.createLinearGradient(side<0?0:W,0,side<0?90:W-90,0);sl.addColorStop(0,'#1679D8');sl.addColorStop(.6,'#2FA6F0');sl.addColorStop(1,'#7FDBFF');poly(()=>0);g.fillStyle=sl;g.fill();
  g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=3.2;g.lineJoin='round';g.beginPath();let st=0;ys.forEach(y=>{const dp=coastDepth(y,side,d0,d1);if(dp>2){st?g.lineTo(ex(dp+1),y):g.moveTo(ex(dp+1),y);st=1;}});g.stroke();
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.6;g.beginPath();st=0;ys.forEach(y=>{const dp=coastDepth(y,side,d0,d1);if(dp>12){st?g.lineTo(ex(dp-7+Math.sin(y/9)*1.5),y):g.moveTo(ex(dp-7),y);st=1;}});g.stroke();
  g.lineCap='round';for(let i=0;i<14;i++){const y=R(yOf(d1),yOf(d0)),dp=coastDepth(y,side,d0,d1);if(dp<40)continue;const x=ex(R(8,dp-22));g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();g.moveTo(x-7,y);g.quadraticCurveTo(x,y-4,x+7,y);g.stroke();}}]);}
function buoy(x,y){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x,y+3,9,3,0,0,7);g.fill();ball3d(x,y-3,6,'#FF5A64');g.fillStyle='#fff';g.fillRect(x-6,y-4,12,2.4);}
function crab(x,y,f){shadow(x+2,y+1,8,2.5,.25);ball3d(x,y-4,6,'#FF6A4D');[-1,1].forEach(k=>{ball3d(x+k*8,y-8,3,'#FF6A4D',0);g.strokeStyle='#D84A33';g.lineWidth=1.4;for(let j=0;j<3;j++){g.beginPath();g.moveTo(x+k*4,y-3+j*1.5);g.lineTo(x+k*9,y-1+j*2);g.stroke();}});g.fillStyle=INK;g.beginPath();g.arc(x-2,y-8,1.2,0,7);g.arc(x+2,y-8,1.2,0,7);g.fill();}
function surfboards(x,y){shadow(x+5,y+1,14,4,.24);[['#FF8FB1',-8,-.15],['#5FB8FF',0,0],['#FFC83D',8,.15]].forEach(([c,dx,a])=>{g.save();g.translate(x+dx,y-14);g.rotate(a);g.fillStyle=cyl(-4,4,c);g.beginPath();g.ellipse(0,0,4.4,15,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.fillRect(-.6,-13,1.2,26);g.restore();});}
function tent(x,y){shadow(x+6,y+1,22,6,.28);g.fillStyle='#E8505B';g.beginPath();g.moveTo(x,y-28);g.lineTo(x+20,y);g.lineTo(x,y);g.fill();g.fillStyle='#FF7F86';g.beginPath();g.moveTo(x,y-28);g.lineTo(x-20,y);g.lineTo(x,y);g.fill();g.fillStyle='#7A2730';g.beginPath();g.moveTo(x,y-18);g.lineTo(x+6,y);g.lineTo(x-6,y);g.fill();}
function campfire(x,y){shadow(x,y+1,11,3,.25);g.fillStyle=rad(x,y-6,1,26,[[0,'rgba(255,200,80,.35)'],[1,'rgba(255,200,80,0)']]);g.beginPath();g.arc(x,y-6,26,0,7);g.fill();[[-6,'#8A5A34',.5],[6,'#7A4E2C',-.5]].forEach(([dx,c,a])=>{g.save();g.translate(x,y-2);g.rotate(a);g.fillStyle=c;rr(-9,-2,18,4,2);g.fill();g.restore();});
 g.fillStyle='#FF8A3D';g.beginPath();g.moveTo(x-6,y-3);g.quadraticCurveTo(x-6,y-14,x,y-20);g.quadraticCurveTo(x+6,y-14,x+6,y-3);g.fill();g.fillStyle='#FFD34D';g.beginPath();g.moveTo(x-3,y-3);g.quadraticCurveTo(x-3,y-10,x,y-13);g.quadraticCurveTo(x+3,y-10,x+3,y-3);g.fill();}
function duck(x,y,f){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x,y+2,8,2.4,0,0,7);g.fill();ball3d(x,y-2,6,'#FFFFFF',0);ball3d(x+5*f,y-8,3.6,'#3FAF6A',0);g.fillStyle='#FFB23D';g.beginPath();g.ellipse(x+9*f,y-7.5,2.4,1.2,0,0,7);g.fill();}
function lavender(x,y,w){for(let r=0;r<4;r++){const yy=y+r*9;shadow(x+4,yy+2,w/2,3,.18);for(let k=0;k<w/7;k++){const xx=x-w/2+k*7+(r%2)*3;ball3d(xx,yy-4,3.6,'#9C7BF2',0);}}}
// ---- iconos: música = play; escudo más bonito ----
const _icon=icon;icon=function(kind,x,y,k){if(kind==='music'){g.save();g.translate(x,y);g.scale(k,k);ball3d(0,0,13,'#FF5F9E');g.fillStyle='#fff';g.beginPath();g.moveTo(-4,-7);g.lineTo(8,0);g.lineTo(-4,7);g.closePath();g.lineJoin='round';g.lineWidth=3;g.strokeStyle='#fff';g.stroke();g.fill();g.restore();return;}
 if(kind==='shield'){g.save();g.translate(x,y);g.scale(k,k);const P=(sc)=>{g.beginPath();g.moveTo(0,-14*sc);g.lineTo(12*sc,-9*sc);g.lineTo(11*sc,4*sc);g.quadraticCurveTo(8*sc,12*sc,0,16*sc);g.quadraticCurveTo(-8*sc,12*sc,-11*sc,4*sc);g.lineTo(-12*sc,-9*sc);g.closePath();};
  g.fillStyle='#1A5FB4';P(1.08);g.fill();g.fillStyle=lin(-14,16,[[0,'#7FD3FF'],[.5,'#2E9BE6'],[1,'#1C6FD0']]);P(1);g.fill();g.fillStyle=lin(-10,12,[[0,'#A8E4FF'],[1,'#3FA9F0']]);P(.72);g.fill();
  g.fillStyle='#fff';g.beginPath();for(let i=0;i<10;i++){const r=i%2?2.4:5.6,a=-Math.PI/2+i*Math.PI/5;g.lineTo(r*Math.cos(a),1+r*Math.sin(a));}g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(-5,-7,3,5,.5,0,7);g.fill();g.restore();return;}
 _icon(kind,x,y,k);};
// ---- capa de cielo: nubes 3D con sombra en el suelo, varias aves ----
function cloud3d(x,y,s){g.save();g.globalAlpha=.18;g.fillStyle='#123828';[[-14,0,13],[2,-3,16],[18,2,11]].forEach(([dx,dy,r])=>{g.beginPath();g.ellipse(x+dx*s+34,y+dy*s+90,r*s*1.1,r*s*.55,0,0,7);g.fill();});g.restore();
 [[-18,5,11],[-4,-4,16],[13,0,13],[25,6,8]].forEach(([dx,dy,r])=>{g.fillStyle=rad(x+dx*s-r*s*.3,y+dy*s-r*s*.5,1,r*s*1.3,[[0,'#FFFFFF'],[.7,'#F4FAFF'],[1,'#CFE3F7']]);g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,7);g.fill();});g.fillStyle=lin(y,y+16*s,[[0,'#F4FAFF'],[1,'#C7DCF2']]);rr(x-29*s,y+3*s,62*s,12*s,6*s);g.fill();}
function gull(x,y,s,f){g.fillStyle='rgba(18,48,36,.12)';g.beginPath();g.ellipse(x+26,y+70,7*s,2.2*s,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.ellipse(x,y,6*s,2.6*s,0,0,7);g.fill();
 g.fillStyle='#E9EEF4';g.beginPath();g.moveTo(x-1*s,y-1*s);g.quadraticCurveTo(x-8*s,y-9*s,x-15*s,y-4*s);g.quadraticCurveTo(x-8*s,y-4*s,x-1*s,y+1*s);g.fill();g.beginPath();g.moveTo(x+1*s,y-1*s);g.quadraticCurveTo(x+8*s,y-9*s,x+15*s,y-4*s);g.quadraticCurveTo(x+8*s,y-4*s,x+1*s,y+1*s);g.fill();
 g.fillStyle='#55657E';[[-15,-4],[15,-4]].forEach(([dx,dy])=>{g.beginPath();g.arc(x+dx*s,y+dy*s,1.6*s,0,7);g.fill();});g.fillStyle='#FFB23D';g.beginPath();g.moveTo(x+6*f*s,y-1*s);g.lineTo(x+9*f*s,y);g.lineTo(x+6*f*s,y+1*s);g.fill();}
function bluebird(x,y,s,c,f){g.fillStyle='rgba(18,48,36,.12)';g.beginPath();g.ellipse(x+20,y+56,5*s,1.8*s,0,0,7);g.fill();ball3d(x,y,4.5*s,c,0);g.fillStyle=sh(c,-.2);g.beginPath();g.moveTo(x,y-1*s);g.quadraticCurveTo(x-4*f*s,y-10*s,x-9*f*s,y-6*s);g.quadraticCurveTo(x-4*f*s,y-3*s,x,y+1*s);g.fill();g.fillStyle='#FFB23D';g.beginPath();g.moveTo(x+4*f*s,y-1*s);g.lineTo(x+7.5*f*s,y);g.lineTo(x+4*f*s,y+1.4*s);g.fill();g.fillStyle=INK;g.beginPath();g.arc(x+2*f*s,y-1.5*s,.9*s,0,7);g.fill();}
function dragonfly(x,y){g.fillStyle='rgba(200,240,255,.75)';[[-5,-3,-.4],[5,-3,.4],[-4,1,.3],[4,1,-.3]].forEach(([dx,dy,a])=>{g.beginPath();g.ellipse(x+dx,y+dy,5,1.8,a,0,7);g.fill();});g.fillStyle='#18B5C9';rr(x-1,y-4,2,12,1);g.fill();}// ======== Camino · elementos 3D (luz arriba-izquierda; caras: frente claro, lateral derecho oscuro) ========
function ell3d(x,y,rx,ry,c,spec){g.save();g.translate(x,y);g.scale(1,ry/rx);ball3d(0,0,rx,c,spec);g.restore();}
function cylR(x,y,r,h,c){g.fillStyle=cyl(x-r,x+r,c);g.fillRect(x-r,y-h,2*r,h);g.fillStyle=sh(c,-.15);g.beginPath();g.ellipse(x,y,r,r*.35,0,0,Math.PI);g.fill();g.fillStyle=sh(c,.25);g.beginPath();g.ellipse(x,y-h,r,r*.35,0,0,7);g.fill();}
function coneR(x,y,r,h,c){g.fillStyle=cyl(x-r,x+r,c);g.beginPath();g.moveTo(x-r,y);g.lineTo(x,y-h);g.lineTo(x+r,y);g.ellipse(x,y,r,r*.3,0,0,Math.PI);g.fill();}
// caja con frente + lateral (+ techo plano opcional)
function box3(x,y,w,h,dep,c,top){const dx=dep*.6,dy=-dep*.42,x0=x-w/2,x1=x+w/2;g.fillStyle=sh(c,-.28);g.beginPath();g.moveTo(x1,y);g.lineTo(x1+dx,y+dy);g.lineTo(x1+dx,y-h+dy);g.lineTo(x1,y-h);g.fill();g.fillStyle=lin(y-h,y,[[0,sh(c,.12)],[1,sh(c,-.06)]]);g.fillRect(x0,y-h,w,h);if(top!==0){g.fillStyle=sh(top||c,.3);g.beginPath();g.moveTo(x0,y-h);g.lineTo(x1,y-h);g.lineTo(x1+dx,y-h+dy);g.lineTo(x0+dx,y-h+dy);g.fill();}}
// casa 3D: o={w,h,dep,wall,roof,rh,door,win,stripe,log,snow,straw,chim,stilts}
function house(x,y,s,o){const w=(o.w||34)*s,h=(o.h||22)*s,dep=(o.dep||22)*s,rh=(o.rh||16)*s,dx=dep*.6,dy=-dep*.42,x0=x-w/2,x1=x+w/2,ov=3*s,yt=y-h;
 shadow(x+dx+6*s,y+2,w*.75,8*s,.32);box3(x,y,w,h,dep,o.wall,0);
 if(o.stripe){g.save();g.beginPath();g.rect(x0,yt,w,h);g.clip();for(let i=0;i<w;i+=8*s){g.fillStyle=o.stripe;g.fillRect(x0+i,yt,4*s,h);}g.restore();}
 if(o.log){g.strokeStyle='rgba(80,45,20,.45)';g.lineWidth=1.2*s;for(let i=1;i<h/(4*s);i++){g.beginPath();g.moveTo(x0,yt+i*4*s);g.lineTo(x1,yt+i*4*s);g.lineTo(x1+dx,yt+i*4*s+dy);g.stroke();}}
 g.fillStyle=sh(o.wall,.12);g.beginPath();g.moveTo(x0,yt);g.lineTo(x1,yt);g.lineTo(x,yt-rh);g.fill();
 const rc=o.roof;g.fillStyle=lin(yt-rh,yt,[[0,sh(rc,-.05)],[1,sh(rc,-.3)]]);g.beginPath();g.moveTo(x,yt-rh-ov*.4);g.lineTo(x1+ov,yt+ov);g.lineTo(x1+ov+dx,yt+ov+dy);g.lineTo(x+dx,yt-rh-ov*.4+dy);g.closePath();g.fill();
 g.fillStyle=sh(rc,.25);g.beginPath();g.moveTo(x,yt-rh-ov);g.lineTo(x0-ov,yt+ov);g.lineTo(x0-ov+3*s,yt+ov+1.5*s);g.lineTo(x,yt-rh+2*s);g.lineTo(x1+ov-3*s,yt+ov+1.5*s);g.lineTo(x1+ov,yt+ov);g.closePath();g.fill();
 if(o.straw){g.strokeStyle='rgba(120,80,20,.4)';g.lineWidth=1;for(let i=0;i<8;i++){const t=i/8;g.beginPath();g.moveTo(x+(x1+ov-x)*t,yt-rh+(rh+ov)*t);g.lineTo(x+dx+(x1+ov-x)*t,yt-rh+dy+(rh+ov)*t);g.stroke();}}
 if(o.snow){g.fillStyle='#FFFFFF';g.beginPath();g.moveTo(x,yt-rh-ov-2*s);g.lineTo(x+dx,yt-rh-ov-2*s+dy);g.lineTo(x1+ov+dx,yt+ov+dy-3*s);g.quadraticCurveTo(x1,yt-3*s,x,yt-rh+1*s);g.fill();}
 if(o.chim){g.save();box3(x+w*.25+dx*.5,yt-rh*.3+dy*.5,6*s,12*s,5*s,'#B86B4B');g.restore();}
 if(o.win!==0){g.fillStyle='#22324F';rr(x0+5*s,yt+5*s,9*s,8*s,2*s);g.fill();g.fillStyle=o.lit?'#FFD86B':'#9FDBFF';rr(x0+6*s,yt+6*s,7*s,6*s,1.5*s);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x0+6.5*s,yt+6.5*s,2.5*s,2*s);}
 if(o.door!==0){g.fillStyle=sh(o.door||'#7A4E2C',-.1);rr(x+2*s,y-13*s,9*s,13*s,3*s);g.fill();g.fillStyle='rgba(255,255,255,.25)';rr(x+3*s,y-12*s,3*s,11*s,1.5*s);g.fill();ball3d(x+9*s,y-6*s,1*s,'#FFD34D',0);}
 if(o.lit){g.fillStyle=rad(x0+10*s,yt+10*s,1,20*s,[[0,'rgba(255,220,120,.35)'],[1,'rgba(255,220,120,0)']]);g.beginPath();g.arc(x0+10*s,yt+10*s,20*s,0,7);g.fill();}}
// torre cilíndrica: o={r,h,c,stripe,roof,rh,win,dome,battle}
function tower(x,y,s,o){const r=(o.r||10)*s,h=(o.h||40)*s;shadow(x+r*.8,y+2,r*1.8,r*.6,.3);cylR(x,y,r,h,o.c);
 if(o.stripe){for(let i=0;i<4;i++){if(i%2)continue;const y0=y-h*(i+1)/4;g.fillStyle=cyl(x-r,x+r,o.stripe);g.fillRect(x-r,y0,2*r,h/4);}}
 if(o.win){g.fillStyle='#22324F';rr(x-3*s,y-h*.62,6*s,8*s,3*s);g.fill();g.fillStyle='#FFD86B';rr(x-2*s,y-h*.62+1*s,4*s,6*s,2*s);g.fill();}
 if(o.battle){for(let i=-2;i<=2;i++){g.fillStyle=cyl(x-r,x+r,o.c);g.fillRect(x+i*r*.4-r*.13,y-h-5*s,r*.26,6*s);}}
 if(o.dome){g.save();g.beginPath();g.ellipse(x,y-h,r*1.05,r*1.05,0,Math.PI,0);g.fillStyle=rad(x-r*.4,y-h-r*.6,1,r*1.4,[[0,sh(o.dome,.5)],[1,sh(o.dome,-.25)]]);g.fill();g.restore();}
 if(o.roof)coneR(x,y-h,r*1.25,(o.rh||22)*s,o.roof);}
// 7.3 (Jose): formas de varias bolas como UNA sola masa (sin círculos sueltos): silueta unida + luz por dentro
function blob3d(P,c,spec){const sil=()=>{g.beginPath();P.forEach(([x,y,rx,ry])=>{g.moveTo(x+rx,y);g.ellipse(x,y,rx,ry??rx,0,0,7);});};let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach(([x,y,rx,ry])=>{ry=ry??rx;x0=Math.min(x0,x-rx);x1=Math.max(x1,x+rx);y0=Math.min(y0,y-ry);y1=Math.max(y1,y+ry);});
 const w=x1-x0,h=y1-y0;g.fillStyle=sh(c,-.22);sil();g.fill();g.save();sil();g.clip();g.fillStyle=rad(x0+w*.32,y0+h*.28,1,Math.max(w,h)*.95,[[0,sh(c,.42)],[.5,c],[1,sh(c,-.28)]]);g.fillRect(x0-2,y0-2,w+4,h+4);
 P.forEach(([x,y,rx,ry])=>{ry=ry??rx;g.fillStyle=rad(x-rx*.3,y-ry*.4,0,Math.max(rx,ry),[[0,'rgba(255,255,230,.18)'],[1,'rgba(255,255,230,0)']]);g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();});
 g.fillStyle='rgba(0,20,10,.14)';g.beginPath();g.ellipse(x0+w*.55,y1,w*.42,h*.16,0,0,7);g.fill();g.restore();if(spec!==0){g.fillStyle='rgba(255,255,255,.32)';g.beginPath();g.ellipse(x0+w*.3,y0+h*.22,w*.12,h*.07,-.5,0,7);g.fill();}}
// ---- reemplazos 3D de v3 ----
function treeRound(x,y,s,c,f){shadow(x+9*s,y+2,25*s,7*s,.32);g.fillStyle=cyl(x-4.5*s,x+4.5*s,'#9A6A40');g.beginPath();g.moveTo(x-4.5*s,y);g.lineTo(x-2.6*s,y-26*s);g.lineTo(x+2.6*s,y-26*s);g.lineTo(x+4.5*s,y);g.fill();
 const t=y-42*s,B=[[0,-12,15],[-13*f,2,13],[13*f,3,14],[0,4,19],[-6*f,-4,14],[7*f,-6,13]];const sil=()=>{g.beginPath();B.forEach(([dx,dy,r])=>{g.moveTo(x+dx*s+r*s,t+dy*s);g.arc(x+dx*s,t+dy*s,r*s,0,7);});};
 g.fillStyle=sh(c[1],-.1);sil();g.fill();g.save();sil();g.clip();g.fillStyle=rad(x-11*s,t-16*s,2*s,44*s,[[0,sh(c[0],.42)],[.45,c[0]],[.8,sh(c[1],0)],[1,sh(c[1],-.25)]]);g.fillRect(x-40*s,t-40*s,80*s,80*s);
 B.forEach(([dx,dy,r])=>{g.fillStyle=rad(x+dx*s-r*.35*s,t+dy*s-r*.45*s,0,r*.9*s,[[0,'rgba(255,255,220,.28)'],[1,'rgba(255,255,220,0)']]);g.beginPath();g.arc(x+dx*s,t+dy*s,r*s,0,7);g.fill();});
 g.fillStyle='rgba(0,30,10,.2)';g.beginPath();g.ellipse(x+4*s,t+22*s,22*s,6*s,0,0,7);g.fill();g.restore();}
function lighthouse(x,y,s){shadow(x+12*s,y+2,22*s,6*s,.32);ell3d(x,y-2*s,18*s,7*s,'#B7B0A2',0);const r=9*s,h=48*s,yb=y-4*s;
 g.fillStyle=cyl(x-r,x+r,'#FFFFFF');g.beginPath();g.moveTo(x-r*1.15,yb);g.lineTo(x-r*.8,yb-h);g.lineTo(x+r*.8,yb-h);g.lineTo(x+r*1.15,yb);g.fill();
 for(let i=0;i<4;i+=2){const a=yb-h*i/4,b=yb-h*(i+1)/4,wa=r*(1.15-.35*i/4),wb=r*(1.15-.35*(i+1)/4);g.fillStyle=cyl(x-wa,x+wa,'#E8505B');g.beginPath();g.moveTo(x-wa,a);g.lineTo(x-wb,b);g.lineTo(x+wb,b);g.lineTo(x+wa,a);g.fill();}
 g.fillStyle=cyl(x-r,x+r,'#22324F');g.fillRect(x-r,yb-h-2*s,2*r,3*s);g.fillStyle=rad(x,yb-h-8*s,1,8*s,[[0,'#FFFBE0'],[1,'#FFD34D']]);g.fillRect(x-r*.7,yb-h-12*s,r*1.4,10*s);g.strokeStyle='#22324F';g.lineWidth=1.2*s;g.strokeRect(x-r*.7,yb-h-12*s,r*1.4,10*s);coneR(x,yb-h-12*s,r*.95,9*s,'#E8505B');}
function beamFx(x,y,s,t){const yb=y-4*s-48*s-7*s,a=t*1.1;g.save();g.translate(x,yb);g.globalCompositeOperation='lighter';const L=110*s,sp=Math.cos(a);g.fillStyle=lin(0,0,[[0,'rgba(255,240,170,.0)'],[1,'rgba(255,240,170,0)']]);
 g.fillStyle=rad(0,0,2,L,[[0,'rgba(255,245,180,.55)'],[1,'rgba(255,245,180,0)']]);g.beginPath();g.moveTo(0,-2*s);g.lineTo(L*sp,-14*s);g.lineTo(L*sp,10*s);g.closePath();g.fill();g.restore();}
function umbrella(x,y,s,c){shadow(x+8*s,y+2,15*s,4.5*s,.26);ell3d(x+4*s,y-1*s,12*s,3.5*s,'#F7E3B0',0);g.fillStyle=cyl(x-1*s,x+1*s,'#B9926A');g.fillRect(x-1*s,y-24*s,2*s,24*s);
 const cy=y-24*s,R0=16*s;for(let i=0;i<8;i++){const a0=Math.PI+i*Math.PI/8,a1=a0+Math.PI/8;g.fillStyle=i%2?'#FFFFFF':c;g.beginPath();g.moveTo(x,cy-6*s);g.lineTo(x+Math.cos(a0)*R0,cy+Math.sin(a0)*R0*.35+2*s);g.lineTo(x+Math.cos(a1)*R0,cy+Math.sin(a1)*R0*.35+2*s);g.fill();}
 g.fillStyle=lin(cy-6*s,cy+3*s,[[0,'rgba(255,255,255,.0)'],[1,'rgba(0,0,0,.18)']]);g.beginPath();g.moveTo(x,cy-6*s);g.lineTo(x-R0,cy+2*s);g.lineTo(x+R0,cy+2*s);g.fill();
 g.fillStyle=lin(0,0,[[0,'#000'],[1,'#000']]);const sg=g.createLinearGradient(x-R0,0,x+R0,0);sg.addColorStop(0,'rgba(255,255,255,.3)');sg.addColorStop(.5,'rgba(255,255,255,0)');sg.addColorStop(1,'rgba(0,0,30,.22)');g.fillStyle=sg;g.beginPath();g.moveTo(x,cy-6*s);g.lineTo(x-R0,cy+2*s);g.lineTo(x+R0,cy+2*s);g.fill();
 for(let i=0;i<=8;i++){const a=Math.PI+i*Math.PI/8;ball3d(x+Math.cos(a)*R0,cy+Math.sin(a)*R0*.35+2*s,1.3*s,i%2?c:'#fff',0);}ball3d(x,cy-6*s,1.8*s,c,0);}
function beachHut(x,y,s,c){house(x,y,s*.8,{w:26,h:22,dep:16,rh:12,wall:'#FFFFFF',stripe:c,roof:'#22324F',win:0,door:c});}
function cabin(x,y,s){house(x,y,s,{w:40,h:22,dep:26,rh:18,wall:'#C48C58',roof:'#2FB792',log:1,chim:1});g.fillStyle='rgba(255,255,255,.75)';[[16,-52,4],[20,-58,5],[16,-66,6]].forEach(([dx,dy,r])=>ball3d(x+dx*s,y+dy*s,r*s,'#FFFFFF',0));}
function sandcastle(x,y,s){shadow(x+8*s,y+2,18*s,5*s,.26);box3(x,y,26*s,10*s,14*s,'#F2D28E');[-9,9].forEach(dx=>tower(x+dx*s,y-2*s,s,{r:4.4,h:16,c:'#F2D28E',battle:1}));tower(x,y-6*s,s,{r:5,h:20,c:'#F6DCA0',battle:1});g.fillStyle='#E8505B';g.beginPath();g.moveTo(x,y-31*s);g.lineTo(x,y-38*s);g.lineTo(x+6*s,y-35*s);g.fill();}
function boat(x,y,s){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x,y+5*s,22*s,3.4*s,0,0,7);g.fill();g.fillStyle=cyl(x-16*s,x+16*s,'#C8874E');g.beginPath();g.moveTo(x-17*s,y-1*s);g.lineTo(x+17*s,y-1*s);g.quadraticCurveTo(x+14*s,y+7*s,x+9*s,y+7*s);g.lineTo(x-9*s,y+7*s);g.quadraticCurveTo(x-14*s,y+7*s,x-17*s,y-1*s);g.fill();g.fillStyle='#fff';g.fillRect(x-17*s,y-2*s,34*s,2.2*s);
 g.fillStyle=cyl(x-1,x+1,'#8A5A34');g.fillRect(x-1*s,y-31*s,2*s,30*s);g.fillStyle=lin(y-30*s,y,[[0,'#FFFFFF'],[1,'#DCE6F2']]);g.beginPath();g.moveTo(x+1.5*s,y-30*s);g.quadraticCurveTo(x+12*s,y-16*s,x+15*s,y-4*s);g.lineTo(x+1.5*s,y-4*s);g.fill();g.fillStyle=lin(y-26*s,y,[[0,'#FFA8C5'],[1,'#F0709A']]);g.beginPath();g.moveTo(x-1.5*s,y-26*s);g.quadraticCurveTo(x-9*s,y-14*s,x-12*s,y-4*s);g.lineTo(x-1.5*s,y-4*s);g.fill();}
function mushroom(x,y,s,c){shadow(x+4*s,y+1,9*s,3*s,.26);g.fillStyle=cyl(x-4*s,x+4*s,'#FFF2DE');rr(x-4*s,y-11*s,8*s,12*s,3*s);g.fill();g.save();g.beginPath();g.rect(x-14*s,y-30*s,28*s,20*s);g.clip();ell3d(x,y-10*s,12*s,9*s,c);g.restore();g.fillStyle=sh(c,-.3);g.beginPath();g.ellipse(x,y-10*s,12*s,2.4*s,0,0,7);g.fill();[[-5,-15,1.8],[2,-17,1.6],[6,-13,1.4]].forEach(([dx,dy,r])=>ball3d(x+dx*s,y+dy*s,r*s,'#FFFFFF',0));}
function deer(x,y,s,f){shadow(x+3*s,y+1,13*s,3.5*s,.28);[[-7,1],[6,1]].forEach(([dx])=>{g.fillStyle=cyl(x+dx*f*s-1.3*s,x+dx*f*s+1.3*s,'#A8703F');g.fillRect(x+dx*f*s-1.3*s,y-9*s,2.6*s,9*s);});ell3d(x,y-12*s,11*s,6.5*s,'#D0925E');[[-4,-14],[0,-15.5],[4,-13]].forEach(([dx,dy])=>ball3d(x+dx*f*s,y+dy*s,1.2*s,'#FFF6E8',0));
 g.fillStyle=cyl(x+7*f*s-2*s,x+7*f*s+2*s,'#C98B5A');g.beginPath();g.moveTo(x+5*f*s,y-14*s);g.lineTo(x+8*f*s,y-25*s);g.lineTo(x+12*f*s,y-24*s);g.lineTo(x+10*f*s,y-13*s);g.fill();ell3d(x+11*f*s,y-26*s,5*s,4*s,'#D0925E',0);ball3d(x+15.5*f*s,y-25*s,1.3*s,'#3A2A20',0);ball3d(x+12*f*s,y-27*s,.9*s,INK,0);
 g.strokeStyle='#8A5A34';g.lineWidth=1.5*s;g.lineCap='round';g.beginPath();g.moveTo(x+9*f*s,y-29*s);g.lineTo(x+7*f*s,y-37*s);g.moveTo(x+8*f*s,y-33*s);g.lineTo(x+4*f*s,y-35*s);g.moveTo(x+12*f*s,y-29*s);g.lineTo(x+14*f*s,y-36*s);g.stroke();}
function fox(x,y,s,f){shadow(x+2*s,y+1,11*s,3*s,.26);ell3d(x-11*f*s,y-8*s,7*s,3.6*s,'#FF8A3D',0);ball3d(x-17*f*s,y-10*s,2.6*s,'#FFFFFF',0);ell3d(x,y-7*s,9*s,5.2*s,'#FF8A3D');ell3d(x+1*f*s,y-5*s,5*s,2.6*s,'#FFE7D0',0);ball3d(x+9*f*s,y-12*s,5.2*s,'#FF8A3D');
 g.fillStyle='#E36A22';[[6,-15,7,-21,10,-16],[10,-16,13,-21,13,-14]].forEach(([a,b,c,d,e,h])=>{g.beginPath();g.moveTo(x+a*f*s,y+b*s);g.lineTo(x+c*f*s,y+d*s);g.lineTo(x+e*f*s,y+h*s);g.fill();});ball3d(x+13.5*f*s,y-11*s,1.3*s,INK,0);ball3d(x+10*f*s,y-13*s,.9*s,INK,0);}
function balloon(x,y,s,c){shadow(x+4*s,y+1,11*s,3*s,.26);g.fillStyle=cyl(x-6*s,x+6*s,'#B07A44');rr(x-6*s,y-9*s,12*s,9*s,2*s);g.fill();g.strokeStyle='rgba(80,60,40,.6)';g.lineWidth=1;g.beginPath();g.moveTo(x-6*s,y-9*s);g.lineTo(x-9*s,y-22*s);g.moveTo(x+6*s,y-9*s);g.lineTo(x+9*s,y-22*s);g.stroke();
 const cy=y-36*s;g.save();g.beginPath();g.moveTo(x-9*s,y-22*s);g.bezierCurveTo(x-20*s,cy+6*s,x-20*s,cy-20*s,x,cy-20*s);g.bezierCurveTo(x+20*s,cy-20*s,x+20*s,cy+6*s,x+9*s,y-22*s);g.closePath();g.fillStyle=c;g.fill();g.clip();
 for(let i=-2;i<=2;i+=2){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x+i*6*s,cy-2*s,2.4*s,20*s,0,0,7);g.fill();}g.fillStyle=rad(x-7*s,cy-10*s,1,26*s,[[0,'rgba(255,255,255,.5)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(0,0,40,.3)']]);g.fillRect(x-22*s,cy-24*s,44*s,40*s);g.restore();}
function windmill(x,y,s){shadow(x+12*s,y+2,22*s,6*s,.3);g.fillStyle=cyl(x-12*s,x+12*s,'#FBF3E8');g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x-8*s,y-42*s);g.lineTo(x+8*s,y-42*s);g.lineTo(x+12*s,y);g.fill();g.fillStyle=sh('#FBF3E8',-.2);g.beginPath();g.ellipse(x,y,12*s,3*s,0,0,Math.PI);g.fill();
 coneR(x,y-42*s,11*s,15*s,'#7A5AF8');g.fillStyle=cyl(x-3*s,x+3*s,'#7E5634');rr(x-3*s,y-12*s,6*s,12*s,2*s);g.fill();g.fillStyle='#22324F';rr(x-2.5*s,y-30*s,5*s,6*s,2*s);g.fill();}
function bladesFx(x,y,s,t,n,col){g.save();g.translate(x,y);g.rotate(t);for(let i=0;i<(n||4);i++){g.rotate(Math.PI*2/(n||4));g.fillStyle='rgba(0,0,0,.15)';rr(3*s,-2.5*s,26*s,7*s,2*s);g.fill();g.fillStyle=lin(-3.5*s,3.5*s,[[0,'#FFFFFF'],[1,col||'#DCCFC0']]);rr(2*s,-3.5*s,26*s,7*s,2*s);g.fill();g.strokeStyle='rgba(150,120,90,.5)';g.lineWidth=.8;for(let k=1;k<4;k++){g.beginPath();g.moveTo(2*s+k*6.5*s,-3.5*s);g.lineTo(2*s+k*6.5*s,3.5*s);g.stroke();}}g.restore();ball3d(x,y,3*s,'#5A3FD0',0);}
function wheelFx(x,y,s,t){g.save();g.translate(x,y);g.rotate(t);g.strokeStyle='#8A5A34';g.lineWidth=3*s;g.beginPath();g.arc(0,0,14*s,0,7);g.stroke();for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.fillStyle=lin(-18*s,-10*s,[[0,'#D29A62'],[1,'#9A6A40']]);g.fillRect(-2.2*s,-19*s,4.4*s,9*s);g.restore();}g.restore();ball3d(x,y,3.4*s,'#6B4426',0);}
function wisteria(x,y,s){shadow(x+8*s,y+2,24*s,5*s,.24);[-18,18].forEach(dx=>{g.fillStyle=cyl(x+dx*s-1.6*s,x+dx*s+1.6*s,'#8A5A34');g.fillRect(x+dx*s-1.6*s,y-28*s,3.2*s,28*s);});box3(x,y-27*s,46*s,3*s,10*s,'#9A6A40');for(let i=-4;i<=4;i++){for(let k=0;k<4;k++)ball3d(x+i*4.8*s,y-26*s+k*4.2*s,(2.9-k*.3)*s,k%2?'#B79CFF':'#9B7BFF',0);}}
function pinwheel(x,y,s){g.fillStyle=cyl(x-1,x+1,'#C9B6A0');g.fillRect(x-1*s,y-22*s,2*s,22*s);shadow(x+3,y+1,5*s,2*s,.25);}
function pinFx(x,y,s,t){g.save();g.translate(x,y-22*s);g.rotate(t*3);['#FF8FB1','#FFD34D','#7FC4FF','#8EE07A'].forEach((c,i)=>{g.rotate(Math.PI/2);g.fillStyle=c;g.beginPath();g.moveTo(0,0);g.lineTo(9*s,-2*s);g.lineTo(7*s,6*s);g.fill();g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.moveTo(0,0);g.lineTo(7*s,6*s);g.lineTo(4*s,3*s);g.fill();});g.restore();ball3d(x,y-22*s,1.6*s,'#fff',0);}
// ---- animales genéricos (cuerpo 3D) ----
function quad(x,y,s,o,f){const b=o.b,L=o.len||11,H=o.h||9;shadow(x+3*s,y+1,(L+3)*s,3.5*s,.28);[-L*.6,-L*.35,L*.45,L*.7].forEach((dx,i)=>{const lx=x+dx*f*s;g.fillStyle=cyl(lx-1.5*s,lx+1.5*s,i%2?sh(b,-.15):b);g.fillRect(lx-1.5*s,y-H*s,3*s,H*s);g.fillStyle=o.hoof||'#4A3A30';g.fillRect(lx-1.5*s,y-1.6*s,3*s,1.6*s);});
 if(o.hump)blob3d([[x,y-H*s-3*s,L*s,(o.th||6)*s],[x-1*f*s,y-H*s-8*s,5.5*s,5*s]],b);else ell3d(x,y-H*s-3*s,L*s,(o.th||6)*s,b);
 if(o.spots){g.save();g.beginPath();g.ellipse(x,y-H*s-3*s,L*s,(o.th||6)*s,0,0,7);g.clip();o.spots.forEach(([dx,dy,r])=>{g.fillStyle=o.sc;g.beginPath();g.ellipse(x+dx*f*s,y-H*s-3*s+dy*s,r*s,r*.75*s,.3,0,7);g.fill();});g.restore();}
 if(o.stripes){g.save();g.beginPath();g.ellipse(x,y-H*s-3*s,L*s,(o.th||6)*s,0,0,7);g.clip();g.strokeStyle='#22324F';g.lineWidth=2*s;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(x+i*3.4*s,y-H*s-10*s);g.quadraticCurveTo(x+i*3.4*s+2*s,y-H*s-3*s,x+i*3.4*s,y-H*s+4*s);g.stroke();}g.restore();}
 const nl=o.neck||7,hx=x+(L-1)*f*s,hy=y-H*s-3*s-nl*s;g.fillStyle=cyl(hx-2.6*s,hx+2.6*s,b);g.beginPath();g.moveTo(x+(L-5)*f*s,y-H*s-4*s);g.lineTo(hx-1*f*s,hy);g.lineTo(hx+3*f*s,hy+1*s);g.lineTo(x+(L-1)*f*s,y-H*s-2*s);g.fill();
 ell3d(hx+2*f*s,hy,(o.hr||4.4)*s,(o.hr||4.4)*.8*s,o.hc||b,0);ball3d(hx+3*f*s,hy-1.2*s,.95*s,INK,0);if(o.ear){ell3d(hx-1*f*s,hy-3.6*s,2*s,1.2*s,b,0);}
 if(o.horn){g.strokeStyle=o.horn;g.lineWidth=1.5*s;g.lineCap='round';g.beginPath();g.moveTo(hx,hy-3*s);g.lineTo(hx-2*f*s,hy-9*s);g.moveTo(hx+3*f*s,hy-3*s);g.lineTo(hx+5*f*s,hy-9*s);g.stroke();}
 if(o.trunk){g.strokeStyle=b;g.lineWidth=3*s;g.beginPath();g.moveTo(hx+5*f*s,hy+1*s);g.quadraticCurveTo(hx+8*f*s,hy+8*s,hx+6*f*s,hy+12*s);g.stroke();ell3d(hx-2*f*s,hy,5*s,6*s,sh(b,-.08),0);}
 if(o.tail){g.strokeStyle=sh(b,-.2);g.lineWidth=1.6*s;g.beginPath();g.moveTo(x-L*f*s,y-H*s-4*s);g.quadraticCurveTo(x-(L+4)*f*s,y-H*s,x-(L+3)*f*s,y-H*s+4*s);g.stroke();}}
const AN={
 cow:(x,y,s,f)=>quad(x,y,s,{b:'#FFFFFF',spots:[[-4,-2,4],[5,1,3],[0,3,2.6]],sc:'#33323A',horn:'#E9D8B8',ear:1,tail:1,hc:'#F7F0EA'},f),
 zebra:(x,y,s,f)=>quad(x,y,s,{b:'#FFFFFF',stripes:1,ear:1,tail:1,h:10},f),
 giraffe:(x,y,s,f)=>quad(x,y,s,{b:'#F2B84B',spots:[[-5,-2,2.4],[0,1,2.2],[5,-1,2.3],[-2,3,1.8],[4,4,1.6]],sc:'#B86B2A',neck:24,h:13,ear:1,horn:'#B86B2A',hr:3.6},f),
 camel:(x,y,s,f)=>quad(x,y,s,{b:'#D9A66A',hump:1,neck:10,h:12,ear:1,tail:1},f),
 elephant:(x,y,s,f)=>quad(x,y,s,{b:'#9AA6B8',len:14,th:9,h:9,neck:2,hr:6,trunk:1,tail:1},f),
 goat:(x,y,s,f)=>quad(x,y,s,{b:'#F4EEE4',horn:'#8A6A44',ear:1,len:9,h:8,tail:1},f),
 reindeer:(x,y,s,f)=>{quad(x,y,s,{b:'#A8774C',ear:1,tail:1,horn:'#6B4426'},f);},
 sheep:(x,y,s,f)=>{shadow(x+3*s,y+1,12*s,3.5*s,.26);[-5,5].forEach(dx=>{g.fillStyle='#33323A';g.fillRect(x+dx*s-1.2*s,y-6*s,2.4*s,6*s);});blob3d([[-6,-9,5],[0,-11,6],[6,-9,5],[-3,-6,5],[4,-6,5]].map(([dx,dy,r])=>[x+dx*s,y+dy*s,r*s]),'#F4F4F0');ell3d(x+10*f*s,y-11*s,3.6*s,4*s,'#33323A',0);ball3d(x+11*f*s,y-12*s,.8*s,'#fff',0);},
 penguin:(x,y,s,f)=>{shadow(x+3*s,y+1,7*s,2.5*s,.26);ell3d(x,y-9*s,6*s,9*s,'#2B3448');ell3d(x+1*f*s,y-8*s,4*s,7*s,'#FFFFFF',0);ball3d(x,y-17*s,4.6*s,'#2B3448');ball3d(x+2*f*s,y-18*s,.9*s,'#fff',0);g.fillStyle='#FFB23D';g.beginPath();g.moveTo(x+4*f*s,y-17*s);g.lineTo(x+7*f*s,y-16*s);g.lineTo(x+4*f*s,y-15*s);g.fill();ell3d(x-2*s,y-.5*s,2.4*s,1*s,'#FFB23D',0);ell3d(x+2*s,y-.5*s,2.4*s,1*s,'#FFB23D',0);},
 flamingo:(x,y,s,f)=>{shadow(x+2*s,y+1,7*s,2*s,.24);g.strokeStyle='#E77AA0';g.lineWidth=1.4*s;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-14*s);g.moveTo(x,y-8*s);g.lineTo(x-3*f*s,y-12*s);g.stroke();ell3d(x,y-17*s,7*s,4.4*s,'#FF8FB1');g.strokeStyle='#FF8FB1';g.lineWidth=2.4*s;g.beginPath();g.moveTo(x+5*f*s,y-18*s);g.quadraticCurveTo(x+10*f*s,y-30*s,x+5*f*s,y-32*s);g.stroke();ball3d(x+6*f*s,y-32*s,2.6*s,'#FF8FB1',0);g.fillStyle='#22324F';g.beginPath();g.moveTo(x+8*f*s,y-32*s);g.lineTo(x+11*f*s,y-29*s);g.lineTo(x+8*f*s,y-30*s);g.fill();},
 turtle:(x,y,s,f)=>{shadow(x+2*s,y+1,10*s,3*s,.26);[[-6,-1],[6,-1],[-5,2],[5,2]].forEach(([dx,dy])=>ell3d(x+dx*s,y+dy*s-2*s,2.6*s,1.8*s,'#7BC67E',0));ball3d(x+10*f*s,y-4*s,3*s,'#7BC67E',0);ell3d(x,y-5*s,9*s,6*s,'#3E9B5A');g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x-4*s,y-8*s);g.lineTo(x+4*s,y-8*s);g.moveTo(x,y-10*s);g.lineTo(x,y-2*s);g.stroke();},
 seal:(x,y,s,f)=>{shadow(x+3*s,y+1,11*s,3*s,.26);ell3d(x,y-5*s,11*s,5*s,'#9AA6B8');ball3d(x+9*f*s,y-10*s,4.6*s,'#9AA6B8');ball3d(x+11*f*s,y-11*s,.9*s,INK,0);ell3d(x-11*f*s,y-2*s,4*s,1.6*s,'#7E8AA0',0);},
 bear:(x,y,s,f)=>{quad(x,y,s,{b:'#FFFFFF',len:12,th:7.5,h:7,neck:3,hr:5,ear:1,hc:'#F4F7FA'},f);},
 squirrel:(x,y,s,f)=>{shadow(x+2*s,y+1,7*s,2*s,.24);ell3d(x-6*f*s,y-10*s,4.5*s,8*s,'#D9733A',0);ell3d(x,y-5*s,5*s,5*s,'#E8823F');ball3d(x+3*f*s,y-11*s,3.6*s,'#E8823F');ball3d(x+5*f*s,y-12*s,.8*s,INK,0);ball3d(x+3*f*s,y-4*s,2*s,'#8A5A34',0);},
 cat:(x,y,s,f)=>{shadow(x+2*s,y+1,7*s,2*s,.24);ell3d(x,y-5*s,6*s,5*s,'#3A3F4F');ball3d(x+4*f*s,y-11*s,4*s,'#3A3F4F');g.fillStyle='#3A3F4F';g.beginPath();g.moveTo(x+1*f*s,y-13*s);g.lineTo(x+2*f*s,y-18*s);g.lineTo(x+4*f*s,y-14*s);g.lineTo(x+6*f*s,y-18*s);g.lineTo(x+7*f*s,y-13*s);g.fill();ball3d(x+3*f*s,y-11*s,.9*s,'#FFE27A',0);ball3d(x+6*f*s,y-11*s,.9*s,'#FFE27A',0);g.strokeStyle='#3A3F4F';g.lineWidth=2*s;g.lineCap='round';g.beginPath();g.moveTo(x-6*f*s,y-4*s);g.quadraticCurveTo(x-12*f*s,y-8*s,x-9*f*s,y-14*s);g.stroke();},
 monkey:(x,y,s,f)=>{shadow(x+2*s,y+1,7*s,2*s,.24);ell3d(x,y-7*s,5.5*s,6.5*s,'#8A5A34');ball3d(x,y-16*s,5*s,'#8A5A34');ell3d(x+1*f*s,y-15*s,3.6*s,3*s,'#F2C9A0',0);ball3d(x-5*s,y-17*s,2*s,'#F2C9A0',0);ball3d(x+5*s,y-17*s,2*s,'#F2C9A0',0);ball3d(x-.6*s+1*f*s,y-16*s,.7*s,INK,0);ball3d(x+2*s+1*f*s,y-16*s,.7*s,INK,0);},
 toucan:(x,y,s,f)=>{ell3d(x,y,4*s,6*s,'#22324F');ball3d(x+1*f*s,y-6*s,3.6*s,'#22324F');ell3d(x+1.5*f*s,y-4*s,2.4*s,2*s,'#FFF6D6',0);ell3d(x+6*f*s,y-6*s,4*s,1.8*s,'#FF8A3D',0);ball3d(x+2*f*s,y-7*s,.8*s,'#fff',0);},
 owl:(x,y,s,f)=>{ell3d(x,y,5.5*s,7*s,'#A8774C');ball3d(x-2.2*s,y-3*s,2.4*s,'#FFF6D6',0);ball3d(x+2.2*s,y-3*s,2.4*s,'#FFF6D6',0);ball3d(x-2.2*s,y-3*s,1.1*s,INK,0);ball3d(x+2.2*s,y-3*s,1.1*s,INK,0);g.fillStyle='#FFB23D';g.beginPath();g.moveTo(x-1*s,y-1*s);g.lineTo(x+1*s,y-1*s);g.lineTo(x,y+1.2*s);g.fill();},
 duck:(x,y,s,f)=>duck(x,y,f),crab:(x,y,s,f)=>crab(x,y,f),deer:deer,fox:fox};
// ---- plantas y árboles por tema (todas en 3D) ----
function palmT(x,y,s,f){palm(x,y,s,f);}
function snowPine(x,y,s){pine(x,y,s,['#5FB79A','#2E7D6B']);for(let i=0;i<3;i++){const ty=y-8*s-i*12.5*s,w=(19-i*4.6)*s;g.fillStyle='#FFFFFF';g.beginPath();g.moveTo(x,ty-21*s);g.quadraticCurveTo(x-w*.25,ty-14*s,x-w*.55,ty-8*s);g.quadraticCurveTo(x,ty-12*s,x+w*.5,ty-9*s);g.quadraticCurveTo(x+w*.2,ty-14*s,x,ty-21*s);g.fill();}}
function cactus(x,y,s,f){shadow(x+6*s,y+1,11*s,3.5*s,.3);const c='#4DB36A';g.fillStyle=cyl(x-5*s,x+5*s,c);rr(x-5*s,y-36*s,10*s,36*s,5*s);g.fill();[[-1,-16,-10,-26],[1,-22,10,-30]].forEach(([k,y0,dx,y1])=>{const ax=x+dx*f*s;g.fillStyle=cyl(ax-3.4*s,ax+3.4*s,c);rr(ax-3.4*s,y+y1*s,6.8*s,(y0-y1+4)*s,3.4*s);g.fill();g.fillRect(Math.min(ax,x),y+y0*s-3*s,Math.abs(ax-x),6*s);});
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x-1.5*s,y-34*s);g.lineTo(x-1.5*s,y-2*s);g.stroke();ball3d(x,y-36*s,2.4*s,'#FF8FB1',0);}
function acacia(x,y,s,f){shadow(x+10*s,y+2,30*s,6*s,.28);g.strokeStyle='#8A5A34';g.lineCap='round';g.lineWidth=4*s;g.beginPath();g.moveTo(x,y);g.lineTo(x+2*f*s,y-22*s);g.lineTo(x-10*f*s,y-34*s);g.moveTo(x+2*f*s,y-22*s);g.lineTo(x+12*f*s,y-33*s);g.stroke();
 [[-14,-38,15],[0,-41,17],[14,-37,14]].forEach(([dx,dy,r])=>ell3d(x+dx*f*s,y+dy*s,r*s,r*.42*s,'#8DBF4A'));}
function bamboo(x,y,s){shadow(x+6*s,y+1,12*s,3*s,.26);[-5,0,5].forEach((dx,i)=>{const h=(46+i*6-(i==2?10:0))*s,bx=x+dx*s;g.fillStyle=cyl(bx-2*s,bx+2*s,'#79C255');g.fillRect(bx-2*s,y-h,4*s,h);for(let k=8*s;k<h;k+=9*s){g.fillStyle='#4E9A3A';g.fillRect(bx-2.4*s,y-k,4.8*s,1.4*s);}g.fillStyle='#62B348';[[-1,-h+6*s],[1,-h+14*s]].forEach(([d,yy])=>{g.beginPath();g.ellipse(bx+d*6*s,y+yy,7*s,2*s,d*.5,0,7);g.fill();});});}
function maple(x,y,s,f){treeRound(x,y,s,['#FF9A4D','#D9482B'],f);}
function cherry(x,y,s,f){treeRound(x,y,s,['#FFC1DA','#E77AA0'],f);for(let i=0;i<5;i++){g.fillStyle='#FFD6E7';g.beginPath();g.ellipse(x+R(-18,18)*s,y+R(-2,4)*s,2*s,1*s,R(0,3),0,7);g.fill();}}
function candyTree(x,y,s,f){g.fillStyle=cyl(x-3*s,x+3*s,'#FFFFFF');g.fillRect(x-3*s,y-26*s,6*s,26*s);g.strokeStyle='#FF5F7E';g.lineWidth=2*s;for(let k=0;k<26;k+=6){g.beginPath();g.moveTo(x-3*s,y-k*s);g.lineTo(x+3*s,y-(k+4)*s);g.stroke();}shadow(x+8*s,y+1,18*s,5*s,.28);ball3d(x,y-40*s,17*s,['#FF9AD5','#9EE7FF','#FFE27A'][Math.abs(Math.round(x))%3]);}
function jungleTree(x,y,s,f){shadow(x+10*s,y+2,26*s,7*s,.3);g.fillStyle=cyl(x-5*s,x+5*s,'#8A6A44');g.fillRect(x-4*s,y-40*s,8*s,40*s);[[-2.6,1],[-2.1,1],[-1.57,0],[-1,1],[-.5,1],[2.8,0],[.3,0]].forEach(([a0,fr])=>{const a=f>0?a0:Math.PI-a0,tx=x,ty=y-42*s,L=28*s,ex=tx+Math.cos(a)*L,ey=ty+Math.sin(a)*L+8*s;g.fillStyle=fr?'#3FB86A':'#2E9A55';g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a-.5)*L*.7,ty+Math.sin(a-.5)*L*.7,ex,ey);g.quadraticCurveTo(tx+Math.cos(a+.5)*L*.7,ty+Math.sin(a+.5)*L*.7+6*s,tx,ty);g.fill();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=1;g.beginPath();g.moveTo(tx,ty);g.lineTo(ex,ey);g.stroke();});}
function glowShroom(x,y,s,c){g.fillStyle=rad(x,y-20*s,1,30*s,[[0,'rgba(180,140,255,.35)'],[1,'rgba(180,140,255,0)']]);g.beginPath();g.arc(x,y-20*s,30*s,0,7);g.fill();mushroom(x,y,s*1.7,c);}
function bareTree(x,y,s,f){shadow(x+8*s,y+1,16*s,4*s,.26);g.strokeStyle='#7A5A4A';g.lineCap='round';g.lineWidth=4*s;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-30*s);g.stroke();g.lineWidth=2*s;[[-1,-18,-12,-30],[1,-22,12,-34],[-1,-28,-6,-42],[1,-30,6,-44]].forEach(([k,a,dx,b])=>{g.beginPath();g.moveTo(x,y+a*s);g.lineTo(x+dx*f*s,y+b*s);g.stroke();ball3d(x+dx*f*s,y+b*s,2.6*s,'#FFFFFF',0);});}
function sunflower(x,y,s){g.strokeStyle='#4E9A3A';g.lineWidth=2*s;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-26*s);g.stroke();ell3d(x-4*s,y-12*s,4*s,2*s,'#62B348',0);for(let i=0;i<12;i++){const a=i*Math.PI/6;ell3d(x+Math.cos(a)*6*s,y-28*s+Math.sin(a)*6*s,3*s,1.8*s,'#FFC83D',0);}ball3d(x,y-28*s,4.6*s,'#7A4E2C');}
function wheat(x,y,w){for(let r=0;r<3;r++)for(let k=0;k<w/5;k++){const xx=x-w/2+k*5+(r%2)*2.5,yy=y+r*8;g.strokeStyle='#C99A2E';g.lineWidth=1.2;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+1,yy-13);g.stroke();ell3d(xx+1,yy-15,1.8,4,'#F2C94C',0);}}
// ---- estructuras temáticas ----
const ST={
 barn:(x,y,s)=>{house(x,y,s,{w:40,h:26,dep:28,rh:18,wall:'#D9483B',roof:'#5A3A2E',win:0,door:'#FFFFFF'});g.strokeStyle='#fff';g.lineWidth=1.6*s;g.strokeRect(x-8*s,y-20*s,16*s,20*s);g.beginPath();g.moveTo(x-8*s,y-20*s);g.lineTo(x+8*s,y);g.moveTo(x+8*s,y-20*s);g.lineTo(x-8*s,y);g.stroke();},
 silo:(x,y,s)=>tower(x,y,s,{r:9,h:44,c:'#C9D3DD',dome:'#E1E8EF'}),
 hay:(x,y,s)=>{shadow(x+6*s,y+1,13*s,3.5*s,.28);g.fillStyle=lin(y-16*s,y,[[0,'#F7D774'],[1,'#D9A93A']]);rr(x-11*s,y-15*s,18*s,15*s,3*s);g.fill();ell3d(x+7*s,y-7.5*s,5*s,7.5*s,'#F2C94C',0);g.strokeStyle='#B9862A';g.lineWidth=1;g.beginPath();g.arc(x+7*s,y-7.5*s,3*s,0,7);g.stroke();},
 scarecrow:(x,y,s)=>{shadow(x+4*s,y+1,8*s,2.5*s,.26);g.fillStyle=cyl(x-1.4*s,x+1.4*s,'#8A5A34');g.fillRect(x-1.4*s,y-30*s,2.8*s,30*s);g.fillRect(x-13*s,y-24*s,26*s,2.6*s);box3(x,y-12*s,12*s,12*s,5*s,'#5F8FD9',0);ball3d(x,y-30*s,5*s,'#F2D28E');coneR(x,y-33*s,8*s,7*s,'#C9933A');},
 tractor:(x,y,s,f)=>{shadow(x+6*s,y+1,18*s,4*s,.3);box3(x,y-6*s,22*s,10*s,10*s,'#3CCB5A');box3(x-5*f*s,y-16*s,10*s,10*s,8*s,'#3CCB5A');g.fillStyle='#9FDBFF';g.fillRect(x-8*f*s-2*s,y-24*s,6*s,6*s);ball3d(x-7*f*s,y-4*s,7*s,'#33323A',0);ball3d(x+8*f*s,y-2*s,4.5*s,'#33323A',0);ball3d(x-7*f*s,y-4*s,2.6*s,'#FFC83D',0);},
 fence:(x,y,s)=>{for(let i=-2;i<=2;i++){g.fillStyle=cyl(x+i*7*s-1.3*s,x+i*7*s+1.3*s,'#E9D2AE');g.fillRect(x+i*7*s-1.3*s,y-12*s,2.6*s,12*s);}box3(x,y-8*s,30*s,2*s,2*s,'#D9BE94');box3(x,y-3*s,30*s,2*s,2*s,'#D9BE94');},
 pyramid:(x,y,s)=>{shadow(x+20*s,y+2,40*s,8*s,.3);g.fillStyle='#F2D28E';g.beginPath();g.moveTo(x-30*s,y);g.lineTo(x,y-40*s);g.lineTo(x+8*s,y+4*s);g.fill();g.fillStyle='#C9A060';g.beginPath();g.moveTo(x+8*s,y+4*s);g.lineTo(x,y-40*s);g.lineTo(x+30*s,y-4*s);g.fill();g.strokeStyle='rgba(150,110,60,.35)';g.lineWidth=1;for(let i=1;i<6;i++){const t=i/6;g.beginPath();g.moveTo(x-30*s*(1-t),y-40*s*t);g.lineTo(x+8*s*(1-t),y+4*s*(1-t)-40*s*t);g.lineTo(x+30*s*(1-t),y-4*s*(1-t)-40*s*t);g.stroke();}},
 arch:(x,y,s)=>{shadow(x+10*s,y+2,30*s,6*s,.28);const c='#D9895A';[-1,1].forEach(k=>{g.fillStyle=cyl(x+k*16*s-6*s,x+k*16*s+6*s,c);rr(x+k*16*s-6*s,y-34*s,12*s,34*s,5*s);g.fill();});g.fillStyle=lin(y-46*s,y-30*s,[[0,sh(c,.25)],[1,sh(c,-.2)]]);g.beginPath();g.moveTo(x-22*s,y-30*s);g.quadraticCurveTo(x,y-56*s,x+22*s,y-30*s);g.lineTo(x+12*s,y-30*s);g.quadraticCurveTo(x,y-44*s,x-12*s,y-30*s);g.fill();},
 dune:(x,y,s)=>{g.fillStyle='rgba(120,80,30,.15)';g.beginPath();g.ellipse(x+8*s,y+3*s,46*s,10*s,0,0,7);g.fill();g.fillStyle=lin(y-20*s,y,[[0,'#FFE2A8'],[1,'#E3B572']]);g.beginPath();g.moveTo(x-46*s,y);g.quadraticCurveTo(x-10*s,y-26*s,x+6*s,y-22*s);g.quadraticCurveTo(x+30*s,y-12*s,x+46*s,y);g.fill();g.fillStyle='rgba(160,100,40,.25)';g.beginPath();g.moveTo(x+6*s,y-22*s);g.quadraticCurveTo(x+30*s,y-12*s,x+46*s,y);g.quadraticCurveTo(x+20*s,y-6*s,x+6*s,y-22*s);g.fill();},
 amphora:(x,y,s)=>{shadow(x+3*s,y+1,7*s,2*s,.26);ell3d(x,y-8*s,6*s,8*s,'#D9733A');g.fillStyle=cyl(x-2.5*s,x+2.5*s,'#D9733A');g.fillRect(x-2.5*s,y-19*s,5*s,5*s);g.fillStyle='#FFF2DE';g.fillRect(x-6*s,y-9*s,12*s,1.6*s);},
 snowman:(x,y,s)=>{shadow(x+5*s,y+1,10*s,3*s,.28);ball3d(x,y-8*s,9*s,'#FFFFFF');ball3d(x,y-21*s,6.5*s,'#FFFFFF');ball3d(x,y-31*s,5*s,'#FFFFFF');g.fillStyle='#FF8A3D';g.beginPath();g.moveTo(x+2*s,y-31*s);g.lineTo(x+9*s,y-30*s);g.lineTo(x+2*s,y-29*s);g.fill();ball3d(x-1.5*s,y-33*s,.9*s,INK,0);ball3d(x+2*s,y-33*s,.9*s,INK,0);cylR(x,y-35*s,4*s,6*s,'#33323A');g.fillStyle='#E8505B';rr(x-6*s,y-26*s,12*s,3*s,1.5*s);g.fill();},
 igloo:(x,y,s)=>{shadow(x+8*s,y+2,24*s,6*s,.28);g.save();g.beginPath();g.ellipse(x,y,22*s,22*s,0,Math.PI,0);g.fillStyle=rad(x-8*s,y-16*s,2,30*s,[[0,'#FFFFFF'],[1,'#BFD8EE']]);g.fill();g.clip();g.strokeStyle='rgba(120,160,200,.45)';g.lineWidth=1;for(let i=1;i<5;i++){g.beginPath();g.moveTo(x-22*s,y-i*5*s);g.lineTo(x+22*s,y-i*5*s);g.stroke();}g.restore();g.fillStyle='#2B3448';g.beginPath();g.ellipse(x+6*s,y,6*s,9*s,0,Math.PI,0);g.fill();},
 sled:(x,y,s)=>{shadow(x+4*s,y+1,12*s,3*s,.26);box3(x,y-4*s,22*s,3*s,9*s,'#E8505B');g.strokeStyle='#8A8A8A';g.lineWidth=1.4*s;g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x+10*s,y);g.quadraticCurveTo(x+15*s,y,x+14*s,y-5*s);g.stroke();},
 chalet:(x,y,s)=>house(x,y,s,{w:38,h:24,dep:24,rh:20,wall:'#C48C58',roof:'#7A3E30',snow:1,log:1,lit:1}),
 lantern:(x,y,s)=>{shadow(x+3*s,y+1,7*s,2*s,.26);box3(x,y,8*s,4*s,5*s,'#B7B0A2');g.fillStyle=cyl(x-2*s,x+2*s,'#B7B0A2');g.fillRect(x-2*s,y-12*s,4*s,8*s);box3(x,y-12*s,10*s,6*s,6*s,'#C9C2B4');g.fillStyle='#FFD86B';g.fillRect(x-3*s,y-17*s,6*s,4*s);coneR(x+1*s,y-18*s,8*s,6*s,'#9A938A');},
 pagoda:(x,y,s)=>{shadow(x+12*s,y+2,26*s,7*s,.3);for(let i=0;i<3;i++){const yy=y-i*15*s,w=(26-i*6)*s;box3(x,yy,w,10*s,w*.6,'#F3E2C8',0);g.fillStyle='#22324F';g.fillRect(x-2*s,yy-8*s,4*s,8*s);const ry=yy-10*s;g.fillStyle=lin(ry-6*s,ry,[[0,'#E8505B'],[1,'#A82E3A']]);g.beginPath();g.moveTo(x-w/2-8*s,ry+2*s);g.quadraticCurveTo(x,ry-8*s,x+w/2+8*s+w*.36,ry+2*s-w*.25);g.lineTo(x+w/2+w*.36,ry-w*.25);g.lineTo(x-w/2,ry);g.fill();}ball3d(x,y-50*s,2.4*s,'#FFC83D',0);},
 torii:(x,y,s)=>{shadow(x+8*s,y+2,22*s,4*s,.26);[-12,12].forEach(dx=>{g.fillStyle=cyl(x+dx*s-2*s,x+dx*s+2*s,'#E8505B');g.fillRect(x+dx*s-2*s,y-30*s,4*s,30*s);});box3(x,y-26*s,30*s,3*s,4*s,'#E8505B');g.fillStyle=lin(y-36*s,y-30*s,[[0,'#4A3A40'],[1,'#22202A']]);g.beginPath();g.moveTo(x-19*s,y-33*s);g.quadraticCurveTo(x,y-37*s,x+19*s,y-35*s);g.lineTo(x+18*s,y-31*s);g.lineTo(x-18*s,y-31*s);g.fill();},
 redBridge:(x,y,s)=>{shadow(x+4*s,y+4,30*s,5*s,.25);g.strokeStyle='#E8505B';g.lineWidth=5*s;g.beginPath();g.moveTo(x-28*s,y);g.quadraticCurveTo(x,y-18*s,x+28*s,y);g.stroke();g.lineWidth=2*s;g.strokeStyle='#B8323E';g.beginPath();g.moveTo(x-28*s,y-8*s);g.quadraticCurveTo(x,y-26*s,x+28*s,y-8*s);g.stroke();for(let i=-3;i<=3;i++){const t=(i+3)/6,bx=x-28*s+56*s*t,by=y-18*s*4*t*(1-t);g.beginPath();g.moveTo(bx,by);g.lineTo(bx,by-8*s);g.stroke();}},
 rockGarden:(x,y,s)=>{g.fillStyle='rgba(0,0,0,.1)';g.beginPath();g.ellipse(x+3,y+3,34*s,14*s,0,0,7);g.fill();g.fillStyle='#EFE7D6';g.beginPath();g.ellipse(x,y,34*s,14*s,0,0,7);g.fill();g.strokeStyle='rgba(160,140,110,.5)';g.lineWidth=1;for(let i=1;i<5;i++){g.beginPath();g.ellipse(x,y,34*s*i/5,14*s*i/5,0,0,7);g.stroke();}rock(x-8*s,y+2*s,.8*s,'#9A938A');rock(x+12*s,y-2*s,.6*s,'#9A938A');},
 mountain:(x,y,s)=>{shadow(x+24*s,y+3,56*s,10*s,.3);g.fillStyle='#7F95B5';g.beginPath();g.moveTo(x-50*s,y);g.lineTo(x-4*s,y-70*s);g.lineTo(x+8*s,y+6*s);g.fill();g.fillStyle='#5B6F90';g.beginPath();g.moveTo(x+8*s,y+6*s);g.lineTo(x-4*s,y-70*s);g.lineTo(x+52*s,y-2*s);g.fill();g.fillStyle='#FFFFFF';g.beginPath();g.moveTo(x-4*s,y-70*s);g.lineTo(x-18*s,y-48*s);g.lineTo(x-10*s,y-50*s);g.lineTo(x-4*s,y-44*s);g.lineTo(x+2*s,y-50*s);g.lineTo(x+12*s,y-46*s);g.closePath();g.fill();g.fillStyle='#DCE8F5';g.beginPath();g.moveTo(x-4*s,y-70*s);g.lineTo(x+12*s,y-46*s);g.lineTo(x+2*s,y-50*s);g.lineTo(x-1*s,y-46*s);g.fill();},
 waterfall:(x,y,s)=>{ST.mountain(x,y-6*s,s*.8);g.fillStyle=lin(y-50*s,y,[[0,'#BDEBFF'],[1,'#5CC8FF']]);rr(x-5*s,y-42*s,10*s,40*s,4*s);g.fill();g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.4;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(x+i*1.8*s,y-40*s);g.lineTo(x+i*1.8*s,y-4*s);g.stroke();}[-6,0,6].forEach(dx=>ball3d(x+dx*s,y-2*s,4*s,'#FFFFFF',0));},
 crystalBig:(x,y,s)=>crystal(x,y,s*1.6),
 magicTower:(x,y,s)=>tower(x,y,s,{r:9,h:46,c:'#B9A6EE',roof:'#6B4FE0',rh:24,win:1}),
 volcano:(x,y,s)=>{shadow(x+24*s,y+3,56*s,10*s,.3);g.fillStyle='#A0524A';g.beginPath();g.moveTo(x-52*s,y);g.lineTo(x-10*s,y-56*s);g.lineTo(x+4*s,y+6*s);g.fill();g.fillStyle='#7A3A36';g.beginPath();g.moveTo(x+4*s,y+6*s);g.lineTo(x-10*s,y-56*s);g.lineTo(x+10*s,y-56*s);g.lineTo(x+52*s,y);g.fill();ell3d(x,y-56*s,11*s,3.2*s,'#FF7A3D',0);g.fillStyle='#FF8A3D';g.beginPath();g.moveTo(x-6*s,y-56*s);g.quadraticCurveTo(x-12*s,y-34*s,x-16*s,y-20*s);g.quadraticCurveTo(x-6*s,y-30*s,x+2*s,y-56*s);g.fill();},
 geyser:(x,y,s)=>{pond(x,y,16*s,8*s,2.2,'#7FD3FF','#3BA8F0',0);},
 termite:(x,y,s)=>{shadow(x+6*s,y+1,12*s,3.5*s,.28);g.fillStyle=cyl(x-9*s,x+9*s,'#C9874E');g.beginPath();g.moveTo(x-10*s,y);g.quadraticCurveTo(x-6*s,y-30*s,x,y-36*s);g.quadraticCurveTo(x+6*s,y-30*s,x+10*s,y);g.fill();},
 jeep:(x,y,s,f)=>{shadow(x+6*s,y+1,18*s,4*s,.3);box3(x,y-5*s,30*s,10*s,14*s,'#E9C46A');box3(x-3*f*s,y-15*s,16*s,7*s,12*s,'#9FDBFF');ball3d(x-10*s,y-2*s,4.6*s,'#33323A',0);ball3d(x+10*s,y-2*s,4.6*s,'#33323A',0);},
 iceBlock:(x,y,s)=>{shadow(x+10*s,y+2,24*s,5*s,.25);box3(x,y,30*s,26*s,20*s,'#BFE6FF','#EAF8FF');g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.moveTo(x-12*s,y-22*s);g.lineTo(x-4*s,y-22*s);g.lineTo(x-14*s,y-6*s);g.fill();},
 iceCastle:(x,y,s)=>{box3(x,y,40*s,18*s,18*s,'#CDEBFF','#F0FAFF');[-18,18].forEach(dx=>tower(x+dx*s,y,s,{r:6,h:30,c:'#BFE6FF',roof:'#8FD0FF',rh:14}));tower(x,y-10*s,s,{r:8,h:30,c:'#DDF2FF',roof:'#8FD0FF',rh:18,win:1});},
 island:(x,y,s)=>{shadow(x+10*s,y+26*s,26*s,6*s,.2);g.fillStyle=cyl(x-26*s,x+26*s,'#A0785A');g.beginPath();g.moveTo(x-26*s,y);g.lineTo(x,y+30*s);g.lineTo(x+26*s,y);g.fill();ell3d(x,y,27*s,9*s,'#9BEA6E');treeRound(x-6*s,y+2*s,.6*s,['#9BEA6E','#3FAE3C'],1);ball3d(x+12*s,y-3*s,4*s,'#FF9AD5',0);},
 airship:(x,y,s)=>{ell3d(x,y-30*s,24*s,10*s,'#FF8FB1');box3(x,y-14*s,14*s,5*s,6*s,'#B07A44');},
 pier:(x,y,s)=>{for(let i=0;i<5;i++)box3(x,y-i*9*s,16*s,3*s,8*s,i%2?'#C48C58':'#B57E4C');},
 oyster:(x,y,s)=>{shadow(x+3*s,y+1,9*s,2.5*s,.26);ell3d(x,y-3*s,9*s,4*s,'#C9B8D6');g.fillStyle=lin(y-16*s,y-4*s,[[0,'#F1E6F7'],[1,'#BBA8CC']]);g.beginPath();g.ellipse(x,y-6*s,9*s,8*s,0,Math.PI,0);g.fill();ball3d(x,y-5*s,3.4*s,'#FFFFFF');},
 whale:(x,y,s,f)=>{ell3d(x,y,22*s,7*s,'#4A7BC4');ell3d(x+2*s,y+3*s,16*s,3*s,'#BFD8F5',0);g.fillStyle='#4A7BC4';g.beginPath();g.moveTo(x-20*f*s,y);g.lineTo(x-30*f*s,y-8*s);g.lineTo(x-28*f*s,y+2*s);g.lineTo(x-30*f*s,y+8*s);g.fill();ball3d(x+12*f*s,y-2*s,1.1*s,INK,0);},
 shellHouse:(x,y,s)=>{shadow(x+8*s,y+2,22*s,6*s,.28);g.fillStyle=cyl(x-20*s,x+20*s,'#FFC9B0');g.beginPath();g.moveTo(x-20*s,y);g.quadraticCurveTo(x-18*s,y-34*s,x,y-38*s);g.quadraticCurveTo(x+18*s,y-34*s,x+20*s,y);g.fill();g.strokeStyle='rgba(200,110,90,.4)';g.lineWidth=1.4*s;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(x+i*5*s,y);g.quadraticCurveTo(x+i*2.5*s,y-24*s,x,y-38*s);g.stroke();}g.fillStyle='#7A4E2C';rr(x-4*s,y-12*s,8*s,12*s,4*s);g.fill();},
 ruins:(x,y,s)=>{shadow(x+12*s,y+2,30*s,6*s,.28);box3(x-10*s,y,14*s,18*s,12*s,'#B7B09A','#D2CCB8');box3(x+8*s,y,12*s,10*s,12*s,'#B7B09A','#D2CCB8');tower(x+2*s,y-10*s,s,{r:4,h:22,c:'#C9C2AE'});g.fillStyle='#5FB85A';[[-14,-18],[-6,-18],[10,-10]].forEach(([dx,dy])=>ell3d(x+dx*s,y+dy*s,5*s,2*s,'#5FB85A',0));},
 pumpkin:(x,y,s)=>{shadow(x+3*s,y+1,9*s,2.5*s,.26);[-5,5,0].forEach(dx=>ell3d(x+dx*s,y-6*s,6*s,6*s,'#FF8A1F'));g.fillStyle='#4E9A3A';g.fillRect(x-1*s,y-14*s,2*s,4*s);},
 leaves:(x,y,s)=>{[[-6,'#FF9A4D'],[0,'#D9482B'],[6,'#FFC83D'],[-2,'#FF7A3D']].forEach(([dx,c])=>ell3d(x+dx*s,y-3*s,7*s,3.5*s,c,0));},
 cart:(x,y,s)=>{shadow(x+5*s,y+1,15*s,3.5*s,.28);box3(x,y-6*s,24*s,9*s,10*s,'#B57E4C');[-6,0,6].forEach(dx=>ball3d(x+dx*s,y-16*s,3.6*s,'#E8505B'));ball3d(x-8*s,y-2*s,4*s,'#6B4426',0);ball3d(x+8*s,y-2*s,4*s,'#6B4426',0);},
 caveArch:(x,y,s)=>{shadow(x+10*s,y+3,34*s,8*s,.3);g.fillStyle=lin(y-40*s,y,[[0,'#6A6A84'],[1,'#3A3A50']]);g.beginPath();g.moveTo(x-34*s,y);g.quadraticCurveTo(x-30*s,y-44*s,x,y-46*s);g.quadraticCurveTo(x+30*s,y-44*s,x+34*s,y);g.fill();g.fillStyle='#14141F';g.beginPath();g.moveTo(x-14*s,y);g.quadraticCurveTo(x-12*s,y-24*s,x,y-26*s);g.quadraticCurveTo(x+12*s,y-24*s,x+14*s,y);g.fill();},
 minecart:(x,y,s)=>{g.strokeStyle='#8A8A9A';g.lineWidth=1.4*s;g.beginPath();g.moveTo(x-24*s,y);g.lineTo(x+24*s,y);g.moveTo(x-24*s,y+4*s);g.lineTo(x+24*s,y+4*s);g.stroke();box3(x,y-4*s,20*s,9*s,9*s,'#8A8A9A');[-4,2,7].forEach(dx=>crystal(x+dx*s,y-13*s,.35));ball3d(x-6*s,y-2*s,3*s,'#33323A',0);ball3d(x+6*s,y-2*s,3*s,'#33323A',0);},
 lollipop:(x,y,s)=>{shadow(x+4*s,y+1,8*s,2.5*s,.26);g.fillStyle=cyl(x-1.4*s,x+1.4*s,'#FFFFFF');g.fillRect(x-1.4*s,y-26*s,2.8*s,26*s);ball3d(x,y-32*s,9*s,'#FF5F9E');g.strokeStyle='#FFFFFF';g.lineWidth=2*s;g.beginPath();for(let a=0;a<12;a+=.3){const r=a*.7*s;g.lineTo(x+Math.cos(a)*r,y-32*s+Math.sin(a)*r);}g.stroke();},
 cupcake:(x,y,s)=>{shadow(x+8*s,y+2,22*s,6*s,.28);g.fillStyle=cyl(x-16*s,x+16*s,'#FF9AD5');g.beginPath();g.moveTo(x-16*s,y-18*s);g.lineTo(x-12*s,y);g.lineTo(x+12*s,y);g.lineTo(x+16*s,y-18*s);g.fill();[[-9,-22,8],[9,-22,8],[0,-26,10],[0,-36,7]].forEach(([dx,dy,r])=>ball3d(x+dx*s,y+dy*s,r*s,'#FFF2F8'));ball3d(x,y-45*s,4*s,'#E8505B');g.fillStyle='#7A4E2C';rr(x-4*s,y-12*s,8*s,12*s,4*s);g.fill();},
 gumdrop:(x,y,s,f)=>{shadow(x+3*s,y+1,7*s,2*s,.26);g.save();g.beginPath();g.rect(x-10*s,y-20*s,20*s,20*s);g.clip();ell3d(x,y,7*s,12*s,['#8EE07A','#FFC83D','#7FC4FF','#FF8FB1'][Math.abs(Math.round(x*3))%4]);g.restore();},
 icecream:(x,y,s)=>{shadow(x+3*s,y+1,7*s,2*s,.26);g.fillStyle=cyl(x-6*s,x+6*s,'#E3B572');g.beginPath();g.moveTo(x-6*s,y-16*s);g.lineTo(x,y);g.lineTo(x+6*s,y-16*s);g.fill();ball3d(x,y-19*s,6.5*s,'#FFC1DA');ball3d(x+1*s,y-27*s,5*s,'#9EE7FF');},
 bungalow:(x,y,s)=>{[-12,0,12].forEach(dx=>{g.fillStyle=cyl(x+dx*s-1.4*s,x+dx*s+1.4*s,'#8A5A34');g.fillRect(x+dx*s-1.4*s,y-12*s,2.8*s,14*s);});house(x,y-12*s,s,{w:34,h:16,dep:20,rh:14,wall:'#E9C99B',roof:'#C9933A',straw:1});},
 kayak:(x,y,s)=>{ell3d(x,y,14*s,3*s,'#FFC83D');ball3d(x,y-4*s,3*s,'#FF6B7A',0);g.strokeStyle='#22324F';g.lineWidth=1.2*s;g.beginPath();g.moveTo(x-10*s,y+2*s);g.lineTo(x+10*s,y-10*s);g.stroke();},
 lamp:(x,y,s)=>{g.fillStyle=rad(x,y-30*s,1,26*s,[[0,'rgba(255,220,120,.45)'],[1,'rgba(255,220,120,0)']]);g.beginPath();g.arc(x,y-30*s,26*s,0,7);g.fill();g.fillStyle=cyl(x-1.4*s,x+1.4*s,'#2B3448');g.fillRect(x-1.4*s,y-28*s,2.8*s,28*s);ball3d(x,y-31*s,4*s,'#FFE7A0',0);coneR(x,y-34*s,5*s,4*s,'#2B3448');},
 fountain:(x,y,s)=>{shadow(x+6*s,y+2,22*s,5*s,.25);cylR(x,y,20*s,6*s,'#C9C2B4');g.fillStyle='#5CC8FF';g.beginPath();g.ellipse(x,y-6*s,17*s,5*s,0,0,7);g.fill();cylR(x,y-6*s,3*s,14*s,'#C9C2B4');g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y-20*s);g.quadraticCurveTo(x-10*s,y-26*s,x-12*s,y-8*s);g.moveTo(x,y-20*s);g.quadraticCurveTo(x+10*s,y-26*s,x+12*s,y-8*s);g.stroke();},
 clockTower:(x,y,s)=>{box3(x,y,18*s,52*s,12*s,'#C9C2B4');g.fillStyle='#FFF6D6';g.beginPath();g.arc(x,y-40*s,6*s,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=1.2;g.beginPath();g.moveTo(x,y-40*s);g.lineTo(x,y-44*s);g.moveTo(x,y-40*s);g.lineTo(x+3*s,y-40*s);g.stroke();g.fillStyle='#4A5A75';g.beginPath();g.moveTo(x-11*s,y-52*s);g.lineTo(x+1*s,y-70*s);g.lineTo(x+16*s,y-57*s);g.lineTo(x+9*s,y-52*s);g.fill();},
 townHouse:(x,y,s)=>house(x,y,s,{w:28,h:30,dep:18,rh:14,wall:['#F2C9A0','#BFD8F5','#F7B8CF','#C8E6B0'][Math.abs(Math.round(x))%4],roof:'#4A5A75',lit:1}),
 bench:(x,y,s)=>{shadow(x+4*s,y+1,12*s,2.5*s,.25);box3(x,y-5*s,22*s,2*s,6*s,'#B57E4C');box3(x,y-10*s,22*s,4*s,1.4*s,'#B57E4C',0);},
 crater:(x,y,s)=>{g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(x+3,y+3,26*s,11*s,0,0,7);g.fill();g.fillStyle='#C9D0DA';g.beginPath();g.ellipse(x,y,26*s,11*s,0,0,7);g.fill();g.fillStyle=lin(y-9*s,y+9*s,[[0,'#7F8898'],[1,'#B7BFCC']]);g.beginPath();g.ellipse(x,y+1*s,20*s,8*s,0,0,7);g.fill();},
 rocket:(x,y,s)=>{shadow(x+6*s,y+2,14*s,4*s,.3);g.fillStyle=cyl(x-7*s,x+7*s,'#FFFFFF');g.beginPath();g.moveTo(x-7*s,y-6*s);g.quadraticCurveTo(x-8*s,y-38*s,x,y-52*s);g.quadraticCurveTo(x+8*s,y-38*s,x+7*s,y-6*s);g.fill();g.fillStyle='#E8505B';[[-1],[1]].forEach(([k])=>{g.beginPath();g.moveTo(x+k*6*s,y-18*s);g.lineTo(x+k*13*s,y);g.lineTo(x+k*6*s,y-4*s);g.fill();});ball3d(x,y-30*s,3.6*s,'#7FC4FF');coneR(x,y-40*s,4.4*s,12*s,'#E8505B');},
 observatory:(x,y,s)=>{box3(x,y,30*s,16*s,18*s,'#E4E8EE',0);tower(x+2*s,y-16*s,s,{r:14,h:2,c:'#E4E8EE',dome:'#C9D3DD'});g.fillStyle='#22324F';g.save();g.translate(x+2*s,y-26*s);g.rotate(-.5);g.fillRect(-2*s,-12*s,4*s,12*s);g.restore();},
 alienPlant:(x,y,s)=>{shadow(x+3*s,y+1,8*s,2.5*s,.26);g.strokeStyle='#6EE7B7';g.lineWidth=2.6*s;g.lineCap='round';[[-6,-20],[0,-26],[6,-18]].forEach(([dx,dy])=>{g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*s*1.4,y+dy*s*.5,x+dx*s,y+dy*s);g.stroke();ball3d(x+dx*s,y+dy*s,3.2*s,'#B98CFF',0);});},
 turbine:(x,y,s)=>{shadow(x+6*s,y+2,8*s,2.5*s,.28);g.fillStyle=cyl(x-2.4*s,x+2.4*s,'#FFFFFF');g.beginPath();g.moveTo(x-3*s,y);g.lineTo(x-1.4*s,y-60*s);g.lineTo(x+1.4*s,y-60*s);g.lineTo(x+3*s,y);g.fill();},
 turbFx:(x,y,s,t)=>{g.save();g.translate(x,y-60*s);g.rotate(t*1.6);for(let i=0;i<3;i++){g.rotate(Math.PI*2/3);g.fillStyle=lin(-1.5*s,1.5*s,[[0,'#FFFFFF'],[1,'#C9D3DD']]);g.beginPath();g.moveTo(0,-1.6*s);g.quadraticCurveTo(14*s,-3*s,30*s,0);g.quadraticCurveTo(14*s,2*s,0,1.6*s);g.fill();}g.restore();ball3d(x,y-60*s,2.4*s,'#E4E8EE',0);},
 castle:(x,y,s)=>{shadow(x+16*s,y+3,48*s,9*s,.3);box3(x,y,58*s,24*s,24*s,'#E4E8EE','#F4F6FA');for(let i=-3;i<=3;i++){g.fillStyle='#D2D8E0';g.fillRect(x+i*8*s-2.5*s,y-28*s,5*s,4*s);}g.fillStyle='#4A3A30';g.beginPath();g.moveTo(x-7*s,y);g.lineTo(x-7*s,y-12*s);g.quadraticCurveTo(x,y-19*s,x+7*s,y-12*s);g.lineTo(x+7*s,y);g.fill();[-30,30].forEach(dx=>tower(x+dx*s,y+2*s,s,{r:8,h:40,c:'#E4E8EE',roof:'#5F8FD9',rh:20,win:1}));tower(x+4*s,y-18*s,s,{r:9,h:34,c:'#F0F3F7',roof:'#E8505B',rh:24,win:1});},
 butte:(x,y,s)=>{shadow(x+18*s,y+3,42*s,9*s,.3);const c='#D9784A',w=34*s,h=46*s,tw=24*s;g.fillStyle=sh(c,-.3);g.beginPath();g.moveTo(x+w,y);g.lineTo(x+w+14*s,y-8*s);g.lineTo(x+tw+12*s,y-h-6*s);g.lineTo(x+tw,y-h);g.fill();g.fillStyle=lin(y-h,y,[[0,sh(c,.15)],[1,sh(c,-.1)]]);g.beginPath();g.moveTo(x-w,y);g.lineTo(x-tw,y-h);g.lineTo(x+tw,y-h);g.lineTo(x+w,y);g.fill();g.fillStyle=sh(c,.32);g.beginPath();g.moveTo(x-tw,y-h);g.lineTo(x-tw+12*s,y-h-6*s);g.lineTo(x+tw+12*s,y-h-6*s);g.lineTo(x+tw,y-h);g.fill();g.strokeStyle='rgba(120,50,20,.35)';g.lineWidth=1.4*s;for(let i=1;i<5;i++){const yy=y-h*i/5,k=i/5;g.beginPath();g.moveTo(x-w+(w-tw)*k,yy);g.lineTo(x+w-(w-tw)*k,yy);g.lineTo(x+w-(w-tw)*k+14*s-2*s*k,yy-8*s+2*s*k);g.stroke();}},
 hedge:(x,y,s)=>{shadow(x+6*s,y+1,20*s,4*s,.28);for(let i=-3;i<=3;i++)ball3d(x+i*5*s,y-6*s-(i%2?1:0)*s,6*s,'#4FB548',i%2);},
 flagPole:(x,y,s)=>{g.fillStyle=cyl(x-1*s,x+1*s,'#C9C2B4');g.fillRect(x-1*s,y-40*s,2*s,40*s);shadow(x+3,y+1,5*s,2*s,.25);ball3d(x,y-41*s,1.8*s,'#FFC83D',0);},
 flagFx:(x,y,s,t,c)=>{g.fillStyle=c||'#E8505B';g.beginPath();g.moveTo(x+1*s,y-39*s);for(let i=0;i<=8;i++){const u=i/8;g.lineTo(x+1*s+u*20*s,y-39*s+Math.sin(t*4+u*5)*2.2*s*u);}for(let i=8;i>=0;i--){const u=i/8;g.lineTo(x+1*s+u*20*s,y-29*s+Math.sin(t*4+u*5)*2.2*s*u);}g.fill();},
 trophy:(x,y,s)=>{shadow(x+8*s,y+2,18*s,5*s,.3);box3(x,y,22*s,10*s,12*s,'#5A4A7A');g.fillStyle=cyl(x-3*s,x+3*s,'#FFC83D');g.fillRect(x-3*s,y-22*s,6*s,12*s);g.save();g.beginPath();g.moveTo(x-14*s,y-40*s);g.lineTo(x+14*s,y-40*s);g.quadraticCurveTo(x+13*s,y-22*s,x,y-21*s);g.quadraticCurveTo(x-13*s,y-22*s,x-14*s,y-40*s);g.fillStyle=cyl(x-14*s,x+14*s,'#FFC83D');g.fill();g.restore();g.strokeStyle='#E9A916';g.lineWidth=2.4*s;[-1,1].forEach(k=>{g.beginPath();g.arc(x+k*14*s,y-34*s,5*s,k<0?Math.PI*.5:-Math.PI*.5,k<0?Math.PI*1.5:Math.PI*.5);g.stroke();});},
 goldTree:(x,y,s,f)=>treeRound(x,y,s,['#FFE27A','#E9A916'],f),
 crown:(x,y,s)=>{shadow(x+4*s,y+1,12*s,3*s,.28);g.fillStyle=cyl(x-12*s,x+12*s,'#FFC83D');g.beginPath();g.moveTo(x-12*s,y);g.lineTo(x-13*s,y-16*s);g.lineTo(x-6*s,y-8*s);g.lineTo(x,y-19*s);g.lineTo(x+6*s,y-8*s);g.lineTo(x+13*s,y-16*s);g.lineTo(x+12*s,y);g.fill();[-6,0,6].forEach(dx=>ball3d(x+dx*s,y-4*s,2*s,'#E8505B',0));},
 tinyStatue:(x,y,s)=>{shadow(x+10*s,y+2,22*s,6*s,.3);box3(x,y,30*s,12*s,16*s,'#C9C2B4');const t=y-12*s;[[-9,-6,9],[0,-12,11],[9,-6,9]].forEach(([dx,dy,r])=>ball3d(x+dx*s,t+dy*s,r*s,'#FFE27A'));ell3d(x,t-2*s,16*s,7*s,'#FFE27A');ball3d(x-4*s,t-8*s,1.4*s,INK,0);ball3d(x+4*s,t-8*s,1.4*s,INK,0);},
 podium:(x,y,s)=>{box3(x-14*s,y,14*s,10*s,10*s,'#C9D3DD');box3(x,y,14*s,18*s,10*s,'#FFC83D');box3(x+14*s,y,14*s,7*s,10*s,'#D9895A');},
 coralPlant:(x,y,s)=>{shadow(x+3*s,y+1,9*s,2.5*s,.26);g.strokeStyle='#FF7A85';g.lineCap='round';g.lineWidth=3*s;[[0,-18],[-7,-14],[7,-15],[-4,-22],[4,-24]].forEach(([dx,dy])=>{g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*s*.3,y+dy*s*.6,x+dx*s,y+dy*s);g.stroke();ball3d(x+dx*s,y+dy*s,2.2*s,'#FF9AA3',0);});},
 shell:(x,y,s)=>{shadow(x+2*s,y+1,6*s,2*s,.24);g.fillStyle=lin(y-10*s,y,[[0,'#FFE3D6'],[1,'#F2A98C']]);g.beginPath();g.moveTo(x-7*s,y);g.quadraticCurveTo(x-7*s,y-10*s,x,y-10*s);g.quadraticCurveTo(x+7*s,y-10*s,x+7*s,y);g.closePath();g.fill();g.strokeStyle='rgba(200,110,90,.5)';g.lineWidth=1;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(x,y);g.lineTo(x+i*3*s,y-9*s);g.stroke();}},
 beachBall:(x,y,s)=>{shadow(x+3*s,y+1,7*s,2*s,.26);ball3d(x,y-6*s,6.5*s,'#FFFFFF');g.save();g.beginPath();g.arc(x,y-6*s,6.5*s,0,7);g.clip();['#E8505B','#FFC83D','#5FB8FF'].forEach((c,i)=>{g.fillStyle=c;g.globalAlpha=.85;g.beginPath();g.ellipse(x-3*s+i*3*s,y-6*s,1.6*s,7*s,0,0,7);g.fill();});g.restore();},
 tikiHut:(x,y,s)=>house(x,y,s,{w:30,h:16,dep:18,rh:16,wall:'#C48C58',roof:'#E3B04B',straw:1,log:1}),
 bedouin:(x,y,s)=>{tent(x,y);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x-20,y-2,40,2);},
 lavenderRow:(x,y,s)=>lavender(x,y,56*s),
 hammock:(x,y,s)=>{},
};

// 7.3 (Jose): arbustos, lomos con joroba, ovejas y sauces con la masa unida
function bush(x,y,s,c,n,f){const P=[[[0,0,11]],[[-6,1,8],[6,-1,10]],[[-9,1,8],[0,-4,10],[10,1,8]],[[-11,2,7],[-3,-3,9],[7,-2,9],[13,3,6]]][n%4];
 shadow(x+4*s,y+1,(8+n*4)*s,5*s,.26);blob3d(P.map(([dx,dy,r])=>[x+dx*f*s,y+dy*s-6*s,r*s]),c[0]);
 if(n%4===2){[[-4,-12],[5,-14],[9,-7]].forEach(([dx,dy])=>ball3d(x+dx*f*s,y+dy*s,1.9*s,'#FF7FA8',0));}}
// ======== Camino · motor (mapa grande vertical + mini horizontal), teselas horneadas + sprites animados ========
const CAM={};
const PALS={cream:['#F3E9D4','#EADFC7','#F6EEDD','#E7DCC6','#EFE3CB','#F1E6D1','#A08A70','#B9A386','#D9CBB0','#CBBBA0'],
 sand:['#F8E3B4','#F0D7A0','#FAEAC4','#EDD39A','#F5DDA8','#F7E5BA','#B08A58','#C9A068','#E6C88C','#D9B784'],
 brick:['#EE9F80','#E3906F','#F2AE92','#DD8667','#EA9A7A','#F0A88A','#9A4E3A','#B5604A','#D9805F','#C97A60'],
 grey:['#E3E7EE','#D6DCE5','#EBEEF3','#D0D7E1','#DDE2EA','#E6EAF0','#7F8898','#9AA3B2','#C3CAD5','#B7BFCC'],
 ice:['#EAF8FF','#DCF2FF','#F3FBFF','#D3EEFF','#E3F5FF','#EEF9FF','#7FAFCF','#9CC6E2','#C8E6F7','#BFDDF0'],
 dark:['#8A8AA2','#7E7E96','#9494AA','#76768E','#85859C','#8F8FA6','#3A3A4E','#4A4A60','#6A6A82','#5E5E76'],
 pink:['#FFE6EF','#FFDCE8','#FFEEF4','#FFD3E3','#FFE1EC','#FFEAF1','#C9809A','#DD98B0','#F5C2D4','#EBB4C7'],
 gold:['#FFEDB0','#FFE39A','#FFF2C4','#FADB86','#FFE7A6','#FFEFBC','#B8862A','#D6A23E','#F2CC6A','#E3BD5E']};
// ---------- capas de la vista ----------
let MODE='big',HM=230,LM=60,TOT=750,BS=2;
const TH=512;
let IT=[],SPR=[],FXL=[],SKY=[],MIL=[],SIGNS=[],LVd=[];
let CUR_D=0;
function cross(d,v){return MODE==='big'?[v,yOf(d)]:[LM+d*PX,v];}
function roadXY(d){return MODE==='big'?[xOf(d),yOf(d)]:[LM+d*PX,HM/2];}
function CMAX(){return MODE==='big'?W:HM;}
function rcross(d){return MODE==='big'?xOf(d):HM/2;}
function dayAt(x,y){return MODE==='big'?(yOf(0)-y)/PX:(x-LM)/PX;}
function nrm(d){const a=roadXY(d),b=roadXY(d+.05),l=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/l,(b[0]-a[0])/l];}
// ---------- color del suelo: cada nivel su color, fundido poco a poco ----------
function gAt(d){const L=Math.max(0,Math.min(LVd.length-1,Math.floor(d/30))),t=(d-30*L)/30,T=LVd[L];let c=mix(T.gr[0],T.gr[1],Math.max(0,Math.min(1,t)));
 if(L>0&&t<.14){const p=LVd[L-1].gr[1],k=t/.14;c=mix(p,c,k*k*(3-2*k));}return c;}
grassAt=d=>gAt(d);dOf=()=>CUR_D;
// ---------- ocupación ----------
let BX=[0,0,0,0];
free=(x,y,r,edge)=>{if(!edge){if(MODE==='big'){if(x<r*.4||x>W-r*.4)return false;}else{if(y<r*.6+6||y>HM-r*.15)return false;}}return occ.every(o=>Math.hypot(o[0]-x,(o[1]-y)*1.2)>o[2]+r);};
// ---------- generación ----------
function I(f,n,r,o){return Object.assign({f,n,r},o||{});}
function genAll(){IT=[];SPR=[];FXL=[];SKY=[];MIL=[];SIGNS=[];FLOWS=[];WAVES=[];occ.length=0;FC=0;
 const N=LVd.length;TOT=N*30;
 if(MODE==='big'){H=200+TOT*PX+140;yOf=d=>200+(TOT-d)*PX;} 
 for(let d=-3;d<=TOT+3;d+=.4){const p=roadXY(d);take(p[0],p[1],RW/2+12);}
 for(let L=0;L<N;L++){const d=30*L+2,sd=MODE==='big'?(Math.cos(d/90*Math.PI*4.4+0.5)>0?-1:1):-1;let p=roadXY(d);let x,y;if(MODE==='big'){x=Math.max(70,Math.min(W-70,p[0]+sd*122));y=p[1]-10;}else{x=p[0];y=HM/2-74;}SIGNS.push([x,y,L]);take(x,y-10,MODE==='big'?62:48);}
 for(let d=7;d<TOT;d+=7){const p=roadXY(d);let x,y;if(MODE==='big'){const sd=Math.cos(d/90*Math.PI*4.4+0.5)>0?1:-1;x=p[0]+sd*50;y=p[1];}else{x=p[0];y=HM/2+50;}MIL.push([x,y,d]);take(x,y-8,13);}
 for(let L=0;L<N;L++)genLevel(L);}
function genLevel(L){const T=LVd[L],d0=30*L,d1=d0+30;seed=1000+L*7919;
 const rect=MODE==='big'?[0,yOf(d1),W,yOf(d0)]:[LM+d0*PX,0,LM+d1*PX,HM];
 const mini=MODE!=='big',k=mini?Math.min(1,HM/1020):1;const SAND=[],SEA=[];
 const add=(it)=>{it.seed=Math.floor(rnd()*1e9);it.d=dayAt(it.x,it.y);if(!it.bb){const s=it.s||1,bw=(it.bw||80)*s,bh=(it.bh||130)*s;it.bb=[it.x-bw,it.y-bh,it.x+bw,it.y+26*s];}
  if(it.a&&it.a!=='fx'){SPR.push(it);}else IT.push(it);if(it.fx)FXL.push(it);};
 (T.feats||[]).forEach(F=>{if(F[0]==='coast'&&!(mini&&F[4]==='big'))add(coastItem(F[1],d0+F[2],d0+F[3],SAND,SEA,F[4]||{}));if(F[0]==='river')add(riverCross(d0+F[1],T,F[2]||{}));if(F[0]==='along')add(riverAlong(F[1],d0+F[2],d0+F[3],F[4]||{}));});
 const place=(spec,i)=>{const r=spec.r*(mini?.85:1),sep=spec.sep??(spec.a==='walk'?110:spec.a==='bob'&&!spec.w?120:0);spec._p=spec._p||[];for(let t=0;t<(spec.tries||200);t++){let x,y,edge=false;
   if(spec.w==='sand'||spec.w==='sea'){const P=(spec.w==='sand'?SAND:SEA);if(!P.length)return;const p=P[Math.floor(rnd()*P.length)];x=p[0]+R(-5,5);y=p[1]+R(-5,5);edge=true;if(spec.w==='sea'&&!occFreeSea(x,y,r))continue;}
   else{x=R(rect[0]+r*.5,rect[2]-r*.5);y=R(rect[1]+r*.5,rect[3]-r*.2);}
   if(sep&&spec._p.some(q=>Math.hypot(q[0]-x,q[1]-y)<sep))continue;
   if(spec.w==='sea'||free(x,y,r,edge)){if(spec.w!=='sea')take(x,y,r*(spec.a==='walk'?1.9:1));else SEAT.push([x,y,r]);spec._p.push([x,y]);const s=spec.sc?R(spec.sc[0],spec.sc[1]):1,f=flip();add({x,y,r,s,f,i,a:spec.a,b:spec.b,fx:spec.fx,fn:spec.f,bw:spec.bw,bh:spec.bh,z:spec.z||0});return;}}};
 const SEAT=[];const occFreeSea=(x,y,r)=>SEAT.every(o=>Math.hypot(o[0]-x,o[1]-y)>o[2]+r);
 (T.items||[]).forEach(spec=>{spec._p=[];const n=Math.max(spec.n?1:0,Math.round(spec.n*(mini&&!spec.keep?k:1)));if(mini&&HM<600&&spec.r>40&&!spec.b)return;for(let i=0;i<n;i++)place(spec,i);});
 const TR=T.trees||[];const tw=TR.reduce((a,b)=>a+b[1],0);for(let i=0;i<Math.round((T.nTrees||26)*k);i++){let q=rnd()*tw,tr=TR[0];for(const t of TR){q-=t[1];if(q<=0){tr=t;break;}}place(I(tr[0],1,tr[2]||16,{a:'sway',sc:[.8,1.08]}),i);}
 for(let i=0;i<Math.round((T.nBush||24)*k);i++)place(I((x,y,s,f)=>bush(x,y,s,T.bush,Math.floor(rnd()*4),f),1,13,{sc:[.7,1]}),i);
 for(let i=0;i<Math.round(5*k);i++)place(I((x,y,s)=>rock(x,y,s,T.rock||'#C9C2B4'),1,13,{sc:[.7,1]}),i);
 const sk=T.sky||{},LO=MODE==='big'?-80:rect[0],LN=MODE==='big'?W+160:rect[2]-rect[0];const cl=Math.round((sk.clouds??3)*(mini?.6:1));for(let i=0;i<cl;i++)SKY.push({lo:LO,len:LN,k:'cloud',x:R(rect[0],rect[2]),y:R(rect[1],rect[3]),v:R(4,9)*(rnd()<.5?-1:1),s:R(.75,1.1),p:R(.15,.35)});
 (sk.birds||[]).forEach(([kind,n,c])=>{for(let i=0;i<Math.round(n*(mini?.6:1));i++)SKY.push({lo:LO,len:LN,k:kind,x:R(rect[0],rect[2]),y:R(rect[1],rect[3]),v:R(14,30)*(rnd()<.5?-1:1),s:R(.8,1.1),p:0,c:c?c[i%c.length]:null,ph:R(0,6)});});}
// ---------- costa genérica (sirve en vertical y horizontal) ----------
// 7.3 (Jose): en la mini la orilla queda cerca del camino (como antes) y el mar se alarga hasta el borde
function coastItem(side,d0,d1,SAND,SEA,o){const BL=MODE==='big',gap=BL?62:30,dm=BL?(o.depth||84):58,sw0=BL?46:22,OFF=BL?0:Math.max(0,HM/2-125);
 const dp=d=>{const t=(d-d0)/(d1-d0);if(t<=0||t>=1)return 0;const env=Math.pow(Math.sin(Math.PI*t),.55),u=d*PX;let v=(dm+Math.sin(u/37)*16*(dm/84)+Math.sin(u/13)*5)*env;const lim=(side<0?rcross(d)-RW/2-gap:CMAX()-rcross(d)-RW/2-gap)-OFF;v=Math.max(0,Math.min(v,lim));if(!OFF)return v;const e=Math.max(0,Math.min(1,Math.min(t,1-t)/.2)),es=e*e*(3-2*e);return OFF*es+v;};
 const sw=(d,v)=>Math.min(sw0,v*.6)+Math.sin(d*PX/23)*(sw0/8);const ex=v=>side<0?v:CMAX()-v,E=side<0?-6:CMAX()+6;const ds=[];for(let d=d0-.3;d<=d1+.3;d+=.12)ds.push(d);
 if(OFF>0)for(let d=d0;d<=d1;d+=.6){if(dp(d)<=0)continue;for(let w=20;w<OFF+10;w+=50){const c=cross(d,side<0?w:CMAX()-w);take(c[0],c[1],40);}}
 for(let i=0;i<ds.length;i+=6){const v=dp(ds[i]);if(v>24)WAVES.push({d:ds[i],side,v,c:cross(ds[i],ex(v)),c2:cross(ds[i],ex(Math.max(8,v-22)))});}
 ds.forEach((d,i)=>{const v=dp(d);if(v>8&&i%3==0){const c=cross(d,ex(v*.45));take(c[0],c[1],v*.45);if(v>(MODE==='big'?30:16)){SAND.push(cross(d,ex(v+sw(d,v)*.5)));SEA.push(cross(d,ex(v*.5)));}}});
 const sea=o.sea||['#1679D8','#2FA6F0','#7FDBFF'],sand=o.sand||['#FBEABB','#F4DDA2','#E7C98C'];
 const poly=a=>{g.beginPath();let c=cross(ds[0],E);g.moveTo(c[0],c[1]);ds.forEach(d=>{const v=dp(d);c=v>0?cross(d,ex(v+a(d,v))):cross(d,E);g.lineTo(c[0],c[1]);});c=cross(ds[ds.length-1],E);g.lineTo(c[0],c[1]);g.closePath();};
 const p0=cross(d0,0),p1=cross(d1,CMAX());const bb=[Math.min(p0[0],p1[0])-20,Math.min(p0[1],p1[1])-20,Math.max(p0[0],p1[0])+20,Math.max(p0[1],p1[1])+20];
 return {x:(bb[0]+bb[2])/2,y:(bb[1]+bb[3])/2,bb,b:1,z:-2,fn:()=>{g.save();g.translate(MODE==='big'?(side<0?4:-4):0,MODE==='big'?5:(side<0?4:-4));poly(sw);g.fillStyle='rgba(30,70,40,.22)';g.fill();g.restore();
  poly(sw);g.fillStyle=sand[0];g.fill();for(let i=0;i<140;i++){const d=R(d0,d1),v=dp(d);if(v<14)continue;const c=cross(d,ex(v+R(4,sw(d,v))));g.fillStyle='rgba(200,160,90,.35)';g.beginPath();g.arc(c[0],c[1],1,0,7);g.fill();}
  poly(()=>MODE==='big'?7:4);g.fillStyle=sand[2];g.fill();const e0=cross(d0,side<0?0:CMAX()),e1=cross(d0,side<0?90:CMAX()-90);const sl=g.createLinearGradient(e0[0],e0[1],e1[0],e1[1]);sl.addColorStop(0,sea[0]);sl.addColorStop(.6,sea[1]);sl.addColorStop(1,sea[2]);poly(()=>0);g.fillStyle=sl;g.fill();
  const line=(off,min,lw,a)=>{g.strokeStyle=`rgba(255,255,255,${a})`;g.lineWidth=lw;g.lineJoin='round';g.beginPath();let st=0;ds.forEach(d=>{const v=dp(d);if(v>min){const c=cross(d,ex(v+off+(off<0?Math.sin(d*PX/9)*1.5:0)));st?g.lineTo(c[0],c[1]):g.moveTo(c[0],c[1]);st=1;}});g.stroke();};line(1,2,3.2,.95);line(-7,12,1.6,.45);
  g.lineCap='round';for(let i=0;i<16;i++){const d=R(d0,d1),v=dp(d);if(v<36)continue;const c=cross(d,ex(R(8,v-20)));g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();g.moveTo(c[0]-7,c[1]);g.quadraticCurveTo(c[0],c[1]-4,c[0]+7,c[1]);g.stroke();}}};}
// ---------- río que cruza el camino (con puente) ----------
function riverCross(dR,T,o){const pts=[];const cm=CMAX();for(let v=-10;v<=cm+10;v+=8){const w=Math.sin(v/46)*9+Math.sin(v/17)*3;pts.push(cross(dR+w/PX,v));}
 for(let i=0;i<pts.length;i+=2)take(pts[i][0],pts[i][1],22);FLOWS.push({pts,w:24});const wc=o.water||['#1F7FD6','#3BA8F0','#8FDBFF'];BRIDGES.push([dR,o.lava?'#5A4A4A':null]);
 const band=(a,b,fs)=>{g.fillStyle=fs;g.beginPath();const off=(p,k)=>MODE==='big'?[p[0],p[1]+k]:[p[0]+k,p[1]];pts.forEach((p,i)=>{const q=off(p,a(i));i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);});for(let i=pts.length-1;i>=0;i--){const q=off(pts[i],b(i));g.lineTo(q[0],q[1]);}g.fill();};
 const p0=pts[0],p1=pts[pts.length-1];const bb=[Math.min(p0[0],p1[0])-40,Math.min(p0[1],p1[1])-40,Math.max(p0[0],p1[0])+40,Math.max(p0[1],p1[1])+40];
 return {x:(bb[0]+bb[2])/2,y:(bb[1]+bb[3])/2,bb,b:1,z:-1,fn:()=>{const gc=gAt(dR);band(()=>-17,()=>-12,sh(gc,.2));band(()=>-14,()=>18,sh(gc,-.38));const pa=MODE==='big'?[0,pts[0][1]-14,0,pts[0][1]+14]:[pts[0][0]-14,0,pts[0][0]+14,0];
  const gr=g.createLinearGradient(pa[0],pa[1],pa[2],pa[3]);gr.addColorStop(0,wc[0]);gr.addColorStop(.4,wc[1]);gr.addColorStop(1,wc[2]);band(i=>-11+Math.sin(i)*1.5,i=>15+Math.cos(i)*1.5,gr);
  g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.lineCap='round';for(let i=2;i<pts.length;i+=4){const p=pts[i],j=R(-4,6);g.beginPath();if(MODE==='big'){g.moveTo(p[0],p[1]+j);g.lineTo(p[0]+12,p[1]+j-1);}else{g.moveTo(p[0]+j,p[1]);g.lineTo(p[0]+j-1,p[1]+12);}g.stroke();}}};}
let BRIDGES=[],FLOWS=[],WAVES=[],PONDS=new Map(),LIGHTS=new Map(),LAMPS=new Map();
// lo que se hornea en teselas y se anima encima (estanques, ventanas, farolas): se apunta al hornear
const _pond=pond;pond=function(cx,cy,rx,ry,sb,c1,c2,l){PONDS.set((cx|0)+','+(cy|0),{cx,cy,rx,ry});return _pond(cx,cy,rx,ry,sb,c1,c2,l);};
const _house=house;house=function(x,y,s,o){if(o&&o.lit){const w=(o.w||34)*s,h=(o.h||22)*s;LIGHTS.set((x|0)+','+(y|0),{x:x-w/2+9.5*s,y:y-h+9*s,s});}return _house(x,y,s,o);};
const _lamp=ST.lamp;ST.lamp=(x,y,s)=>{LAMPS.set((x|0)+','+(y|0),{x,y:y-31*s,s});return _lamp(x,y,s);};
// ---------- río que acompaña al camino y luego se va ----------
function riverAlong(side,d0,d1,o){const wc=o.water||['#1F7FD6','#3BA8F0','#8FDBFF'],wd=MODE==='big'?24:14;const ds=[];for(let d=d0;d<=d1;d+=.15)ds.push(d);
 const cc=d=>{const t=(d-d0)/(d1-d0),e=Math.min(1,Math.min(t,1-t)*5),base=RW/2+(MODE==='big'?36:22);const edge=side<0?rcross(d)-8:CMAX()-rcross(d)-8;const off=base+(edge+40-base)*(1-e*e*(3-2*e));return rcross(d)+side*Math.min(off,edge+50);};
 ds.forEach((d,i)=>{if(i%2)return;const c=cross(d,cc(d));take(c[0],c[1],wd*.9);});FLOWS.push({pts:ds.map(d=>cross(d,cc(d))),w:wd,lava:!!o.glow});
 // 7.3: el ancho se mide perpendicular al río (antes, al irse hacia el borde se veía finísimo)
 const CP=ds.map(d=>cross(d,cc(d))),NN=CP.map((p,i)=>{const a=CP[Math.max(0,i-1)],b=CP[Math.min(CP.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;let nx=-dy/l,ny=dx/l;const ref=MODE==='big'?nx:ny;if(ref<0){nx=-nx;ny=-ny;}return [nx,ny];});
 const strip=(a,b)=>{g.beginPath();CP.forEach((p,i)=>{const n=NN[i];i?g.lineTo(p[0]+n[0]*a,p[1]+n[1]*a):g.moveTo(p[0]+n[0]*a,p[1]+n[1]*a);});for(let i=CP.length-1;i>=0;i--){const p=CP[i],n=NN[i];g.lineTo(p[0]+n[0]*b,p[1]+n[1]*b);}g.closePath();};
 const p0=cross(d0,0),p1=cross(d1,CMAX());const bb=[Math.min(p0[0],p1[0])-40,Math.min(p0[1],p1[1])-40,Math.max(p0[0],p1[0])+40,Math.max(p0[1],p1[1])+40];
 return {x:(bb[0]+bb[2])/2,y:(bb[1]+bb[3])/2,bb,b:1,z:-1,fn:()=>{const gc=gAt((d0+d1)/2);strip(-wd/2-5,wd/2+3);g.fillStyle=sh(gc,.18);g.fill();strip(-wd/2-2,wd/2+5);g.fillStyle=sh(gc,-.38);g.fill();strip(-wd/2,wd/2);g.fillStyle=wc[1];g.fill();strip(-wd/2,-wd/2+5);g.fillStyle=wc[0];g.fill();strip(wd/2-6,wd/2);g.fillStyle=wc[2];g.fill();
  if(o.glow){strip(-wd/2,wd/2);g.fillStyle='rgba(255,220,120,.25)';g.fill();}
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.8;g.lineCap='round';for(let i=3;i<ds.length;i+=7){const c=cross(ds[i],cc(ds[i])+R(-4,4)),c2=cross(ds[i]+.25,cc(ds[i]+.25)+R(-4,4));g.beginPath();g.moveTo(c[0],c[1]);g.lineTo(c2[0],c2[1]);g.stroke();}}};}
// ---------- calzada por niveles ----------
function roadDraw(da,db){const pal=d=>PALS[LVd[Math.max(0,Math.min(LVd.length-1,Math.floor(d/30)))].road||'cream'];const pts=[];for(let d=da;d<=db;d+=.2)pts.push([...roadXY(d),d]);
 const pth=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));};g.lineCap='round';g.lineJoin='round';
 g.save();g.translate(MODE==='big'?0:3,MODE==='big'?8:8);pth();g.strokeStyle='rgba(40,60,40,.25)';g.lineWidth=RW+12;g.stroke();g.restore();
 // bordes por tramos (cada nivel su paleta)
 const seg=(lw,ci,dy)=>{for(let i=0;i<pts.length-1;i++){const P=pal(pts[i][2]);g.strokeStyle=P[ci];g.lineWidth=lw;g.beginPath();g.moveTo(pts[i][0],pts[i][1]+dy);g.lineTo(pts[i+1][0],pts[i+1][1]+dy);g.stroke();}};seg(RW+8,6,0);seg(RW+4,7,4);seg(RW,8,0);
 for(let d=Math.ceil(da/.34)*.34;d<=db;d+=.34){const P=pal(d),[x,y]=roadXY(d),[x2,y2]=roadXY(d+.05),a=Math.atan2(y2-y,x2-x),nx=-Math.sin(a),ny=Math.cos(a),row=Math.round(d/.34),cols=4,cw=RW/cols;
  for(let c=0;c<=cols;c++){const off=(c-cols/2)*cw+(row%2?cw/2:0);if(Math.abs(off)>RW/2-cw*.42)continue;const px=x+nx*off,py=y+ny*off,t=((row*7+c*13)%6+6)%6;g.save();g.translate(px,py);g.rotate(a);g.fillStyle=P[t];rr(-5.2,-cw/2+1.1,10.4,cw-2.2,2.4);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(-4.2,-cw/2+1.5,8.4,1.2);g.fillStyle='rgba(120,100,80,.2)';g.fillRect(-4.2,cw/2-2.5,8.4,1.2);g.restore();}}
 for(let d=Math.ceil(da/.3)*.3;d<=db;d+=.3){const [x,y]=roadXY(d),[nx,ny]=nrm(d);[-1,1].forEach(k=>ball3d(x+nx*k*(RW/2+3),y+ny*k*(RW/2+3),3.3,pal(d)[9],0));}
 BRIDGES.forEach(([dR])=>{if(dR<da-1||dR>db+1)return;const [bx,by]=roadXY(dR),[x2,y2]=roadXY(dR+.1),ba=Math.atan2(y2-by,x2-bx);g.save();g.translate(bx,by);g.rotate(ba+Math.PI/2);g.fillStyle='rgba(0,30,60,.3)';rr(-44,-10,92,26,4);g.fill();g.fillStyle='#8A5A34';rr(-46,-13,92,26,4);g.fill();for(let i=-42;i<42;i+=8){g.fillStyle=(i/8)%2?'#D29A62':'#B57E4C';rr(i,-12,7,24,2);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.fillRect(i+1,-11,5,2);}g.fillStyle=cyl(-4,4,'#7A4E2C');rr(-46,-17,92,4,2);g.fill();rr(-46,13,92,4,2);g.fill();g.restore();});}
function signAt(x,y,L){const T=LVd[L],c=T.c,nm=(window.TQ_CAMINO&&TQ_CAMINO.lv&&TQ_CAMINO.lv[L])||T.n;shadow(x+4,y+26,40,6,.25);g.fillStyle=cyl(x-3,x+3,'#8A5A34');rr(x-3,y-4,6,32,2);g.fill();g.save();g.translate(x,y-14);g.fillStyle='rgba(0,0,0,.18)';rr(-60,-20,120,44,14);g.fill();g.fillStyle=sh(c,-.3);rr(-60,-21,120,44,14);g.fill();g.fillStyle=lin(-24,20,[[0,sh(c,.18)],[1,sh(c,-.1)]]);rr(-60,-24,120,42,14);g.fill();g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;rr(-56,-20,112,34,11);g.stroke();
 txt(T_('nivel','NIVEL')+' '+(L+1),0,-11,10.5,'rgba(255,255,255,.92)',900,'center','N');g.font='700 19px F';const w=g.measureText(nm).width;txt(nm,0,4,w>100?19*100/w:19,'#fff',700);g.restore();}
function milAt(x,y,d){shadow(x+3,y+2,8,3,.24);g.fillStyle=lin(y-18,y,[[0,'#F4F1EA'],[1,'#C9C2B4']]);rr(x-7,y-17,14,18,6);g.fill();g.fillStyle='rgba(0,0,0,.12)';rr(x+5,y-15,3,16,2);g.fill();txt('S'+d/7,x,y-8,d>=70?7:8.5,'#6E6656',900,'center','N');}
// ---------- horneado de una tesela ----------
function bakeTile(k){const big=MODE==='big';return bakeRect(big?[0,k*TH,W,(k+1)*TH]:[k*TH,0,(k+1)*TH,HM]);}
function bakeRect(rect,cv,sc){const G0=g;try{return bakeRect2(rect,cv,sc);}finally{g=G0;}} // 7.3: SIEMPRE se devuelve el lienzo de antes (si no, lo siguiente se pintaba DENTRO de la tesela: duplicados y parpadeos)
function bakeRect2(rect,cv,sc){cv=cv||document.createElement('canvas');const big=MODE==='big';const BSx=sc||BS;const tw=rect[2]-rect[0],th=rect[3]-rect[1];cv.width=Math.ceil(tw*BSx);cv.height=Math.ceil(th*BSx);g=cv.getContext('2d');g.scale(BSx,BSx);g.translate(-rect[0],-rect[1]);
 const da=Math.min(dayAt(rect[0],rect[1]),dayAt(rect[2],rect[3]))-3,db=Math.max(dayAt(rect[0],rect[1]),dayAt(rect[2],rect[3]))+3;
 const step=6;if(big){for(let y=rect[1]-step;y<rect[3]+step;y+=step){g.fillStyle=gAt(dayAt(0,y));g.fillRect(rect[0],y,tw,step+.6);}}else{for(let x=rect[0]-step;x<rect[2]+step;x+=step){g.fillStyle=gAt(dayAt(x,0));g.fillRect(x,rect[1],step+.6,th);}}
 const BAND=64,a0=Math.floor(((big?rect[1]:rect[0])-100)/BAND),a1=Math.floor(((big?rect[3]:rect[2])+100)/BAND); // 7.3: margen ancho = sin línea entre teselas
 for(let b=a0;b<=a1;b++){seed=(b*7919+13)>>>0||1;const along=()=>b*BAND+rnd()*BAND,acr=()=>rnd()*(big?W:HM);const P=(u,v)=>big?[v,u]:[u,v];
  for(let i=0;i<2;i++){const [x,y]=P(along(),acr()),r=R(40,90);g.fillStyle=rad(x-r*.3,y-r*.3,1,r,[[0,'rgba(255,255,210,.16)'],[1,'rgba(255,255,210,0)']]);g.beginPath();g.arc(x,y,r,0,7);g.fill();}
  for(let i=0;i<(big?175:130);i++){const [x,y]=P(along(),acr()),c=gAt(dayAt(x,y));g.strokeStyle=rnd()<.5?sh(c,-.12):sh(c,.18);g.lineWidth=1.3;g.lineCap='round';g.beginPath();g.moveTo(x-2,y);g.quadraticCurveTo(x-2.5,y-3,x-3.5,y-5);g.moveTo(x,y);g.lineTo(x,y-6);g.moveTo(x+2,y);g.quadraticCurveTo(x+2.5,y-3,x+3.5,y-5);g.stroke();}
  for(let i=0;i<(big?50:36);i++){const [x,y]=P(along(),acr()),T=LVd[Math.max(0,Math.min(LVd.length-1,Math.floor(dayAt(x,y)/30)))];if(rnd()>(T.fd??.2))continue;const fl=T.fl||['#FFFFFF'];g.fillStyle=fl[i%fl.length];g.beginPath();g.arc(x,y,T.fd>.5?1.9:1.6,0,7);g.fill();}}
 const hit=it=>it.bb[2]>rect[0]&&it.bb[0]<rect[2]&&it.bb[3]>rect[1]&&it.bb[1]<rect[3];
 const run=it=>{seed=it.seed;CUR_D=it.d;g.save();try{it.fn(it.x,it.y,it.s||1,it.f||1,it.i||0);}catch(e){}g.restore();};
 IT.filter(it=>it.b&&hit(it)).sort((a,b)=>(a.z||0)-(b.z||0)||(a.y-b.y)).forEach(run);
 roadDraw(Math.max(-3,da),Math.min(TOT+3,db));
 const st=IT.filter(it=>!it.b&&hit(it));SIGNS.forEach(([x,y,L])=>{const bb=[x-70,y-50,x+70,y+40];if(bb[2]>rect[0]&&bb[0]<rect[2]&&bb[3]>rect[1]&&bb[1]<rect[3])st.push({y:y+20,fn:()=>signAt(x,y,L),seed:1,d:0});});
 MIL.forEach(([x,y,d])=>{if(x>rect[0]-20&&x<rect[2]+20&&y>rect[1]-20&&y<rect[3]+30)st.push({y,fn:()=>milAt(x,y,d),seed:1,d});});
 st.sort((a,b)=>a.y-b.y).forEach(run);return cv;}
// ---------- sprite de un elemento animado ----------
function bakeSprite(it){const G0=g;try{return bakeSprite2(it);}finally{g=G0;}}
function bakeSprite2(it){const cv=document.createElement('canvas'),bb=it.bb;cv.width=Math.ceil((bb[2]-bb[0])*BS);cv.height=Math.ceil((bb[3]-bb[1])*BS);g=cv.getContext('2d');g.scale(BS,BS);g.translate(-bb[0],-bb[1]);seed=it.seed;CUR_D=it.d;try{it.fn(it.x,it.y,it.s||1,it.f||1,it.i||0);}catch(e){}return cv;}
CAM.genAll=genAll;CAM.bakeTile=bakeTile;CAM.bakeSprite=bakeSprite;
// ======== Camino · los 25 niveles (cada uno con su color, suelo, árboles y ~10 elementos propios) ========
const C4=['#FF6B7A','#5FB8FF','#FFC83D','#3CCB5A'];
const TR={palm:[(x,y,s,f)=>palm(x,y,s,f),3,16],round:c=>[(x,y,s,f)=>treeRound(x,y,s*.85,c,f),1,18],pine:c=>[(x,y,s)=>pine(x,y,s,c),3,15],snow:[(x,y,s)=>snowPine(x,y,s),3,15],cyp:c=>[(x,y,s)=>cypress(x,y,s,c),2,10],wil:c=>[(x,y,s)=>willow(x,y,s*.9,c),1,22],
 cactus:[(x,y,s,f)=>cactus(x,y,s,f),2,12],acacia:[(x,y,s,f)=>acacia(x,y,s,f),3,24],bamboo:[(x,y,s)=>bamboo(x,y,s),2,13],cherry:[(x,y,s,f)=>cherry(x,y,s*.85,f),2,18],maple:[(x,y,s,f)=>maple(x,y,s*.85,f),3,18],
 jungle:[(x,y,s,f)=>jungleTree(x,y,s,f),3,20],bare:[(x,y,s,f)=>bareTree(x,y,s,f),1,14],candy:[(x,y,s,f)=>candyTree(x,y,s*.9,f),3,16],gold:[(x,y,s,f)=>treeRound(x,y,s*.85,['#FFE27A','#E9A916'],f),3,18],shroom:[(x,y,s)=>glowShroom(x,y,s*.8,'#B98CFF'),1,14]};
const swayA={a:'sway'},bob={a:'bob'},walk={a:'walk'},sand={w:'sand'},sea={w:'sea',a:'bob'},below={b:1};
const LEVELS=[
{n:'Celeste',c:'#3EA6E8',gr:['#8EDB6A','#86D865'],fl:['#FFFFFF','#FFE27A','#7FC4FF'],road:'cream',bush:['#9BEA6E','#4FB548'],trees:[TR.palm,TR.round(['#9BEA6E','#3FAE3C'])],nTrees:20,
 feats:[['coast',-1,-3,15],['coast',1,18,31]],sky:{clouds:3,birds:[['gull',5]]},
 items:[I((x,y)=>lighthouse(x,y-4,1.05),1,26,{w:'sand',fx:(x,y,s,t)=>beamFx(x,y-4,1.05,t),bh:110,keep:1}),I((x,y)=>boat(x,y,1.05),1,24,{...sea,keep:1}),I((x,y)=>buoy(x,y),2,8,sea),I((x,y,s,f,i)=>umbrella(x,y,1,C4[i%4]),4,14,sand),I((x,y,s,f,i)=>beachHut(x,y,1,['#5FB8FF','#FF8FB1'][i%2]),2,15,sand),
  I((x,y)=>sandcastle(x,y,1),1,16,sand),I((x,y)=>surfboards(x,y),1,14,sand),I((x,y,s,f)=>crab(x,y,f),3,9,{w:'sand',a:'walk'}),I((x,y)=>starfish(x,y,1),6,6,sand),I((x,y)=>ST.beachBall(x,y,1),2,7,sand),I((x,y)=>kite(x,y-30,1),1,12),I((x,y,s,f)=>palm(x,y,s,f),7,16,{w:'sand',a:'sway',sc:[.85,1.05]})]},
{n:'Menta',c:'#17A882',gr:['#7FD6A3','#86DFC0'],fl:['#FFFFFF','#FFE27A','#FF9AD5'],road:'cream',bush:['#8BEFCB','#25A882'],rock:'#B7C9BE',trees:[TR.pine(['#6FE3BC','#16916F']),TR.pine(['#57D3A3','#127A5E']),TR.round(['#8BEFCB','#25A882'])],nTrees:28,
 feats:[['river',10.5]],sky:{clouds:3,birds:[['blue',5,['#5FB8FF','#FF8A3D','#FFD34D']],['fly',3]]},
 items:[I((x,y)=>waterwheel(x,y,1),1,16,{fx:(x,y,s,t)=>wheelFx(x,y-6,1,t),keep:1}),I((x,y)=>cabin(x,y,1.05),1,30,{keep:1}),I((x,y)=>{pond(x,y,50,28,3.1,'#3BA8F0','#1F7FD6',5);},1,48,below),I((x,y,s,f)=>duck(x,y,f),3,8,{a:'bob'}),
  I((x,y)=>{tent(x-8,y);campfire(x+20,y+6);},1,24),I((x,y,s,f)=>deer(x,y,1,f),2,14,walk),I((x,y,s,f)=>fox(x,y,1,f),2,12,walk),I((x,y)=>logPile(x,y,1),3,14),I((x,y,s,f,i)=>mushroom(x,y,s,['#3FCBA0','#FF5F7E','#FFC83D'][i%3]),7,10,{sc:[.9,1.2]}),I((x,y,s,f)=>AN.squirrel(x,y,1,f),2,8,walk)]},
{n:'Lila',c:'#8A63F5',gr:['#B9A6EE','#BFA8F2'],fl:['#8C67E8','#B79CFF','#FFFFFF','#FF9AD5'],fd:1,road:'cream',bush:['#D8C6FF','#9C7BF2'],rock:'#C9B8E6',trees:[TR.cyp(['#B79CFF','#6E4FE6']),TR.wil(['#CDB8FF','#8E6BF0']),TR.round(['#D8C6FF','#8E6BF0'])],nTrees:26,
 sky:{clouds:3,birds:[['butterfly',8],['plane',1]]},
 items:[I((x,y)=>{plateau(x,y,R(92,108),R(32,38),R(28,34));crystal(x-14,y+2,.7);},1,54,below),I((x,y)=>plateau(x,y,R(84,98),R(30,34),R(24,30)),1,52,below),I((x,y)=>windmill(x,y+12,1.2),1,36,{fx:(x,y,s,t)=>bladesFx(x,y+12-44*1.2,1.2,t*.8),keep:1}),
  I((x,y)=>pond(x,y,44,24,4.2,'#9C8CFF','#6B55E0',6),1,46,below),I((x,y)=>lavender(x,y-14,56),2,40,below),I((x,y,s,f,i)=>balloon(x,y,1.1,['#FF8FB1','#FFC83D','#7FC4FF'][i%3]),3,20,{a:'bob',sep:140}),I((x,y)=>wisteria(x,y,1),2,26),I((x,y)=>crystal(x,y,1),5,16,{sc:[.8,1.1]}),
  I((x,y)=>pinwheel(x,y,1),3,8,{fx:(x,y,s,t)=>pinFx(x,y,1,t)}),I((x,y,s,f,i)=>mushroom(x,y,s,'#B98CFF'),4,10),I((x,y,s,f)=>AN.sheep(x,y,1,f),2,12,walk)]},
{n:'Coral',c:'#FF6F61',gr:['#FFB8A0','#FFAA92'],fl:['#FFFFFF','#FFE27A','#FF7FA8'],road:'sand',bush:['#FFB0B8','#E86A7A'],rock:'#E8B8A8',trees:[TR.palm,TR.round(['#FF9AA3','#E0566A'])],nTrees:20,
 feats:[['coast',1,0,16,{sea:['#0E8FB8','#25C2D8','#8FF0F0']}],['coast',-1,15,30,{sea:['#0E8FB8','#25C2D8','#8FF0F0']}]],sky:{clouds:3,birds:[['gull',4]]},
 items:[I((x,y)=>ST.tikiHut(x,y,1),2,22,sand),I((x,y,s,f)=>AN.flamingo(x,y,1,f),4,9,{w:'sand',a:'walk'}),I((x,y,s,f)=>AN.turtle(x,y,1,f),3,10,{w:'sand',a:'walk'}),I((x,y)=>ST.shell(x,y,1),6,6,sand),I((x,y)=>ST.coralPlant(x,y,1),6,10),
  I((x,y)=>ST.beachBall(x,y,1),2,7,sand),I((x,y)=>boat(x,y,1),1,24,sea),I((x,y,s,f,i)=>umbrella(x,y,1,['#FF6F61','#25C2D8'][i%2]),3,14,sand),I((x,y)=>pond(x,y,36,20,5.3,'#25C2D8','#0E8FB8',0),1,38,below),I((x,y,s,f)=>palm(x,y,s,f),6,16,{w:'sand',a:'sway'})]},
{n:'Bronce',c:'#B87333',gr:['#EDC88A','#E3B877'],fl:['#FFFFFF','#FF8FB1'],fd:.08,road:'sand',bush:['#B9C46A','#7E8A3A'],rock:'#D9895A',trees:[TR.cactus,TR.palm],nTrees:18,
 sky:{clouds:2,birds:[['bird',4]]},
 items:[I((x,y)=>ST.butte(x,y,R(.75,1.15)),3,34,{sep:120}),I((x,y)=>rock(x,y,R(1.2,1.8),'#C9784A'),3,18),I((x,y)=>ST.dune(x,y,1),4,46,below),I((x,y)=>ST.pyramid(x,y,1),2,34,{keep:1}),I((x,y)=>ST.arch(x,y,1),1,26),I((x,y,s,f)=>AN.camel(x,y,1,f),3,14,walk),I((x,y)=>ST.amphora(x,y,1),4,7),I((x,y)=>tent(x,y),2,20),
  I((x,y)=>pond(x,y,34,18,2.1,'#3BC8E0','#1C8FC0',2),1,36,below),I((x,y,s,f)=>palm(x,y,s,f),3,16,swayA),I((x,y,s,f)=>cactus(x,y,s,f),6,12,{sc:[.7,1]}),I((x,y)=>rock(x,y,1.4,'#D9895A'),3,18)]},
{n:'Plata',c:'#8FA3BF',gr:['#EEF4FA','#E4EDF6'],fl:['#FFFFFF','#BFE0FF'],fd:.5,road:'grey',bush:['#FFFFFF','#BFD3E6'],rock:'#C9D3DD',trees:[TR.snow,TR.bare],nTrees:28,
 sky:{clouds:4,birds:[['blue',4,['#E8505B','#5FB8FF']],['snow',14]]},
 items:[I((x,y)=>pond(x,y,46,24,1.7,'#CDEBFF','#9FD0F0',0),1,48,below),I((x,y)=>ST.snowman(x,y,1),3,11),I((x,y)=>ST.igloo(x,y,1),2,24),I((x,y,s,f)=>AN.penguin(x,y,1,f),5,8,walk),I((x,y)=>ST.sled(x,y,1),2,13),I((x,y)=>ST.chalet(x,y,1),2,30,{keep:1}),
  I((x,y)=>ST.iceBlock(x,y,.8),2,20),I((x,y,s,f)=>AN.reindeer(x,y,1,f),2,14,walk),I((x,y)=>tower(x,y,1,{r:6,h:24,c:'#FFFFFF',roof:'#E8505B',rh:14}),1,10)]},
{n:'Oro',c:'#E9A916',gr:['#F2D374','#EBC75E'],fl:['#FFFFFF','#E8505B'],fd:.3,road:'sand',bush:['#B5E36B','#5DA83C'],trees:[TR.round(['#B5E36B','#5DA83C']),TR.round(['#FFC83D','#D9822B'])],nTrees:18,
 sky:{clouds:3,birds:[['blue',4,['#FF8A3D','#5FB8FF']]]},
 items:[I((x,y)=>wheat(x,y-8,64),4,40,below),I((x,y)=>ST.barn(x,y,1),1,34,{keep:1}),I((x,y)=>ST.silo(x,y,1),1,14),I((x,y)=>ST.hay(x,y,1),5,13),I((x,y)=>ST.scarecrow(x,y,1),2,12),I((x,y,s,f)=>ST.tractor(x,y,1,f),1,20),
  I((x,y)=>ST.fence(x,y,1),4,18),I((x,y)=>sunflower(x,y,1),8,8),I((x,y,s,f)=>AN.cow(x,y,1,f),3,15,walk),I((x,y,s,f)=>AN.sheep(x,y,1,f),3,12,walk),I((x,y)=>windmill(x,y+12,1),1,30,{fx:(x,y,s,t)=>bladesFx(x,y+12-44,1,t*.8,4,'#E9D2AE')})]},
{n:'Jade',c:'#00A86B',gr:['#82D4AB','#76CA9F'],fl:['#FFC1DA','#FFFFFF'],road:'grey',bush:['#7FD98A','#2E9A55'],trees:[TR.cherry,TR.bamboo,TR.pine(['#4FB98A','#1E7A55'])],nTrees:24,
 feats:[['along',1,4,24,{}]],sky:{clouds:3,birds:[['gull',3],['petal',12]]},
 items:[I((x,y)=>ST.pagoda(x,y,1.1),1,32,{keep:1}),I((x,y)=>ST.torii(x,y,1),2,22),I((x,y)=>ST.redBridge(x,y,1),1,30),I((x,y)=>ST.lantern(x,y,1),4,8),I((x,y)=>ST.rockGarden(x,y,1),1,36,below),
  I((x,y)=>{pond(x,y,40,22,6.2,'#4FC3F7','#1E88E5',4);for(let i=0;i<4;i++){const kx=x+R(-24,24),ky=y+R(-8,10);ell3d(kx,ky,5,2.4,i%2?'#FF8A3D':'#FFFFFF',0);}},1,42,below),I((x,y)=>bamboo(x,y,1),4,13),I((x,y)=>rock(x,y,1.2,'#9A938A'),3,14)]},
{n:'Zafiro',c:'#2F6FD6',gr:['#8FCBEF','#82BEEA'],fl:['#FFFFFF','#3E7BFA','#FFE27A'],fd:.3,road:'grey',bush:['#7FC9E6','#3C8FBF'],rock:'#9FB3CC',trees:[TR.pine(['#6FC4D6','#2A7F9A']),TR.round(['#8FD4E8','#3C8FBF'])],nTrees:24,
 feats:[['along',-1,3,26,{}]],sky:{clouds:4,birds:[['blue',5,['#FFFFFF','#FFD34D']]]},
 items:[I((x,y)=>ST.mountain(x,y,1),3,50,{keep:1}),I((x,y)=>ST.waterfall(x,y,1),1,40),I((x,y)=>pond(x,y,46,26,7.1,'#3E7BFA','#1C4FC0',0),1,48,below),I((x,y)=>ST.chalet(x,y,1),1,30),I((x,y,s,f)=>AN.goat(x,y,1,f),3,12,walk),
  I((x,y)=>{boat(x,y,.7);},0,20,sea),I((x,y)=>tower(x,y,1,{r:7,h:30,c:'#E4E8EE',roof:'#2F6FD6',rh:16,win:1}),1,12),I((x,y,s,f)=>AN.sheep(x,y,1,f),2,12,walk)]},
{n:'Amatista',c:'#9966CC',gr:['#9273D6','#8565CC'],fl:['#FFE27A','#C9B3FF','#FFFFFF'],fd:.5,road:'cream',bush:['#B79CFF','#6E4FE6'],rock:'#7E6AA8',trees:[TR.shroom,TR.cyp(['#C9B3FF','#5A3FD0']),TR.wil(['#B79CFF','#6E4FE6'])],nTrees:24,
 sky:{clouds:2,birds:[['firefly',22],['butterfly',4]]},
 items:[I((x,y)=>ST.magicTower(x,y,1),1,22,{keep:1}),I((x,y)=>crystal(x,y,1.6),4,22),I((x,y,s,f)=>glowShroom(x,y,1,['#FF9AD5','#7FE0FF','#FFE27A'][Math.abs(Math.round(x))%3]),5,16),I((x,y,s,f)=>AN.owl(x,y-6,1,f),3,8),I((x,y)=>ST.lamp(x,y,1),4,9),
  I((x,y)=>{pond(x,y,40,22,8.3,'#6B55E0','#3A2A9A',3);ball3d(x+10,y-4,6,'#FFF6D6',0);},1,42,below),I((x,y,s,f)=>fox(x,y,1,f),2,12,walk)]},
{n:'Rubí',c:'#E0115F',gr:['#EB8E82','#E27A6E'],fl:['#FFE27A','#FF8A3D'],fd:.15,road:'brick',bush:['#FF9A7A','#C9483B'],rock:'#A0524A',trees:[TR.bare,TR.round(['#FF8A6A','#B83A30']),TR.cactus],nTrees:16,
 feats:[['along',1,5,25,{water:['#E83A1A','#FF7A1D','#FFD34D'],glow:1}]],sky:{clouds:3,birds:[['bird',4]]},
 items:[I((x,y)=>ST.volcano(x,y,1),2,50,{keep:1,fx:(x,y,s,t)=>{for(let i=0;i<4;i++){const k=(t*.25+i/4)%1;g.fillStyle=`rgba(120,110,120,${.45*(1-k)})`;g.beginPath();g.arc(x+Math.sin(k*5+i)*6,y-58-k*50,6+k*12,0,7);g.fill();}}}),I((x,y)=>rock(x,y,1.5,'#A0524A'),6,18),I((x,y)=>crystal(x,y,1.1),3,14),
  I((x,y)=>ST.arch(x,y,1),1,26),I((x,y)=>ST.geyser(x,y,1),2,20,{b:1,fx:(x,y,s,t)=>{const k=(Math.sin(t*1.3+x)+1)/2;g.fillStyle=`rgba(230,246,255,${.6*k})`;rr(x-3,y-30*k,6,30*k,3);g.fill();}}),I((x,y,s,f)=>AN.goat(x,y,1,f),2,12,walk)]},
{n:'Topacio',c:'#FFB300',gr:['#F6C47C','#EEB86A'],fl:['#FFFFFF','#E8505B'],fd:.1,road:'sand',bush:['#C9C46A','#8A8A3A'],rock:'#C9A070',trees:[TR.acacia],nTrees:14,
 sky:{clouds:2,birds:[['bird',5],['plane',1]]},
 items:[I((x,y)=>ST.butte(x,y,R(.75,1.15)),3,34,{sep:120}),I((x,y)=>rock(x,y,R(1.2,1.8),'#C9784A'),3,18),I((x,y,s,f)=>AN.giraffe(x,y,1,f),3,14,walk),I((x,y,s,f)=>AN.elephant(x,y,1,f),2,18,walk),I((x,y,s,f)=>AN.zebra(x,y,1,f),3,13,walk),I((x,y)=>ST.termite(x,y,1),3,12),I((x,y,s,f)=>ST.jeep(x,y,1,f),1,22),
  I((x,y)=>pond(x,y,40,20,9.2,'#5BB8E0','#2A7FB0',0),1,42,below),I((x,y)=>ST.bedouin(x,y,1),1,20),I((x,y)=>rock(x,y,1.3,'#C9A070'),3,16)]},
{n:'Diamante',c:'#4FC3F7',gr:['#DFF5FF','#D2EFFF'],fl:['#FFFFFF','#9EE7FF'],fd:.5,road:'ice',bush:['#E6F6FF','#9CC6E2'],rock:'#BFD8EE',trees:[TR.snow],nTrees:18,
 feats:[['coast',1,3,26,{sea:['#0B3D7A','#1A6FB8','#5FB8F0'],sand:['#FFFFFF','#EAF6FF','#CDE6F7']}]],sky:{clouds:3,birds:[['snow',16],['aurora',1]]},
 items:[I((x,y)=>ST.iceCastle(x,y,1),1,34,{keep:1}),I((x,y)=>ST.iceBlock(x,y,1),4,20),I((x,y,s,f)=>AN.seal(x,y,1,f),3,12,{w:'sand',a:'walk'}),I((x,y,s,f)=>AN.bear(x,y,1,f),2,15,walk),I((x,y,s,f)=>AN.penguin(x,y,1,f),4,8,{w:'sand',a:'walk'}),
  I((x,y)=>crystal(x,y,1.4),3,18),I((x,y)=>ST.igloo(x,y,1),1,24),I((x,y)=>ST.iceBlock(x,y,.6),2,14,sea)]},
{n:'Ópalo',c:'#B39DDB',gr:['#F4E6FA','#EADCF6'],fl:['#FFC1DA','#9EE7FF','#FFE27A'],fd:.4,road:'pink',bush:['#FFD6E7','#C9A0DC'],trees:[TR.round(['#FFD6E7','#C98FB8']),TR.round(['#C9F2FF','#7FBCE0'])],nTrees:16,
 sky:{clouds:7,birds:[['balloon',3],['plane',1]]},
 items:[I((x,y)=>ST.island(x,y-20,1),5,30,{a:'bob',sep:130}),I((x,y)=>ST.airship(x,y,1),1,26,bob),I((x,y,s,f,i)=>balloon(x,y,1.1,['#FF8FB1','#FFC83D','#7FC4FF','#B79CFF'][i%4]),4,20,{a:'bob',sep:140}),I((x,y)=>pinwheel(x,y,1),4,8,{fx:(x,y,s,t)=>pinFx(x,y,1,t)}),
  I((x,y)=>kite(x,y-30,1),2,12),I((x,y)=>crystal(x,y,1),3,14),I((x,y)=>ST.fountain(x,y,1),1,22)]},
{n:'Perla',c:'#A89A88',gr:['#F2EEE6','#EDE6D9'],fl:['#FFFFFF','#BFE0FF','#FFC1DA'],road:'cream',bush:['#C8E6B0','#7FB86A'],trees:[TR.palm],nTrees:16,
 feats:[['coast',-1,1,14,{sea:['#2A6FB0','#4FA8E0','#BFEAFF']}],['coast',1,16,29,{sea:['#2A6FB0','#4FA8E0','#BFEAFF']}]],sky:{clouds:3,birds:[['gull',5]]},
 items:[I((x,y)=>ST.oyster(x,y,1),6,10,sand),I((x,y,s,f)=>ST.whale(x,y,1,f),1,30,{w:'sea',a:'bob',keep:1}),I((x,y)=>ST.pier(x,y,1),1,16,sand),I((x,y)=>ST.shellHouse(x,y,1),2,24,sand),I((x,y)=>boat(x,y,1),1,24,sea),I((x,y)=>ST.shell(x,y,1),8,6,sand),
  I((x,y,s,f,i)=>umbrella(x,y,1,['#5FB8FF','#FFC83D'][i%2]),2,14,sand),I((x,y,s,f)=>crab(x,y,f),3,9,{w:'sand',a:'walk'}),I((x,y,s,f)=>palm(x,y,s,f),5,16,{w:'sand',a:'sway'})]},
{n:'Esmeralda',c:'#009B77',gr:['#3FCB8C','#36BF80'],fl:['#FF5F7E','#FFC83D','#FFFFFF'],fd:.3,road:'grey',bush:['#5FD98A','#1E8A55'],rock:'#8FA08A',trees:[TR.jungle,TR.palm,TR.round(['#5FD98A','#1E8A55'])],nTrees:30,
 feats:[['river',8],['along',-1,14,29,{}]],sky:{clouds:2,birds:[['blue',6,['#FF5F7E','#FFC83D','#3CCB5A']]]},
 items:[I((x,y)=>ST.waterfall(x,y,1),1,40,{keep:1}),I((x,y)=>ST.ruins(x,y,1),2,28),I((x,y,s,f)=>AN.toucan(x,y-6,1,f),4,7),I((x,y,s,f)=>AN.monkey(x,y,1,f),3,8,walk),I((x,y)=>pond(x,y,38,20,10.1,'#2FB89A','#167A66',4),1,40,below),
  I((x,y,s,f,i)=>mushroom(x,y,s,'#FF5F7E'),4,10),I((x,y)=>ST.amphora(x,y,1),2,7)]},
{n:'Ámbar',c:'#E08A00',gr:['#F2B466','#EBA352'],fl:['#FF7A3D','#FFE27A','#D9482B'],fd:.5,road:'brick',bush:['#FFB45A','#C9622B'],rock:'#B89A7A',trees:[TR.maple,TR.round(['#FFC83D','#D9822B']),TR.pine(['#9AC46A','#4E7A3A'])],nTrees:24,
 sky:{clouds:3,birds:[['leaf',14],['blue',3,['#FF8A3D']]]},
 items:[I((x,y)=>ST.butte(x,y,R(.75,1.15)),3,34,{sep:120}),I((x,y)=>rock(x,y,R(1.2,1.8),'#C9784A'),3,18),I((x,y)=>ST.pumpkin(x,y,1),6,9),I((x,y,s,f)=>AN.squirrel(x,y,1,f),4,8,walk),I((x,y)=>ST.leaves(x,y,1),6,9),I((x,y)=>house(x,y,1,{w:32,h:22,dep:22,rh:16,wall:'#F2D8B0',roof:'#B5482B',chim:1,lit:1}),2,28,{keep:1}),
  I((x,y)=>ST.cart(x,y,1),1,16),I((x,y)=>ST.hay(x,y,1),2,13),I((x,y)=>ST.fence(x,y,1),3,18),I((x,y)=>ST.lamp(x,y,1),2,9)]},
{n:'Obsidiana',c:'#3D3D55',gr:['#5E5E7A','#52526C'],fl:['#B98CFF','#7FC4FF'],fd:.35,road:'dark',bush:['#6A6A8E','#3A3A52'],rock:'#3A3A50',trees:[TR.shroom,TR.bare,TR.cyp(['#6A6A8E','#2A2A40'])],nTrees:18,
 feats:[['along',1,4,24,{water:['#1A6FB8','#3FC8F0','#BFF2FF'],glow:0}]],sky:{clouds:1,birds:[['bat',6],['firefly',14]]},
 items:[I((x,y)=>ST.caveArch(x,y,1),2,36,{keep:1}),I((x,y)=>ST.minecart(x,y,1),1,24),I((x,y)=>crystal(x,y,1.6),5,22),I((x,y,s,f)=>glowShroom(x,y,1,'#7FE0FF'),4,16),I((x,y)=>rock(x,y,1.5,'#3A3A50'),5,18),I((x,y)=>ST.lamp(x,y,1),3,9)]},
{n:'Cuarzo rosa',c:'#F06292',gr:['#F8BCD2','#F5AECA'],fl:['#FFFFFF','#FFE27A','#9EE7FF'],fd:.5,road:'pink',bush:['#FFD6E7','#F48FB1'],rock:'#F2C9D9',trees:[TR.candy,TR.cherry],nTrees:24,
 sky:{clouds:5,birds:[['balloon',3],['butterfly',5]]},
 items:[I((x,y)=>ST.lollipop(x,y,1),6,10),I((x,y)=>ST.cupcake(x,y,1),2,24,{keep:1}),I((x,y)=>ST.gumdrop(x,y,1),8,7),I((x,y)=>ST.icecream(x,y,1),4,8),I((x,y)=>pond(x,y,40,22,11.3,'#A0623A','#6B3A1E',0),1,42,below),
  I((x,y,s,f,i)=>balloon(x,y,1,['#FF8FB1','#9EE7FF'][i%2]),2,20,{a:'bob',sep:140})]},
{n:'Turquesa',c:'#1FB5A8',gr:['#86E2D8','#76D8CC'],fl:['#FFFFFF','#FF9AD5'],road:'sand',bush:['#7FE0B8','#2AA88A'],trees:[TR.palm,TR.round(['#7FE0B8','#2AA88A'])],nTrees:20,
 feats:[['coast',-1,0,29,{sea:['#0E8FA0','#2FD0C8','#B8FFF4'],depth:96}]],sky:{clouds:3,birds:[['gull',5]]},
 items:[I((x,y)=>ST.bungalow(x,y,1),3,24,{w:'sea',keep:1}),I((x,y)=>ST.kayak(x,y,1),2,14,sea),I((x,y)=>boat(x,y,1),1,24,sea),I((x,y,s,f)=>palm(x,y,s,f),6,16,{w:'sand',a:'sway'}),I((x,y,s,f,i)=>umbrella(x,y,1,['#1FB5A8','#FF8FB1'][i%2]),2,14,sand),
  I((x,y,s,f)=>AN.flamingo(x,y,1,f),2,9,{w:'sand',a:'walk'}),I((x,y,s,f)=>AN.turtle(x,y,1,f),2,10,{w:'sand',a:'walk'}),I((x,y)=>ST.pier(x,y,1),1,16,sand)]},
{n:'Ónix',c:'#4A5160',gr:['#747C8C','#697182'],fl:['#FFE27A'],fd:.2,road:'grey',bush:['#6FA88A','#3A6A55'],rock:'#5E6470',trees:[TR.round(['#6FA88A','#3A6A55']),TR.cyp(['#5F8F7A','#2A4A3A'])],nTrees:16,
 sky:{clouds:2,birds:[['firefly',10],['plane',1]]},
 items:[I((x,y)=>ST.townHouse(x,y,1),8,22),I((x,y)=>ST.clockTower(x,y,1),1,20,{keep:1}),I((x,y)=>ST.fountain(x,y,1),1,22),I((x,y)=>ST.lamp(x,y,1),8,9),I((x,y)=>ST.bench(x,y,1),4,12),I((x,y,s,f)=>AN.cat(x,y,1,f),3,8,walk),I((x,y)=>ST.hedge(x,y,1),3,18)]},
{n:'Titanio',c:'#6E7A8A',gr:['#BAC3D0','#ADB7C6'],fl:['#FFFFFF'],fd:.15,road:'grey',bush:['#B98CFF','#6E4FE6'],rock:'#8A93A3',trees:[[(x,y,s)=>ST.alienPlant(x,y,s),1,10]],nTrees:12,
 sky:{clouds:0,birds:[['planet',2],['star',18]]},
 items:[I((x,y)=>ST.crater(x,y,1),8,26,below),I((x,y)=>ST.rocket(x,y,1),2,16,{keep:1,a:'rocket',sep:140,bh:90}),I((x,y)=>ST.observatory(x,y,1),1,26),I((x,y)=>ST.alienPlant(x,y,1),6,10),I((x,y)=>crystal(x,y,1.1),3,14),I((x,y)=>rock(x,y,1.3,'#8A93A3'),4,16)]},
{n:'Iridio',c:'#5C6BC0',gr:['#AEC2F0','#A0B6EA'],fl:['#FFFFFF','#9EE7FF'],fd:.4,road:'ice',bush:['#DDE8FF','#8FA6E8'],rock:'#9FB0D6',trees:[TR.snow,TR.pine(['#7FB3D6','#3A6A9A'])],nTrees:24,
 sky:{clouds:2,birds:[['aurora',1],['snow',10]]},
 items:[I((x,y)=>ST.turbine(x,y,1),4,12,{fx:(x,y,s,t,i)=>ST.turbFx(x,y,1,t*0.8+i*1.3),sep:90}),I((x,y,s,f)=>AN.reindeer(x,y,1,f),4,14,walk),I((x,y)=>ST.chalet(x,y,1),2,30,{keep:1}),I((x,y)=>ST.igloo(x,y,1),1,24),I((x,y)=>ST.sled(x,y,1),1,13),I((x,y)=>pond(x,y,40,22,12.1,'#CDEBFF','#8FC0F0',0),1,42,below)]},
{n:'Platino',c:'#7E8BA3',gr:['#CFE8B8','#C3DFAA'],fl:['#FFFFFF','#FF9AD5','#FFE27A'],fd:.35,road:'grey',bush:['#7BD86A','#3A9A3A'],trees:[TR.round(['#7BD86A','#3A9A3A']),TR.cyp(['#5FB85A','#2A7A3A'])],nTrees:20,
 sky:{clouds:4,birds:[['blue',4,['#FFFFFF']],['balloon',2]]},
 items:[I((x,y)=>ST.castle(x,y,1.1),1,50,{keep:1}),I((x,y)=>ST.hedge(x,y,1),6,18),I((x,y)=>ST.fountain(x,y,1),2,22),I((x,y)=>ST.flagPole(x,y,1),4,8,{fx:(x,y,s,t,i)=>ST.flagFx(x,y,1,t+i,['#E8505B','#5F8FD9','#FFC83D'][i%3])}),I((x,y)=>ST.townHouse(x,y,1),3,22),I((x,y)=>ST.lamp(x,y,1),4,9),I((x,y,s,f)=>quad(x,y,1,{b:'#A8774C',ear:1,tail:1,neck:9,h:11},f),2,14,walk)]},
{n:'Leyenda',c:'#E9A916',gr:['#FFDA73','#FFD15A'],fl:['#FFFFFF','#E8505B','#7FC4FF'],fd:.4,road:'gold',bush:['#FFE27A','#E9A916'],rock:'#E3BD5E',trees:[TR.gold,TR.cyp(['#FFE27A','#C98A16'])],nTrees:24,
 sky:{clouds:3,birds:[['firework',6],['balloon',3]]},
 items:[I((x,y)=>ST.castle(x,y,1.1),1,50,{keep:1}),I((x,y)=>ST.trophy(x,y,1),1,20,{keep:1}),I((x,y)=>ST.tinyStatue(x,y,1),1,24,{keep:1}),I((x,y)=>ST.podium(x,y,1),1,24),I((x,y)=>ST.crown(x,y,1),3,12),
  I((x,y)=>ST.flagPole(x,y,1),5,8,{fx:(x,y,s,t,i)=>ST.flagFx(x,y,1,t+i,['#E8505B','#7A5AF8','#3CCB5A'][i%3])}),I((x,y)=>ST.fountain(x,y,1),1,22),I((x,y,s,f,i)=>balloon(x,y,1,['#FF8FB1','#7FC4FF'][i%2]),3,20,{a:'bob',sep:140})]}];
// ======== Camino · vista, animación, gestos, burbujas y puente con la app ========
let CFG=window.TQ_CAMINO||{};let TRX=CFG.tr||{};
function T_(k,d,a){let s=TRX[k]||d;if(a!==undefined)s=s.replace('{a}',a);return s;}
function send(m){try{if(window.TQBridge)TQBridge.postMessage(m);else if(window.parent&&window.parent.__tqFrameBridge)window.parent.__tqFrameBridge(window.frameElement?window.frameElement.id:'',m);}catch(e){}}
function defPrizes(){const P=[];const add=(d,k,t,sub,o)=>P.push(Object.assign({d,k,t,sub,id:k+d},o||{}));
 for(let d=14;d<=750;d+=14)add(d,'shield',T_('escudo','Escudo'),T_('escudoSub','Salva tu racha un día malo.'));
 [[45,'1 día'],[95,'2 días'],[165,'3 días'],[235,'4 días'],[310,'5 días'],[380,'6 días'],[455,'1 semana'],[525,'2 semanas'],[595,'1 mes'],[665,'2 semanas'],[710,'1 mes']].forEach(([d,t])=>add(d,'prem',t+' Premium','Todo desbloqueado.',{dur:t}));
 [[20,'Gorro de lana'],[70,'Bufanda'],[140,'Gorro con pompón'],[215,'Gafas de corazón'],[285,'Capa de héroe'],[355,'Auriculares'],[430,'Sombrero vaquero'],[500,'Pajarita'],[575,'Mochila cohete'],[640,'Antifaz']].forEach(([d,t])=>add(d,'acc',t,'Ropa nueva para Tiny.'));
 [[115,'Bali'],[190,'Costa Rica'],[260,'Alpes'],[335,'Selva con lluvia'],[405,'Oasis'],[475,'Nueva York'],[545,'Gran Cañón'],[615,'Alta mar'],[695,'Arrecife']].forEach(([d,t])=>add(d,'bg','Fondo: '+t,'Un cielo nuevo para tu app.'));
 [[35,'Lofi alegre'],[55,'Meditación'],[85,'Curiosidad'],[125,'Piano suave'],[250,'Guitarra']].forEach(([d,t])=>add(d,'music',t,'Música nueva para tu armario.'));
 [[7,'Bola de fútbol'],[50,'Bola España'],[160,'Bola arcoíris'],[300,'Bola galaxia'],[420,'Bola Tiny']].forEach(([d,t])=>add(d,'ball',t,'Para el golf y el minigolf.'));
 add(77,'amb','Sonido: Olas','Ambiente para meditar.');add(365,'crown','Corona de plata','Un año entero. Enorme.');add(730,'crown','Corona de oro','Dos años. Leyenda.');return P;}
TODAY=CFG.today??18;
let PRZ=(CFG.prizes||defPrizes()).slice().sort((a,b)=>a.d-b.d);
RING.crown='#E9A916';
const _icon2=icon;icon=function(kind,x,y,k){if(kind==='crown'){g.save();g.translate(x,y+6*k);ST.crown(0,0,k*.95);g.restore();return;}_icon2(kind,x,y,k);};
function layoutPrizes(){let prev=-9;PRZ.forEach(p=>{p.pos=Math.max(p.d,prev+2.3);prev=p.pos;const q=roadXY(p.pos);p.x=q[0];p.y=q[1];p.done=p.done??p.d<=TODAY;});}
function drawStation(p){const x=p.x,y=p.y,r=21,kind=p.k,done=p.done;g.fillStyle='rgba(60,50,40,.28)';g.beginPath();g.ellipse(x+3,y+10,r+7,9,0,0,7);g.fill();g.fillStyle=lin(y-r,y+r+6,[[0,'#FFFFFF'],[1,'#DDE4EE']]);g.beginPath();g.arc(x,y-4,r,0,7);g.fill();
 g.fillStyle=sh(RING[kind]||INK,-.15);g.beginPath();g.arc(x,y+1,r-1,0,Math.PI);g.fill();g.fillStyle=kind==='prem'?lin(y-r-4,y+r,[[0,'#FFF6D6'],[1,'#FFE08A']]):lin(y-r-4,y+r,[[0,'#FFFFFF'],[1,'#F1F5FB']]);g.beginPath();g.arc(x,y-5,r-2,0,7);g.fill();g.lineWidth=3.4;g.strokeStyle=RING[kind]||INK;g.beginPath();g.arc(x,y-5,r-3.6,0,7);g.stroke();icon(kind,x,y-5,.9);
 g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(x-7,y-16,5,2.4,-.5,0,7);g.fill();if(done){ball3d(x+14,y-19,7.5,'#3CCB5A',0);g.strokeStyle='#fff';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x+10.5,y-19);g.lineTo(x+13,y-16.5);g.lineTo(x+17.5,y-21.5);g.stroke();}
 const t=T_('dia','Día {a}',p.d);g.font='900 9.5px N';const w=g.measureText(t).width+10;rr(x-w/2,y+14,w,14,7);g.fillStyle=done?'#3CCB5A':(kind==='prem'?'#E9A916':INK);g.fill();txt(t,x,y+21.5,9.5,'#fff',900,'center','N');}
// ---------- estado de la vista ----------
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let DPR=Math.min(2.5,window.devicePixelRatio||1),vw=0,vh=0,z=1,zb=1,cx=0,cy=0,vx=0,vy=0,t0=performance.now(),span=CFG.span||14;
const TILES=new Map();const SPC=new Map();const STC=new Map();let tinyC=null;
function resize(){vw=innerWidth;vh=innerHeight;cv.width=vw*DPR;cv.height=vh*DPR;cv.style.width=vw+'px';cv.style.height=vh+'px';
 if(MODE==='big'){zb=vw/W;BS=Math.min(3,DPR*zb*1.25);if(!z||z<zb)z=zb;}else{z=vw/((span+2)*PX);zb=z;BS=Math.min(2.5,DPR*z*1.15);TILES.clear();SPC.clear();STC.clear();tinyC=null;}clamp();}
function clamp(){if(MODE==='big'){const hw=vw/2/z,hh=vh/2/z;cx=W*z<=vw?W/2:Math.max(hw,Math.min(W-hw,cx));cy=Math.max(yOf(TOT+3)+hh-40,Math.min(yOf(-3)-hh+40,cy));}else{cy=HM/2;const hw=vw/2/z;cx=Math.max(LM-20+hw,Math.min(LM+TOT*PX+20-hw,cx));}}
function centerToday(){const q=roadXY(TODAY);cx=q[0];cy=MODE==='big'?q[1]-vh*.06/z:HM/2;clamp();}
function tileKeys(){const big=MODE==='big';const a=big?cy-vh/2/z:cx-vw/2/z,b=big?cy+vh/2/z:cx+vw/2/z;const k0=Math.floor(a/TH),k1=Math.floor(b/TH);const r=[];for(let k=k0;k<=k1;k++)r.push(k);return r;}
let baking=0;
let TCAP=12,SCAP=400;
function getTile(k,force){let c=TILES.get(k);if(c){TILES.delete(k);TILES.set(k,c);return c;}if(!force&&baking>0)return null;baking++;c=bakeTile(k);TILES.set(k,c);while(TILES.size>TCAP)TILES.delete(TILES.keys().next().value);return c;}
let sprBudget=0;function spr(it){let c=SPC.get(it);if(c){SPC.delete(it);SPC.set(it,c);return c;}if(sprBudget<=0&&SPC.size)return null;sprBudget--;c=bakeSprite(it);SPC.set(it,c);while(SPC.size>SCAP)SPC.delete(SPC.keys().next().value);return c;}
function stSpr(p){const key=p.id+(p.done?1:0);let c=STC.get(key);if(!c){c=document.createElement('canvas');c.width=Math.ceil(70*BS);c.height=Math.ceil(70*BS);g=c.getContext('2d');g.scale(BS,BS);g.translate(35-p.x,40-p.y);drawStation(p);STC.set(key,c);g=ctx;}return c;}
// ---------- cielo ----------
function skyDraw(t,v){SKY.forEach(o=>{let x=o.lo+((o.x-o.lo+o.v*t)%o.len+o.len)%o.len,y=o.y;if(MODE==='big')y=o.y+(cy-o.y)*o.p*.3;
 if(x<v[0]-80||x>v[2]+80||y<v[1]-120||y>v[3]+120)return;const ph=o.ph||0;
 switch(o.k){case'cloud':cloud3d(x,y,o.s);break;case'gull':gull(x,y+Math.sin(t*2+ph)*3,o.s,o.v>0?1:-1);break;case'blue':bluebird(x,y+Math.sin(t*3+ph)*4,o.s,o.c||'#5FB8FF',o.v>0?1:-1);break;
  case'fly':dragonfly(x+Math.sin(t*2+ph)*8,y+Math.cos(t*3+ph)*5);break;case'butterfly':butterfly(x+Math.sin(t+ph)*10,y+Math.sin(t*2.3+ph)*8,['#FF9AD5','#9EE7FF','#FFD06B'][Math.floor(ph)%3]);break;
  case'plane':plane(x,y);break;case'bird':bird(x,y+Math.sin(t*2+ph)*3,o.s);break;case'bat':g.fillStyle='#22222F';g.beginPath();const fl=Math.sin(t*12+ph)*4;g.moveTo(x,y);g.quadraticCurveTo(x-6,y-6-fl,x-12,y-2);g.quadraticCurveTo(x-6,y,x,y+2);g.quadraticCurveTo(x+6,y,x+12,y-2);g.quadraticCurveTo(x+6,y-6-fl,x,y);g.fill();break;
  case'snow':case'petal':case'leaf':{const yy=o.y-120+((t*(o.k==='snow'?22:16)+ph*60)%240),xx=o.x+Math.sin(t*.9+ph)*14;if(o.k==='snow'){g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(xx,yy,2.2,0,7);g.fill();}else{g.save();g.translate(xx,yy);g.rotate(t+ph);g.fillStyle=o.k==='petal'?'#FFC1DA':['#FF9A4D','#D9482B','#FFC83D'][Math.floor(ph)%3];g.beginPath();g.ellipse(0,0,4,2,0,0,7);g.fill();g.restore();}break;}
  case'firefly':{const a=(Math.sin(t*3+ph*5)+1)/2,xx=o.x+Math.sin(t*.7+ph)*16,yy=o.y+Math.cos(t*.5+ph)*12;g.fillStyle=rad(xx,yy,0,9,[[0,`rgba(255,240,150,${.9*a})`],[1,'rgba(255,240,150,0)']]);g.beginPath();g.arc(xx,yy,9,0,7);g.fill();break;}
  case'balloon':balloon(o.x+Math.sin(t*.3+ph)*20,o.y+Math.sin(t*.6+ph)*10,.8,['#FF8FB1','#FFC83D','#7FC4FF'][Math.floor(ph)%3]);break;
  case'star':{const a=(Math.sin(t*2+ph*7)+1)/2;g.fillStyle=`rgba(255,255,255,${.4+.6*a})`;g.beginPath();g.arc(o.x,o.y,1.2+a,0,7);g.fill();break;}
  case'planet':ball3d(o.x,o.y+Math.sin(t*.45+ph)*12,10+ph*2,['#FFB36B','#9C7BF2','#5FB8FF'][Math.floor(ph)%3]);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.beginPath();g.ellipse(o.x,o.y+Math.sin(t*.45+ph)*12,20,5,-.3,0,7);g.stroke();break;
  case'aurora':{const L=MODE==='big'?W:o.len;g.save();g.globalAlpha=.35;for(let i=0;i<3;i++){g.fillStyle=lin(o.y-60,o.y+40,[[0,'rgba(120,255,200,0)'],[.5,['rgba(120,255,200,.8)','rgba(160,140,255,.8)','rgba(120,220,255,.8)'][i]],[1,'rgba(120,255,200,0)']]);g.beginPath();g.moveTo(o.lo,o.y);for(let k=0;k<=20;k++){const xx=o.lo+k*L/20;g.lineTo(xx,o.y-30+Math.sin(k*.6+t*.6+i)*16-i*14);}for(let k=20;k>=0;k--){const xx=o.lo+k*L/20;g.lineTo(xx,o.y+20+Math.sin(k*.6+t*.6+i)*16-i*14);}g.fill();}g.restore();break;}
  case'firework':{const k=((t*.35+ph)%1),cx2=o.x,cy2=o.y-40;if(k<.25){g.fillStyle='#FFE27A';g.beginPath();g.arc(cx2,cy2+60*(1-k*4),2,0,7);g.fill();}else{const r=(k-.25)*80,a=1-(k-.25)/.75;for(let i=0;i<12;i++){const an=i*Math.PI/6;g.fillStyle=`rgba(${['255,120,140','255,220,120','140,200,255'][Math.floor(ph*3)%3]},${a})`;g.beginPath();g.arc(cx2+Math.cos(an)*r,cy2+Math.sin(an)*r,2.2,0,7);g.fill();}}break;}}});}
// ---------- bucle ----------
function frame(now){try{frame2(now);}catch(e){console.error(e);}if(!document.hidden)requestAnimationFrame(frame);else setTimeout(()=>requestAnimationFrame(frame),400);}
function frame2(now){const t=(now-t0)/1000;if(!drag&&(Math.abs(vx)>.01||Math.abs(vy)>.01)){cx-=vx*16;cy-=vy*16;vx*=.93;vy*=.93;clamp();}
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=gAt(TODAY);ctx.fillRect(0,0,cv.width,cv.height);
 const ox=vw/2-cx*z,oy=vh/2-cy*z;ctx.setTransform(DPR*z,0,0,DPR*z,DPR*ox,DPR*oy);g=ctx;
 const v=[cx-vw/2/z,cy-vh/2/z,cx+vw/2/z,cy+vh/2/z];baking=0;
 const TK=tileKeys();TCAP=Math.max(12,TK.length+6);let first=!TILES.size;TK.forEach(k=>{const big=MODE==='big';const r=big?[0,k*TH,W,TH]:[k*TH,0,TH,HM];const c=getTile(k,first);first=false;if(!c){ctx.fillStyle=gAt(dayAt(r[0]+r[2]/2,r[1]+r[3]/2));ctx.fillRect(r[0],r[1],r[2],r[3]);return;}ctx.drawImage(c,r[0]-.4,r[1]-.4,r[2]+.8,r[3]+.8);});
 waterFx(t,v);
 const vis=SPR.filter(it=>it.bb[2]>v[0]&&it.bb[0]<v[2]&&it.bb[3]>v[1]-30&&it.bb[1]<v[3]+30).sort((a,b)=>a.y-b.y);SCAP=Math.max(400,vis.length*2);sprBudget=SPC.size?24:9999;
 vis.forEach(it=>{const c=spr(it);if(!c)return;const bb=it.bb,ph=it.x*.05+it.y*.013;g.save();g.translate(it.x,it.y);
  if(it.a==='sway'){const k=Math.sin(t*1.5+ph)*.03+Math.sin(t*3.1+ph*2)*.008;g.transform(1,0,-k,1,0,0);}
  else if(it.a==='bob'){g.translate(0,it.r>18?-(Math.sin(t*.9+ph)+1)*5:Math.sin(t*1.6+ph)*1.6);}
  else if(it.a==='rocket'){const k=Math.max(0,Math.sin(t*.4+ph)),u=k*k*k,dy=-u*38;g.translate(0,dy);if(u>.02){g.fillStyle='rgba(255,170,60,.85)';g.beginPath();g.moveTo(-5,0);g.quadraticCurveTo(0,10+u*22*(1+.2*Math.sin(t*30)),5,0);g.fill();g.fillStyle='rgba(255,240,150,.9)';g.beginPath();g.moveTo(-2.5,0);g.quadraticCurveTo(0,6+u*12,2.5,0);g.fill();}}
  else if(it.a==='walk'){const dx=Math.sin(t*.22+ph)*16,dv=Math.cos(t*.22+ph);g.translate(dx,-Math.abs(Math.sin(t*5+ph))*1.2*(Math.abs(dv)>.15?1:0));if(dv*(it.f||1)<0)g.scale(-1,1);}
  g.drawImage(c,bb[0]-it.x,bb[1]-it.y,bb[2]-bb[0],bb[3]-bb[1]);g.restore();});
 FXL.forEach(it=>{if(it.bb[2]>v[0]-60&&it.bb[0]<v[2]+60&&it.bb[3]>v[1]-60&&it.bb[1]<v[3]+60){g.save();try{it.fx(it.x,it.y,it.s||1,t,it.i||0);}catch(e){}g.restore();}});
 skyDraw(t,v);
 PRZ.forEach(p=>{if(p.x<v[0]-40||p.x>v[2]+40||p.y<v[1]-50||p.y>v[3]+50)return;const c=stSpr(p);const pop=p===SEL?1.12:1;g.save();g.translate(p.x,p.y-5);g.scale(pop,pop);g.drawImage(c,-35,-35,70,70);g.restore();});
 const tq=tinyPos();if(!tinyC){tinyC=document.createElement('canvas');tinyC.width=Math.ceil(90*BS);tinyC.height=Math.ceil(90*BS);g=tinyC.getContext('2d');g.scale(BS,BS);tiny(45,60,62);g.fillStyle=INK;rr(23,68,44,20,10);g.fill();txt(T_('hoy','Hoy'),45,78,11.5,'#fff',900,'center','N');g.beginPath();g.moveTo(40,68);g.lineTo(50,68);g.lineTo(45,63);g.fill();g=ctx;}
 ctx.drawImage(tinyC,tq[0]-45,tq[1]-54+Math.sin(t*2.2)*1.5,90,90);
 if(SEL)placeBubble();

 if(idleK<12){idleK++;}else{idleK=0;prebake();}}
let idleK=0;function prebake(){const ks=tileKeys();[ks[0]-1,ks[ks.length-1]+1].forEach(k=>{if(!TILES.has(k)&&k>=0)getTile(k,true);});}
function tinyPos(){let d=TODAY;PRZ.forEach(p=>{if(Math.abs(p.pos-d)<1.3)d=p.pos-1.4;});return roadXY(d);}
// ---------- gestos ----------
const pts=new Map();let drag=false,pinch=null,tap=null,lastMove=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);vx=vy=0;drag=true;if(pts.size===1)tap={x:e.clientX,y:e.clientY,t:performance.now()};else{tap=null;const a=[...pts.values()];pinch={d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),z};}});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId),dx=e.clientX-p[0],dy=e.clientY-p[1];pts.set(e.pointerId,[e.clientX,e.clientY]);
 if(pts.size>=2&&pinch){const a=[...pts.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),mx=(a[0][0]+a[1][0])/2,my=(a[0][1]+a[1][1])/2;zoomAt(pinch.z*d/pinch.d,mx,my);return;}
 if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;if(MODE==='big'){cx-=dx/z;cy-=dy/z;}else{cx-=dx/z;}const n=performance.now(),dt=Math.max(8,n-lastMove);lastMove=n;vx=dx/z/dt;vy=MODE==='big'?dy/z/dt:0;clamp();});
const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(pts.size===0){drag=false;if(performance.now()-lastMove>80){vx=vy=0;}if(tap&&performance.now()-tap.t<400)onTap(tap.x,tap.y);tap=null;}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();if(MODE!=='big')return;if(e.ctrlKey)zoomAt(z*Math.exp(-e.deltaY*.01),e.clientX,e.clientY);else{cy+=e.deltaY/z;clamp();}},{passive:false});
function zoomAt(nz,sx,sy){nz=MODE==='big'?Math.max(zb,Math.min(zb*2.6,nz)):Math.max(vw/(64*PX),Math.min(vw/(5*PX),nz));const wx=cx+(sx-vw/2)/z,wy=cy+(sy-vh/2)/z;z=nz;cx=wx-(sx-vw/2)/z;cy=wy-(sy-vh/2)/z;if(MODE!=='big'&&Math.abs(BS-Math.min(2.5,DPR*z*1.15))>.5){BS=Math.min(2.5,DPR*z*1.15);TILES.clear();SPC.clear();STC.clear();tinyC=null;}clamp();}
function onTap(sx,sy){const wx=cx+(sx-vw/2)/z,wy=cy+(sy-vh/2)/z;let best=null,bd=MODE==='big'?30:Math.max(26,18/z);PRZ.forEach(p=>{const d=Math.hypot(p.x-wx,p.y-5-wy);if(d<bd){bd=d;best=p;}});
 if(MODE!=='big'){if(best)send('peek:'+best.id);else send('open');return;}
 if(best){SEL=best;openBubble(best);send('tap:'+best.id);return;}const tq=tinyPos();if(Math.hypot(tq[0]-wx,tq[1]-20-wy)<36){SEL={tiny:1,x:tq[0],y:tq[1]-30};openBubble(SEL);return;}closeBubble();}
// ---------- burbuja ----------
let SEL=null;const bub=document.getElementById('bub');let playing=null;
function iconData(p){const c=document.createElement('canvas');c.width=c.height=144;g=c.getContext('2d');g.scale(2,2);if(p.tiny)tiny(36,58,58);else if(p.k==='music'){ball3d(36,36,30,'#FF5F9E');g.fillStyle='#fff';g.lineJoin='round';g.lineWidth=6;g.strokeStyle='#fff';g.beginPath();if(playing===p.id){g.fillRect(25,22,8,28);g.fillRect(39,22,8,28);}else{g.moveTo(28,21);g.lineTo(50,36);g.lineTo(28,51);g.closePath();g.stroke();g.fill();}}else icon(p.k,36,38,2.1);g=ctx;return c.toDataURL();}
function openBubble(p){const left=p.d-TODAY;let cls='w',pills='';if(p.tiny){bub.innerHTML=`<div class="ic"><img src="${iconData(p)}"></div><div class="tx"><h3>${T_('tinyT','¡Hola!')}</h3><p>${T_('llevas','Llevas {a} días en verde. ¡Sigue así!',TODAY)}</p></div>`;bub.className='bub w show';return;}
 if(p.k==='prem')cls='gd';if(p.k==='shield')cls='bl';pills+=`<span class="p dk">${T_('dia','Día {a}',p.d)}</span>`;if(p.done)pills+=`<span class="p ok">✓ ${T_('conseguido','Conseguido')}</span>`;else pills+=`<span class="p lt">${left===1?T_('falta1','Falta 1 día'):T_('faltan','Faltan {a} días',left)}</span>`;if(p.dur)pills+=`<span class="p lt">${T_('dura','Dura {a}',p.dur)}</span>`;
 if(p.k==='prem'&&p.done){const left=(CFG.premUntil||0)-Date.now();pills+=left>0?`<span class="p ok" id="pcd">${T_('activo','Activo')} · ${fmtLeft(left)}</span>`:`<span class="p lt">${T_('disfrutado','Ya lo disfrutaste')}</span>`;}
 const tryB=p.done&&['acc','bg','ball','amb','music','crown'].includes(p.k)?`<button class="try" onclick="send('try:${p.id}')">${T_('pruebalo','Pruébalo ahora')}</button>`:'';
 bub.innerHTML=`<div class="ic" ${p.k==='music'?`onclick="togglePlay('${p.id}')"`:''}><img src="${iconData(p)}"></div><div class="tx"><h3>${p.t||''}</h3><p>${p.sub||''}</p><div class="ps">${pills}</div>${tryB}</div>`;bub.className='bub '+cls+' show';placeBubble();}
function fmtLeft(ms){const m=Math.max(0,Math.round(ms/60000)),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;return d?`${d} d ${h} h`:h?`${h} h ${mm} min`:`${mm} min`;}
setInterval(()=>{const e=document.getElementById('pcd');if(e&&CFG.premUntil)e.textContent=T_('activo','Activo')+' · '+fmtLeft(CFG.premUntil-Date.now());},20000);
function togglePlay(id){playing=playing===id?null:id;send((playing?'play:':'stop:')+id);if(SEL&&SEL.id===id)openBubble(SEL);}
window.CAM_STOPPED=()=>{playing=null;if(SEL&&SEL.k==='music')openBubble(SEL);};
function closeBubble(){if(playing){send('stop:'+playing);playing=null;}SEL=null;bub.className='bub';}
function placeBubble(){if(!SEL)return;const sx=(SEL.x-cx)*z+vw/2,sy=(SEL.y-cy)*z+vh/2;const bw=Math.min(340,vw-24),bh=bub.offsetHeight||120;let left=Math.max(12,Math.min(vw-bw-12,sx-bw/2));let top=sy-28*z-bh-14;let below=false;if(top<70){top=sy+30*z;below=true;}
 bub.style.width=bw+'px';bub.style.left=left+'px';bub.style.top=top+'px';bub.style.setProperty('--ax',(Math.max(24,Math.min(bw-24,sx-left)))+'px');bub.classList.toggle('below',below);}
// ---------- botones ----------
document.getElementById('zin').onclick=()=>zoomAt(z*1.35,vw/2,vh/2);document.getElementById('zout').onclick=()=>zoomAt(z/1.35,vw/2,vh/2);
document.getElementById('hoy').onclick=()=>{closeBubble();const a={x:cx,y:cy};centerToday();const b={x:cx,y:cy};cx=a.x;cy=a.y;const st=performance.now();const an=n=>{const k=Math.min(1,(n-st)/600),e=1-Math.pow(1-k,3);cx=a.x+(b.x-a.x)*e;cy=a.y+(b.y-a.y)*e;clamp();if(k<1)requestAnimationFrame(an);};requestAnimationFrame(an);};
document.getElementById('x').onclick=()=>send('close');
document.querySelectorAll('.chip').forEach(b=>b.onclick=e=>{e.stopPropagation();span=+b.dataset.s;document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));resize();centerToday();send('span:'+span);});
// ---------- arranque ----------
let booted=false;
function boot(){if(booted)return;booted=true;try{boot2();}catch(e){send('err:'+(e&&e.message||e));try{MODE='big';}catch(_){}}send('ready');}
function boot2(){TRX=CFG.tr||{};TODAY=CFG.today??18;PRZ=(CFG.prizes||defPrizes()).slice().sort((a,b)=>a.d-b.d);span=CFG.span||14;MODE=CFG.mode==='mini'?'mini':'big';if(MODE==='mini'){const w0=innerWidth||390,h0=innerHeight||176;HM=Math.max(230,Math.ceil(h0/(w0/(64*PX))*1.05));}document.body.classList.toggle('mini',MODE==='mini');LVd=LEVELS;BRIDGES=[];genAll();layoutPrizes();
 document.getElementById('ttl').textContent=T_('titulo','Tu camino');document.getElementById('hoy').textContent=T_('hoy','Hoy');
 document.querySelectorAll('.chip').forEach(c=>{c.textContent=T_('sp'+c.dataset.s,c.textContent);c.classList.toggle('on',+c.dataset.s===span);});
 resize();centerToday();addEventListener('resize',()=>{resize();});requestAnimationFrame(frame);}

function go(){if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('700 19px F'),document.fonts.load('900 10px N')]).then(boot,boot);else boot();}
// En la app: la app llama a CAM_INIT({...}) al cargar. En el navegador sin app: arranca solo con datos de ejemplo.
window.CAM_INIT=o=>{if(booted)return;CFG=Object.assign({},o||{});go();};
send('need');setTimeout(()=>{if(!booted){send('need');setTimeout(()=>{if(!booted)go();},2500);}},1500); // si la app no contesta, arranca igual (con datos de ejemplo)
if(window.TQ_CAMINO)go();else if(!window.TQBridge&&!(window.parent&&window.parent!==window&&window.parent.__tqFrameBridge))setTimeout(()=>{if(!booted)go();},300);

// ---------- agua que se mueve, luces que parpadean despacio (todo encima de las teselas) ----------
function cloud3d(x,y,s){[[-18,5,11],[-4,-4,16],[13,0,13],[25,6,8]].forEach(([dx,dy,r])=>{g.fillStyle=rad(x+dx*s-r*s*.3,y+dy*s-r*s*.5,1,r*s*1.3,[[0,'#FFFFFF'],[.7,'#F4FAFF'],[1,'#CFE3F7']]);g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,7);g.fill();});g.fillStyle=lin(y,y+16*s,[[0,'#F4FAFF'],[1,'#C7DCF2']]);rr(x-29*s,y+3*s,62*s,12*s,6*s);g.fill();} // sin sombra en el suelo
function inV(x,y,v,m){return x>v[0]-m&&x<v[2]+m&&y>v[1]-m&&y<v[3]+m;}
function waterFx(t,v){g.save();g.lineCap='round';
 FLOWS.forEach(F=>{const P=F.pts,n=P.length;for(let i=0;i<n-1;i+=3){const p=P[i];if(!inV(p[0],p[1],v,40))continue;const q=P[Math.min(n-1,i+1)],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,nx=-uy,ny=ux;
  for(let k=0;k<2;k++){const ph=((t*(F.lava?.25:.55)+i*.137+k*.5)%1),off=(k?-.22:.2)*F.w*(.6+.4*Math.sin(i)),L=6+4*Math.sin(i*1.7),a=Math.sin(ph*Math.PI)*.75;const x=p[0]+ux*(ph*18-9)+nx*off,y=p[1]+uy*(ph*18-9)+ny*off;g.strokeStyle=F.lava?`rgba(255,240,150,${a})`:`rgba(255,255,255,${a})`;g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+ux*L,y+uy*L);g.stroke();}}});
 WAVES.forEach(w=>{const p=w.c2;if(!inV(p[0],p[1],v,40))return;const k=(Math.sin(t*1.2+w.d*3)+1)/2;g.strokeStyle=`rgba(255,255,255,${.25+.45*k})`;g.lineWidth=2;const x=p[0]+(MODE==='big'?w.side*k*4:0),y=p[1]+(MODE==='big'?0:w.side*k*4);g.beginPath();g.moveTo(x-7,y);g.quadraticCurveTo(x,y-4,x+7,y);g.stroke();});
 PONDS.forEach(o=>{if(!inV(o.cx,o.cy,v,o.rx))return;for(let i=0;i<3;i++){const ph=(t*.35+i/3)%1,x=o.cx+Math.sin(i*2.1)*o.rx*.4,y=o.cy+Math.cos(i*1.7)*o.ry*.3;g.strokeStyle=`rgba(255,255,255,${.5*(1-ph)})`;g.lineWidth=1.4;g.beginPath();g.ellipse(x,y,4+ph*14,(4+ph*14)*.45,0,0,7);g.stroke();}});
 LIGHTS.forEach(o=>{if(!inV(o.x,o.y,v,30))return;const k=(Math.sin(t*.5+o.x*.3)+1)/2;g.fillStyle=rad(o.x,o.y,0,16*o.s,[[0,`rgba(255,220,120,${.15+.35*k})`],[1,'rgba(255,220,120,0)']]);g.beginPath();g.arc(o.x,o.y,16*o.s,0,7);g.fill();});
 LAMPS.forEach(o=>{if(!inV(o.x,o.y,v,30))return;const f=.75+.25*Math.sin(t*9+o.x)*Math.sin(t*2.3+o.y);g.fillStyle=rad(o.x,o.y,0,24*o.s,[[0,`rgba(255,225,130,${.35*f})`],[1,'rgba(255,225,130,0)']]);g.beginPath();g.arc(o.x,o.y,24*o.s,0,7);g.fill();});
 g.restore();}
