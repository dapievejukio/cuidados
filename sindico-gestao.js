(function moduloSindicoGestao(){
'use strict';
const $s=id=>document.getElementById(id);
const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"]/g,'');
const isAdmin=()=>typeof podeAdministrarGestao==='function'&&podeAdministrarGestao();
let sindicosPagina=[],portalPagina=[],versaoPortal=0;
const tipos={solicitacao:'Solicitação',problema:'Problema',comentario:'Comentário',sugestao:'Sugestão'};
const statusLabels={recebida:'Aguardando gestor',em_analise:'Em análise',encaminhada:'Encaminhada à equipe',respondida:'Respondida',encerrada:'Encerrada'};
const dataHora=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
const abrirModal=()=>{if(!isAdmin())return alert('Apenas o administrador cadastra síndicos.');
  const marcaveis=vinculosGestaoValidos.filter(x=>['admin_cliente','admin_oraqui'].includes(x.p.perfil)&&!x.c.ambiente_demo);
  $s('sindicoNome').value='';$s('sindicoEmail').value='';
  $s('sindicoCondominios').innerHTML=marcaveis.map(x=>'<label style="display:flex;gap:10px;align-items:center;padding:11px;border:1px solid #e1e6e9;border-radius:10px;margin:6px 0;cursor:pointer"><input type="checkbox" data-condominio-sindico="'+Number(x.c.id)+'" '+(Number(x.c.id)===Number(CONDOMINIO_ID)?'checked':'')+' style="width:18px;height:18px;accent-color:#ff8a3d">'+safe(x.c.nome)+'</label>').join('');
  $s('sindicoModal').classList.add('visible');
};
const fecharModal=()=>$s('sindicoModal').classList.remove('visible');
async function convite(){
 if(!isAdmin())return alert('Sem permissão administrativa.');
 const nome=$s('sindicoNome').value.trim(),email=$s('sindicoEmail').value.trim().toLowerCase();
 const ids=[...$s('sindicoCondominios').querySelectorAll('[data-condominio-sindico]:checked')].map(e=>Number(e.dataset.condominioSindico));
 if(nome.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!ids.length)return alert('Informe nome, e-mail e ao menos um condomínio.');
 const btn=$s('sindicoSalvar');btn.disabled=true;btn.textContent='ENVIANDO...';
 try{
  const {data,error}=await db.functions.invoke('convidar-sindico',{body:{nome,email,condominio_ids:ids}});
  if(error||!data?.ok)throw new Error(data?.error||error?.message||'Não foi possível vincular o síndico.');
  fecharModal();toast(data.novo?'✓ Convite enviado ao Síndico Acompanhante.':'✓ Síndico vinculado aos condomínios escolhidos.');
  if(data.aviso)alert(data.aviso);
  await carregarPortalAcompanhamento();
 }catch(e){console.error('Síndico:',e);alert(e.message||'Erro no convite.')}
 finally{btn.disabled=false;btn.textContent='ENVIAR CONVITE'}
}
async function carregarPortalAcompanhamento(){
 if(!CONDOMINIO_ID)return;
 const cid=Number(CONDOMINIO_ID),v=++versaoPortal;
 $s('portalSolicitacoesLista').textContent='Consultando solicitações do síndico...';
 $s('sindicosCadastrados').textContent=isAdmin()?'Consultando acessos...':'Acesso reservado ao administrador.';
 $s('sindicoConvidar').classList.toggle('hidden',!isAdmin());
 const mensagens=db.from('oraqui_portal_mensagens')
  .select('id,condominio_id,autor_auth_id,tipo,titulo,mensagem,area_id,ponto_id,foto_path,fotos_paths,status,resposta_cliente,demanda_id,criado_em,respondido_em')
  .eq('condominio_id',cid).order('criado_em',{ascending:false}).limit(80);
 const socios=isAdmin()?db.from('oraqui_portal_usuarios').select('id,nome,ativo,auth_user_id').eq('condominio_id',cid).order('nome'):Promise.resolve({data:[],error:null});
 const [m,u]=await Promise.all([mensagens,socios]);
 if(v!==versaoPortal||cid!==Number(CONDOMINIO_ID))return;
 if(m.error)$s('portalSolicitacoesLista').innerHTML='<p style="color:#ad3333">Não foi possível carregar: '+safe(m.error.message)+'</p>';
 else{
  portalPagina=m.data||[];
  $s('portalSolicitacoesLista').innerHTML=portalPagina.length?portalPagina.map(item=>{
    const fotos=Array.isArray(item.fotos_paths)&&item.fotos_paths.length?item.fotos_paths:item.foto_path?[item.foto_path]:[];
    const pendente=!!item.demanda_id;
    const resolvida=['respondida','encerrada'].includes(item.status);
    return '<article style="background:#fff;border:1px solid #e1e7eb;border-radius:14px;padding:15px;margin:9px 0">'+
    '<div style="display:flex;justify-content:space-between;gap:7px;flex-wrap:wrap"><strong>📥 '+safe(item.titulo)+'</strong><span style="font-size:11px;background:#fff0e6;padding:6px;border-radius:8px">'+safe(statusLabels[item.status]||item.status)+'</span></div>'+
    '<div style="font-size:11px;color:#667787;margin:6px 0">'+safe(tipos[item.tipo]||item.tipo)+' • '+safe(dataHora(item.criado_em))+' • #'+item.id+'</div>'+
    '<p style="font-size:13px;line-height:1.6;white-space:pre-wrap">'+safe(item.mensagem)+'</p>'+
    (item.demanda_id?'<p style="color:#45616a;font-size:12px">Demanda operacional #'+Number(item.demanda_id)+' vinculada — resposta final exige conferência do gestor.</p>':'')+
    (item.resposta_cliente?'<p style="font-size:12px;background:#f0f7f5;padding:10px;border-radius:8px"><strong>Resposta enviada:</strong> '+safe(item.resposta_cliente)+'</p>':'')+
    '<div style="display:flex;gap:7px;flex-wrap:wrap">'+
    (fotos.length?fotos.map((_,i)=>'<button class="action-button" data-portal-acao="foto" data-portal-id="'+item.id+'" data-portal-indice="'+i+'">📷 FOTO '+(i+1)+'</button>').join(''):'')+
    (!resolvida?'<button class="action-button" data-portal-acao="analise" data-portal-id="'+item.id+'">EM ANÁLISE</button>':'')+
    (!pendente&&!resolvida?'<button class="action-button" data-portal-acao="demanda" data-portal-id="'+item.id+'">CRIAR DEMANDA</button>':'')+
    (!resolvida?'<button class="action-button" data-portal-acao="responder" data-portal-id="'+item.id+'">RESPONDER / FINALIZAR</button>':'')+
    '</div></article>';
  }).join(''):'<div style="padding:14px;color:#64748b">Nenhuma solicitação recebida neste condomínio.</div>';
 }
 if(isAdmin()){
  if(u.error)$s('sindicosCadastrados').textContent='Falha ao consultar síndicos: '+u.error.message;
  else{
   sindicosPagina=u.data||[];
   $s('sindicosCadastrados').innerHTML=sindicosPagina.length?sindicosPagina.map(x=>
    '<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #e2e8eb;border-radius:12px;padding:12px;margin:6px 0"><div><strong>'+safe(x.nome)+'</strong><div style="font-size:11px;color:#71828e">Síndico Acompanhante</div></div><span class="'+(x.ativo?'active-badge':'inactive-badge')+'">'+(x.ativo?'ATIVO':'INATIVO')+'</span></div>'
   ).join(''):'<div style="padding:12px;color:#71828e">Nenhum síndico autorizado. Use CONVIDAR SÍNDICO.</div>';
  }
 }
}
async function mudarStatus(msg,status,texto){
 const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Sessão expirada');
 const body={status,respondido_em:status==='em_analise'?null:new Date().toISOString(),respondido_por:status==='em_analise'?null:user.id};
 if(texto!==undefined)body.resposta_cliente=texto;
 const {error}=await db.from('oraqui_portal_mensagens').update(body)
 .eq('id',msg.id).eq('condominio_id',Number(CONDOMINIO_ID));
 if(error)throw error;
}
async function acaoPortal(e){
 const btn=e.target.closest('[data-portal-acao]');if(!btn)return;
 const id=Number(btn.dataset.portalId),acao=btn.dataset.portalAcao;
 const msg=portalPagina.find(x=>Number(x.id)===id);
 if(!msg||Number(msg.condominio_id)!==Number(CONDOMINIO_ID))return;
 if(acao==='foto'){
  const paths=Array.isArray(msg.fotos_paths)&&msg.fotos_paths.length?msg.fotos_paths:msg.foto_path?[msg.foto_path]:[];
  const path=paths[Number(btn.dataset.portalIndice)||0];if(!path)return;
  try{
   const {data,error}=await db.storage.from('fotos-portal-sindico').createSignedUrl(path,600);
   if(error)throw error;
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }catch(ex){alert('Não foi possível abrir a foto: '+ex.message)}
  return;
 }
 if(acao==='demanda'){
  if(msg.demanda_id)return alert('Esta solicitação já possui uma demanda vinculada.');
  await abrirUrgente();
  if(!$s('urgenteModal').classList.contains('visible'))return;
  $s('urgTitulo').value=msg.titulo.slice(0,150);
  $s('urgDescricao').value='Solicitação do Síndico #'+msg.id+': '+msg.mensagem;
  if(msg.area_id){
   $s('urgArea').value=String(msg.area_id);
   atualizarPontosUrgentes();
   if(msg.ponto_id)$s('urgPonto').value=String(msg.ponto_id);
  }
  window.oraquiSindicoVinculo={id:msg.id,condominio_id:Number(CONDOMINIO_ID)};
  return;
 }
 btn.disabled=true;
 try{
  if(acao==='analise'){await mudarStatus(msg,'em_analise');toast('✓ Solicitação recebida para análise.')}
  if(acao==='responder'){
   const texto=prompt('Resposta da gestão ao síndico:',msg.resposta_cliente||'');
   if(texto===null)return;
   const resposta=texto.trim();if(resposta.length<3)return alert('Informe uma resposta com pelo menos três caracteres.');
   let status='encerrada';
   if(msg.demanda_id){
    const {data,error}=await db.from('demandas').select('id,status,condominio_id').eq('id',msg.demanda_id).eq('condominio_id',Number(CONDOMINIO_ID)).maybeSingle();
    if(error)throw error;
    status=data?.status==='concluida'?'encerrada':'encaminhada';
    if(status!=='encerrada'&&!confirm('A demanda ainda não foi concluída. Enviar apenas uma atualização de andamento ao síndico?'))return;
   }
   await mudarStatus(msg,status,resposta);
   toast(status==='encerrada'?'✓ Resposta final enviada ao síndico.':'✓ Atualização enviada ao síndico.');
  }
  await carregarPortalAcompanhamento();
 }catch(ex){console.error(ex);alert('Falha ao atualizar solicitação: '+ex.message)}
 finally{btn.disabled=false}
}
$s('sindicoConvidar').onclick=abrirModal;
$s('sindicoFechar').onclick=$s('sindicoCancelar').onclick=fecharModal;
$s('sindicoSalvar').onclick=convite;
$s('portalSolicitacoesAtualizar').onclick=carregarPortalAcompanhamento;
$s('portalSolicitacoesLista').addEventListener('click',acaoPortal);
const carregarGestoresOriginal=carregarGestores;
carregarGestores=async function(){await carregarGestoresOriginal();await carregarPortalAcompanhamento();};
})();
