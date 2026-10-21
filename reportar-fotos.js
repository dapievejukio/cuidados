/* ORAQUI — foto da última atividade registrada por ponto (Reserva Igara) */
(function(){
'use strict';
const btn=document.getElementById('ultimaFoto');
const card=document.getElementById('ultimaAtividade')?.closest('.ops-item');
if(!btn||!card||typeof carregarHistoricoLocal!=='function')return;
const style=document.createElement('style');
style.textContent="\n.ops-item.oraqui-com-foto{cursor:pointer;border-color:#9bcfaf;box-shadow:0 0 0 2px rgba(16,102,66,.07)}\n.ops-item.oraqui-com-foto:focus-visible{outline:3px solid #0f6744;outline-offset:3px}\n#ultimaFoto.ops-photo{display:none;align-items:center;min-height:42px;border:1px solid #10734e;border-radius:10px;padding:9px 14px;margin-top:12px;background:#e5f6ec;color:#0f6444;font-size:12px;font-weight:850}\n.oraqui-foto-overlay[hidden]{display:none!important}\n.oraqui-foto-overlay{position:fixed;inset:0;z-index:1500;display:flex;align-items:center;justify-content:center;overflow:auto;background:rgba(12,30,26,.83);padding:16px;backdrop-filter:blur(6px)}\n.oraqui-foto-dialog{width:min(620px,100%);max-height:92vh;overflow-y:auto;border-radius:19px;padding:19px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.3)}\n.oraqui-foto-header{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:16px}\n.oraqui-foto-header h2{margin:0;color:#155238;font-size:19px}\n.oraqui-foto-header p{margin:6px 0 0;font-size:12px;color:#677d73;line-height:1.5}\n.oraqui-foto-close{flex:0 0 44px;height:44px;border:0;border-radius:12px;background:#ecf3ef;font-size:28px;color:#105135}\n.oraqui-foto-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:12px}\n.oraqui-foto-item{margin:0;border:1px solid #e0e8e3;background:#f2f7f4;border-radius:12px;overflow:hidden}\n.oraqui-foto-item figcaption{padding:10px 12px;font-size:11px;font-weight:850;color:#1a6243}\n.oraqui-foto-item img{display:block;width:100%;height:auto;max-height:60vh;min-height:180px;object-fit:contain;background:#edf2ef}\n.oraqui-foto-alert{padding:18px;color:#a13934;font-size:12px}\n.oraqui-foto-footer{margin:13px 0 0;color:#647a70;font-size:11px}\n@media(max-width:480px){.oraqui-foto-dialog{padding:13px}.oraqui-foto-item img{max-height:45vh}}\n";
document.head.appendChild(style);
const modal=document.createElement('div');
modal.id='oraquiFotoUltimaAtividade';
modal.className='oraqui-foto-overlay';
modal.hidden=true;
modal.setAttribute('role','dialog');
modal.setAttribute('aria-modal','true');
modal.setAttribute('aria-labelledby','oraquiFotoTitulo');
modal.innerHTML='<section class="oraqui-foto-dialog"><div class="oraqui-foto-header"><div><h2 id="oraquiFotoTitulo">Fotos da última atividade</h2><p id="oraquiFotoInfo"></p></div><button type="button" class="oraqui-foto-close" id="oraquiFotoFechar" aria-label="Fechar">×</button></div><div class="oraqui-foto-grid" id="oraquiFotoGrid"></div><p class="oraqui-foto-footer">Fotografias operacionais do espaço selecionado.</p></section>';
document.body.appendChild(modal);
let fotoAtual=null,versao=0,focoAnterior=null;
function fechar(){
 if(modal.hidden)return;
 modal.hidden=true;
 document.body.style.overflow='';
 if(focoAnterior?.isConnected)focoAnterior.focus();
}
function limpar(){
 fotoAtual=null;btn.disabled=true;btn.style.display='none';
 card.classList.remove('oraqui-com-foto');
 card.removeAttribute('tabindex');card.removeAttribute('role');card.removeAttribute('aria-label');
 fechar();
}
function urlFoto(path){
 const s=typeof path==='string'?path.trim().replace(/^\/+/,''):'';
 // Esta página é exclusiva do Reserva Igara. Não abrir paths de outros condomínios.
 if(!/^v2\/1\//.test(s))return '';
 return db.storage.from('fotos-atividades').getPublicUrl(s).data?.publicUrl||'';
}
function abrir(){
 if(!fotoAtual)return;
 const itens=[['ANTES DO SERVIÇO',fotoAtual.foto_antes_path],['DEPOIS DO SERVIÇO',fotoAtual.foto_path]];
 const grade=document.getElementById('oraquiFotoGrid');grade.replaceChildren();let adicionadas=0;
 for(const [tipo,path] of itens){
  const url=urlFoto(path);if(!url)continue;
  adicionadas++;
  const figure=document.createElement('figure');figure.className='oraqui-foto-item';
  const legenda=document.createElement('figcaption');legenda.textContent=tipo;
  const img=document.createElement('img');img.src=url;img.alt='Fotografia '+tipo.toLowerCase();img.decoding='async';
  img.onerror=()=>{img.remove();const aviso=document.createElement('div');aviso.className='oraqui-foto-alert';aviso.textContent='Não foi possível carregar esta foto.';figure.append(aviso);};
  figure.append(legenda,img);grade.append(figure);
 }
 if(!adicionadas)return;
 const a=areas.find(x=>Number(x.id)===fotoAtual.areaId)?.nome||'';
 const p=pontos.find(x=>Number(x.id)===fotoAtual.pontoId)?.nome||'';
 document.getElementById('oraquiFotoInfo').textContent=[a,p].filter(Boolean).join(' • ')+' — '+fmtDataHora(fotoAtual.ultima_quando);
 focoAnterior=document.activeElement;modal.hidden=false;document.body.style.overflow='hidden';
 document.getElementById('oraquiFotoFechar').focus();
}
document.getElementById('oraquiFotoFechar').addEventListener('click',fechar);
modal.addEventListener('click',e=>{if(e.target===modal)fechar();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fechar();});
btn.addEventListener('click',e=>{e.stopPropagation();abrir();});
card.addEventListener('click',e=>{if(!e.target.closest('#ultimaFoto'))abrir();});
card.addEventListener('keydown',e=>{if(fotoAtual&&(e.key==='Enter'||e.key===' ')){e.preventDefault();abrir();}});
const original=carregarHistoricoLocal;
window.carregarHistoricoLocal=async function(){
 const v=++versao;limpar();
 const areaId=Number(document.getElementById('area').value)||null;
 const pontoId=Number(document.getElementById('detalhe').value)||null;
 await original();
 if(v!==versao||!areaId)return;
 const okLocal=()=>Number(document.getElementById('area').value)===areaId&&(Number(document.getElementById('detalhe').value)||null)===pontoId;
 if(!okLocal()||!document.getElementById('ultimaQuando').textContent)return;
 try{
  const {data,error}=await db.rpc('foto_ultima_atividade_publica',{
   p_condominio_id:CONDOMINIO_ID,p_area_id:areaId,p_ponto_id:pontoId
  });
  if(error)throw error;
  if(v!==versao||!okLocal())return;
  const foto=data?.[0];
  if(!foto?.ultima_quando)return;
  if(document.getElementById('ultimaQuando').textContent!==fmtDataHora(foto.ultima_quando))return;
  if(!urlFoto(foto.foto_path)&&!urlFoto(foto.foto_antes_path))return;
  fotoAtual={...foto,areaId,pontoId};
  btn.textContent='📷 VER FOTOS DO SERVIÇO';
  btn.style.display='inline-flex';btn.disabled=false;
  card.classList.add('oraqui-com-foto');
  card.setAttribute('role','button');card.setAttribute('tabindex','0');
  card.setAttribute('aria-label','Abrir fotografias da última atividade');
 }catch(e){console.warn('Não foi possível consultar as fotos do serviço.',e);}
};
for(const nome of ['trocarPonto','trocarArea','alterarArea']){
 const anterior=window[nome];
 if(typeof anterior!=='function')continue;
 window[nome]=function(){++versao;limpar();return anterior.apply(this,arguments);};
}
})();