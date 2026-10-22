import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const cors = {
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Content-Type":"application/json; charset=utf-8"
};
function reply(obj:unknown,status=200){return new Response(JSON.stringify(obj),{status,headers:cors});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({error:"Método inválido."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if(!url||!anon||!secret)throw Error("Serviço indisponível.");
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return reply({error:"Faça login para sincronizar."},401);
  const scoped=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await scoped.auth.getUser();
  if(userError||!user)return reply({error:"Sessão expirada. Faça login novamente antes de sincronizar."},401);
  const payload=await req.json();
  const cid=Number(payload.condominio_id),eid=Number(payload.colaborador_id);
  const id=String(payload.offline_client_id||"");
  const tipo=String(payload.tipo||"");
  const captured=String(payload.horario_capturado_em||"");
  const data=new Date(captured),now=Date.now();
  if(!Number.isSafeInteger(cid)||!Number.isSafeInteger(eid)||cid<=0||eid<=0||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||
    !["entrada","inicio_intervalo","fim_intervalo","saida"].includes(tipo)||
    !Number.isFinite(data.getTime())||data.getTime()>now+300000||data.getTime()<now-72*3600000)
    return reply({error:"Marcação offline inválida ou antiga. Mantenha a pendência para conferência."},400);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:col,error:colError}=await admin.from("colaboradores")
    .select("id,condominio_id,ativo,ponto_ativo,auth_user_id")
    .eq("id",eid).eq("condominio_id",cid).eq("auth_user_id",user.id).eq("ativo",true).eq("ponto_ativo",true).maybeSingle();
  if(colError)throw colError;
  if(!col)return reply({error:"Permissão de ponto indisponível. A marcação continua no aparelho para análise."},403);
  const {data:old,error:oldError}=await admin.from("registros_ponto")
    .select("id,condominio_id,colaborador_id,origem,registrado_em")
    .eq("offline_client_id",id).maybeSingle();
  if(oldError)throw oldError;
  if(old){
    if(Number(old.condominio_id)!==cid||Number(old.colaborador_id)!==eid)
      return reply({error:"Identificador de marcação já associado a outro vínculo."},409);
    return reply({ok:true,duplicado:true,registro_id:old.id,registrado_em:old.registrado_em});
  }
  const geo={
    latitude:payload.latitude===null||payload.latitude===undefined?null:Number(payload.latitude),
    longitude:payload.longitude===null||payload.longitude===undefined?null:Number(payload.longitude),
    precisao_metros:payload.precisao_metros===null||payload.precisao_metros===undefined?null:Number(payload.precisao_metros)
  };
  if(Object.values(geo).some(v=>v!==null&&!Number.isFinite(v)))return reply({error:"GPS inválido."},400);
  const selfie=payload.selfie_path?String(payload.selfie_path):null;
  const record={
    condominio_id:cid,colaborador_id:eid,
    escala_id:payload.escala_id?Number(payload.escala_id):null,tipo,
    origem:"offline",offline_client_id:id,horario_capturado_em:data.toISOString(),
    selfie_path:selfie,...geo
  };
  const {data:insert,error:insertError}=await admin.from("registros_ponto")
    .insert(record).select("id,registrado_em,confianca_horario").single();
  if(insertError){
    if(insertError.code==="23505"){
      const {data:existing}=await admin.from("registros_ponto").select("id,registrado_em")
        .eq("offline_client_id",id).eq("colaborador_id",eid).eq("condominio_id",cid).maybeSingle();
      if(existing)return reply({ok:true,duplicado:true,registro_id:existing.id,registrado_em:existing.registrado_em});
    }
    throw insertError;
  }
  return reply({ok:true,registro_id:insert.id,registrado_em:insert.registrado_em,confianca_horario:insert.confianca_horario});
 }catch(e){
   console.error("oraqui-ponto-offline",e);
   return reply({error:e instanceof Error?e.message:"Não foi possível sincronizar."},500);
 }
});