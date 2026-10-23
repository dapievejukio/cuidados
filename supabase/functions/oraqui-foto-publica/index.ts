import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const headers={
 "Access-Control-Allow-Origin":"https://oraqui.app",
 "Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Cache-Control":"no-store",
 "Content-Type":"application/json; charset=utf-8"
};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return answer({error:"Método não permitido."},405);
 const origin=req.headers.get("Origin");
 if(origin && origin!=="https://oraqui.app" && origin!=="https://www.oraqui.app")
   return answer({error:"Origem não autorizada."},403);
 try{
  const body=await req.json();
  const condo=Number(body?.condominio_id),area=Number(body?.area_id);
  const ponto=body?.ponto_id==null||body?.ponto_id===""?null:Number(body.ponto_id);
  if(condo!==1||!Number.isSafeInteger(area)||area<1||ponto!==null&&(!Number.isSafeInteger(ponto)||ponto<1))
    return answer({error:"Local não autorizado."},400);
  const url=Deno.env.get("SUPABASE_URL")!;
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if(!url||!publicKey||!secret)return answer({error:"Serviço indisponível."},503);
  // A RPC valida condomínio, áreas visíveis e que o serviço é a última execução pública.
  // O cliente não fornece nomes/caminhos dos arquivos.
  const publicDb=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await publicDb.rpc("foto_ultima_atividade_publica",{
    p_condominio_id:1,p_area_id:area,p_ponto_id:ponto
  });
  if(error)throw error;
  const item=data?.[0];
  if(!item)return answer({ok:true,foto_path:null,foto_antes_path:null,ultima_quando:null,urls:{}});
  const allowed=(path:unknown)=>typeof path==="string" && /^v2\/1\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(path);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const result:Record<string,string>={};
  for(const field of ["foto_antes_path","foto_path"] as const){
    const path=item[field];
    if(!allowed(path))continue;
    const {data:signed,error:signError}=await admin.storage.from("fotos-atividades").createSignedUrl(path,600);
    if(signError){console.warn("Foto pública indisponível:",field,signError.message);continue}
    if(signed?.signedUrl)result[field]=signed.signedUrl;
  }
  return answer({ok:true,foto_path:item.foto_path||null,foto_antes_path:item.foto_antes_path||null,
    ultima_quando:item.ultima_quando,urls:result});
 }catch(e){
   console.error("oraqui-foto-publica",e);
   return answer({error:"Não foi possível consultar a fotografia."},500);
 }
});