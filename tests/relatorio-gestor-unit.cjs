const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../relatorio-gestor.js'),'utf8');
async function scenario(id,{missing=false,switchCondo=false}={}){
 const els={oraquiRegImprimir:{textContent:'Relatório'}};
 function element(){const classes=new Set(['hidden']);return {setAttribute(){},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},replaceChildren(){this.innerHTML=''},querySelectorAll(){return []}}}
 const sandbox={console:{warn(){},error(){}},URL:{createObjectURL:()=> 'blob:logo',revokeObjectURL(){}},Image:class{naturalWidth=100;naturalHeight=50;set src(v){queueMicrotask(()=>this.onload())}},document:{head:{appendChild(){}},body:{appendChild(el){els[el.id]=el;els.oraquiPdfFechar={};els.oraquiPdfImprimir={};els.oraquiPdfConteudo=element()}},getElementById:id=>els[id],createElement:tag=>tag==='canvas'?{getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,dGVzdA=='}:element()},fetch:async url=>{
  if(url.endsWith('.json')){if(switchCondo)sandbox.versaoCondominio++;return {ok:true,json:async()=>({'1':{logo:'igara.png'}})}}
  return {ok:!missing,status:404,blob:async()=>({type:'image/png'})};
 },CONDOMINIO_ID:id,CONDOMINIO:id===1?'Reserva Igara':'Outro condomínio',versaoCondominio:1,oraquiRegDataInicio:'2026-10-21',oraquiRegDataFim:'2026-10-21',oraquiRegLocal:'Torre E • 12º andar',oraquiRegColaborador:'Ketlen',oraquiRegFiltro:()=>[{item_nome:'Limpeza',local_nome:'Torre E • 12º andar',colaborador_nome:'Ketlen',created_at:'2026-10-21',foto_path:'photo.png'}],normalizarReferenciaFoto:url=>({url}),oraquiRegDataLocal:()=> '2026-10-21',hora:()=> '12:00',esc:s=>String(s??''),alert(){}};
 sandbox.window=sandbox;vm.runInNewContext(source,sandbox);await sandbox.abrirPreviaRelatorioOraqui();return els;
}
(async()=>{
 let els=await scenario(1),html=els.oraquiPdfConteudo.innerHTML;
 assert.match(html,/oraqui-pdf-condominio/);assert.match(html,/Torre E • 12º andar/);assert.match(html,/Ketlen/);assert.match(html,/21\/10\/2026/);assert.match(html,/Foto DEPOIS/);
 els=await scenario(2);assert.doesNotMatch(els.oraquiPdfConteudo.innerHTML,/class="oraqui-pdf-condominio"/);assert.match(els.oraquiPdfConteudo.innerHTML,/Outro condomínio/);
 els=await scenario(1,{missing:true});assert.match(els.oraquiPdfConteudo.innerHTML,/Logo OraQui indisponível/);assert.match(els.oraquiPdfConteudo.innerHTML,/Fotografia indisponível/);
 els=await scenario(1,{switchCondo:true});assert.equal(els.oraquiPdfModal,undefined);assert.equal(els.oraquiRegImprimir.disabled,false);
 console.log('PASS: Igara, outro condomínio, metadados, fotos, falhas de imagem e troca de condomínio.');
})().catch(e=>{console.error(e);process.exit(1)});
