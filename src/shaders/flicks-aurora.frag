// Flicks Nocturne — see src/components/ShaderHero.tsx FRAG and SHADER.md for line-by-line notes
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
float hash(vec2 p){return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);}
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5, f=1.0;
  for(int i=0;i<3;i++){ v+=a*noise(p*f); a*=0.5; f*=2.0; }
  return v;
}
void main(){
  vec2 fragCoord=gl_FragCoord.xy;
  vec2 uv=fragCoord/u_resolution;
  float aspect=u_resolution.x/u_resolution.y;
  vec2 p=uv*2.0-1.0; p.x*=aspect;
  vec2 m=u_mouse/u_resolution;
  vec2 mNorm=m*2.0-1.0; mNorm.x*=aspect;
  vec2 wind=vec2(0.0);
  if(u_mouse.x>0.0 || u_mouse.y>0.0) wind=mNorm*0.18;
  float t=u_time*0.22;
  vec2 q=p;
  q.x+=fbm(p*0.85+vec2(t*0.10,t*0.06))*0.65;
  q.y+=fbm(p*1.10-vec2(t*0.07,0.0))*0.35;
  q+=wind;
  float band1Center=0.48+sin(q.x*1.10+t*0.55)*0.18+cos(q.x*0.55-t*0.25)*0.12;
  float band2Center=-0.42+cos(q.x*0.85-t*0.45)*0.20+sin(q.x*0.65+t*0.30)*0.10;
  float band1=exp(-abs(q.y-band1Center)*3.2)*0.95;
  float band2=exp(-abs(q.y-band2Center)*2.8)*0.85;
  band1*=0.6+0.4*fbm(q*2.2+t*0.15);
  band2*=0.6+0.4*fbm(q*1.8-t*0.12);
  float centerMask=smoothstep(0.55,1.15,abs(q.y)); centerMask=pow(centerMask,0.85);
  float sideMask=1.0-0.22*length(p*0.45);
  band1*=centerMask*sideMask;
  band2*=centerMask*sideMask*1.05;
  vec3 night=vec3(0.06,0.08,0.09);
  vec3 amber=vec3(0.91,0.66,0.24);
  vec3 teal=vec3(0.27,0.62,0.58);
  vec3 violet=vec3(0.47,0.38,0.93);
  vec3 color=night;
  color+=band1*mix(amber,vec3(1.0,0.82,0.45),0.25)*1.15;
  color+=band2*mix(teal,violet,0.45)*1.05;
  float skyGrad=smoothstep(-0.9,0.8,p.y)*0.07;
  color+=vec3(0.06,0.09,0.14)*skyGrad;
  float vign=1.0-length(p*0.42)*0.55; vign=smoothstep(0.0,1.0,vign); vign=pow(vign,1.08);
  color*=vign*0.96+0.04;
  color=pow(color,vec3(0.92));
  color=color/(color+vec3(0.55));
  float grain=hash(uv*420.0+mod(t*8.0,100.0))*0.10-0.05;
  float lum=dot(color,vec3(0.299,0.587,0.114));
  grain*=(1.0-lum*0.45);
  color+=grain;
  gl_FragColor=vec4(color,1.0);
}
