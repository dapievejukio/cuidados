/* ORAQUI: relatório de serviços do Gestor com fotos imprimíveis. */
(function(){
const css='.oraqui-pdf-modal{position:fixed;inset:0;z-index:17000;overflow:auto;background:rgba(15,26,45,.76);padding:14px}.oraqui-pdf-box{max-width:800px;background:white;color:#26384a;margin:auto;padding:18px;border-radius:16px}.oraqui-pdf-menu{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-bottom:12px;border-bottom:1px solid #d8e1e8;margin-bottom:15px}.oraqui-pdf-menu strong{font-size:16px}.oraqui-pdf-menu button{border:0;border-radius:9px;padding:12px;background:#e9eef3;color:#304c61;font-weight:700}.oraqui-pdf-menu #oraquiPdfImprimir{background:#5d50a6;color:white}.oraqui-pdf-cab{border-bottom:2px solid #43536a;padding-bottom:12px;margin-bottom:13px}.oraqui-pdf-cab h1{font-size:21px;margin:0 0 7px}.oraqui-pdf-cab h2{font-size:14px;margin:0 0 12px}.oraqui-pdf-filtros{display:grid;grid-template-columns:1fr 1fr;gap:8px}.oraqui-pdf-filtros div{border:1px solid #dce4eb;padding:9px;font-size:11px;border-radius:7px;overflow-wrap:anywhere}.oraqui-pdf-filtros b{display:block;font-size:9px;color:#60768a;margin-bottom:5px}.oraqui-pdf-item{border:1px solid #dce4eb;border-radius:8px;padding:12px;margin:12px 0;break-inside:avoid;page-break-inside:avoid}.oraqui-pdf-item h3{font-size:13px;margin-bottom:8px}.oraqui-pdf-item p{font-size:11px;line-height:1.5;margin:4px 0}.oraqui-pdf-fotos{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}.oraqui-pdf-foto{border:1px solid #dce4eb;padding:7px;border-radius:7px;min-width:0}.oraqui-pdf-foto b{display:block;font-size:10px;margin-bottom:6px}.oraqui-pdf-foto img{display:block;width:100%;height:210px;object-fit:contain;background:#f4f5f6}.oraqui-pdf-erro{font-size:11px;color:#a33c34;background:#fff1ef;padding:9px;margin-top:10px;border-radius:6px}.oraqui-pdf-rodape{padding-top:12px;margin-top:12px;border-top:1px solid #dce4eb;font-size:10px;color:#627485}@media(max-width:520px){.oraqui-pdf-box{padding:12px}.oraqui-pdf-filtros,.oraqui-pdf-fotos{grid-template-columns:1fr}}@page{size:A4 portrait;margin:12mm}@media print{body>*:not(#oraquiPdfModal){display:none!important}#oraquiPdfModal,#oraquiPdfModal *{visibility:visible!important}#oraquiPdfModal{position:static!important;inset:auto!important;display:block!important;background:white!important;padding:0!important;overflow:visible!important}.oraqui-pdf-box{max-width:none!important;padding:0!important;border-radius:0!important}.oraqui-pdf-menu{display:none!important}.oraqui-pdf-fotos,.oraqui-pdf-filtros{grid-template-columns:1fr 1fr}.oraqui-pdf-foto img{height:170px}}';
const estilo=document.createElement('style');estilo.textContent=css;document.head.appendChild(estilo);
let ocupado=false;
function modal(){
 let el=document.getElementById('oraquiPdfModal');
 if(el)return el;
 el=document.createElement('div');el.id='oraquiPdfModal';el.className='oraqui-pdf-modal hidden';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.innerHTML='<div class="oraqui-pdf-box"><div class="oraqui-pdf-menu"><strong>Relatório de serviços • Pré-visualização</strong><div><button type="button" id="oraquiPdfFechar">FECHAR</button> <button type="button" id="oraquiPdfImprimir">🖨️ IMPRIMIR / SALVAR PDF</button></div></div><div id="oraquiPdfConteudo"></div></div>';
 document.body.appendChild(el);
 document.getElementById('oraquiPdfFechar').onclick=()=>el.classList.add('hidden');
 document.getElementById('oraquiPdfImprimir').onclick=()=>window.print();
 return el;
}
function dataPt(iso){const p=String(iso||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:String(iso||'')}
async function carregarFoto(url){
 const res=await fetch(url,{credentials:'omit'});if(!res.ok)throw new Error('Foto HTTP '+res.status);
 const blob=await res.blob();if(!blob.type.startsWith('image/'))throw new Error('Arquivo não é imagem');
 const objectUrl=URL.createObjectURL(blob);
 try{
  const imagem=new Image();await new Promise((ok,erro)=>{imagem.onload=ok;imagem.onerror=()=>erro(new Error('Foto ilegível'));imagem.src=objectUrl});
  const fator=Math.min(1,1200/Math.max(imagem.naturalWidth,imagem.naturalHeight));
  const tela=document.createElement('canvas');tela.width=Math.max(1,Math.round(imagem.naturalWidth*fator));tela.height=Math.max(1,Math.round(imagem.naturalHeight*fator));
  const ctx=tela.getContext('2d');if(!ctx)throw new Error('Falha no processamento');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,tela.width,tela.height);ctx.drawImage(imagem,0,0,tela.width,tela.height);
  const base64=tela.toDataURL('image/jpeg',.82);tela.width=0;tela.height=0;return base64;
 }finally{URL.revokeObjectURL(objectUrl)}
}
async function prepararFoto(path){
 const ref=normalizarReferenciaFoto(path);
 if(!ref)return null;if(ref.url)return carregarFoto(ref.url);
 const buckets=[ref.bucket,'fotos-atividades','fotos-ocorrencias','ocorrencias','ocorrencias-fotos','fotos'].filter((v,i,a)=>v&&a.indexOf(v)===i);
 let ultimo;
 for(const bucket of buckets){
  try{
   const {data,error}=await db.storage.from(bucket).createSignedUrl(ref.path,600);
   if(error||!data?.signedUrl)throw error||new Error('Foto indisponível');
   return await carregarFoto(data.signedUrl);
  }catch(e){ultimo=e}
 }
 throw ultimo||new Error('Foto indisponível');
}
window.fecharRelatorioOraqui=()=>document.getElementById('oraquiPdfModal')?.classList.add('hidden');
window.abrirPreviaRelatorioOraqui=async function(){
 if(ocupado)return;
 const dados=oraquiRegFiltro().slice().sort((a,b)=>new Date(a.concluida_em||a.created_at)-new Date(b.concluida_em||b.created_at));
 if(!dados.length){alert('Nenhum serviço encontrado para os filtros selecionados.');return}
 const idCondo=CONDOMINIO_ID,nomeCondo=CONDOMINIO,dia=oraquiRegData||hoje(),local=oraquiRegLocal||'Todos os locais',colaborador=oraquiRegColaborador||'Todos';
 const b=document.getElementById('oraquiRegImprimir'),texto=b.textContent;ocupado=true;b.disabled=true;b.textContent='⏳ Preparando fotos...';
 try{
  const referencias=[...new Set(dados.flatMap(r=>[r.foto_antes_path,r.foto_path]).filter(Boolean))],fotos=new Map();
  let falhas=0;
  for(let i=0;i<referencias.length;i++){
   if(String(CONDOMINIO_ID)!==String(idCondo))return;
   b.textContent='⏳ Foto '+(i+1)+' de '+referencias.length;
   try{fotos.set(referencias[i],await prepararFoto(referencias[i]))}catch(e){console.warn('Foto ausente no PDF:',e);fotos.set(referencias[i],null);falhas++}
  }
  if(String(CONDOMINIO_ID)!==String(idCondo))return;
  const htmlFoto=(path,titulo)=>!path?'':'<div class="oraqui-pdf-foto"><b>'+esc(titulo)+'</b>'+(fotos.get(path)?'<img alt="Foto '+esc(titulo)+'" src="'+fotos.get(path)+'">':'<div class="oraqui-pdf-erro">Fotografia indisponível.</div>')+'</div>';
  const itens=dados.map((r,i)=>{
   const img=htmlFoto(r.foto_antes_path,'ANTES')+htmlFoto(r.foto_path,'DEPOIS');
   return '<article class="oraqui-pdf-item"><h3>'+(i+1)+'. '+esc(r.item_nome)+' • '+esc(hora(r.concluida_em||r.created_at))+'</h3><p><b>Local:</b> '+esc(r.local_nome)+'</p><p><b>Colaborador:</b> '+esc(r.colaborador_nome)+'</p>'+(r.observacao?'<p><b>Observação:</b> '+esc(r.observacao)+'</p>':'')+(img?'<div class="oraqui-pdf-fotos">'+img+'</div>':'<p>Sem fotografia registrada.</p>')+'</article>';
  }).join('');
  const cab='<header class="oraqui-pdf-cab"><h1>ORAQUI • Relatório de Serviços</h1><h2>'+esc(nomeCondo)+'</h2><div class="oraqui-pdf-filtros"><div><b>DATA</b>'+esc(dataPt(dia))+'</div><div><b>LOCAL</b>'+esc(local)+'</div><div><b>COLABORADOR</b>'+esc(colaborador)+'</div><div><b>REGISTROS E FOTOS</b>'+dados.length+' serviço(s) • '+(referencias.length-falhas)+' fotografia(s)</div></div></header>';
  const aviso=falhas?'<div class="oraqui-pdf-erro">ATENÇÃO: '+falhas+' fotografia(s) não puderam ser incorporadas. Verifique o armazenamento antes de emitir a versão definitiva.</div>':'';
  document.getElementById('oraquiPdfConteudo')?.replaceChildren();
  const previa=modal();document.getElementById('oraquiPdfConteudo').innerHTML=cab+itens+aviso+'<footer class="oraqui-pdf-rodape">'+esc(nomeCondo)+' • Emitido em '+esc(new Date().toLocaleString('pt-BR'))+' • ORAQUI</footer>';
  previa.classList.remove('hidden');
  if(falhas)alert(falhas+' fotografia(s) não foram incorporadas; confira o aviso na prévia.');
 }catch(e){console.error(e);alert('Não foi possível preparar o relatório: '+(e?.message||e))}
 finally{ocupado=false;b.disabled=false;b.textContent=texto}
};
})();
