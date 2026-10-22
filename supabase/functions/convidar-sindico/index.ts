import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const reply = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({error: "Método inválido"},405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) throw new Error("Configuração do servidor incompleta.");
    const authorization = req.headers.get("Authorization");
    if (!authorization) return reply({error:"Entre novamente no OraQui."},401);
    const client = createClient(url, anon, {
      global: {headers: {Authorization: authorization}},
      auth: {persistSession:false,autoRefreshToken:false}
    });
    const {data: {user},error:userError} = await client.auth.getUser();
    if (userError || !user) return reply({error:"Sessão inválida."},401);
    const payload = await req.json();
    const nome = String(payload.nome||"").trim();
    const email = String(payload.email||"").trim().toLowerCase();
    const idsRaw = Array.isArray(payload.condominio_ids) ? payload.condominio_ids : [];
    const ids = [...new Set(idsRaw.map(Number))];
    if (nome.length<2 || nome.length>120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return reply({error:"Informe nome e e-mail válidos."},400);
    if (!ids.length || ids.length>20 || ids.some(n=>!Number.isSafeInteger(n)||n<1))
      return reply({error:"Selecione condomínios válidos."},400);
    const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:gestoes,error:gestaoErro} = await admin.from("usuarios_gestao")
      .select("condominio_id,perfil,ativo,acesso_expira_em,acesso_temporario,acesso_ativado_em")
      .eq("auth_user_id",user.id).in("condominio_id",ids).eq("ativo",true);
    if (gestaoErro) throw gestaoErro;
    const autorizado=(gestoes||[]).filter(g=>
      ["admin_cliente","admin_oraqui"].includes(g.perfil) &&
      ((!g.acesso_temporario && !g.acesso_expira_em) ||
       (g.acesso_temporario && g.acesso_ativado_em && g.acesso_expira_em &&
        new Date(g.acesso_expira_em).getTime()>Date.now())));
    if (ids.some(id=>!autorizado.some(g=>Number(g.condominio_id)===id)))
      return reply({error:"Você não é administrador de todos os condomínios escolhidos."},403);
    const {data:condos,error:condErr}=await admin.from("condominios")
      .select("id,ativo").in("id",ids).eq("ativo",true);
    if(condErr)throw condErr;
    if((condos||[]).length!==ids.length)return reply({error:"Condomínio inexistente ou inativo."},400);

    let encontrado: {id:string,email?:string}|null=null;
    for(let pagina=1;pagina<=80;pagina++){
      const {data,error}=await admin.auth.admin.listUsers({page:pagina,perPage:200});
      if(error)throw error;
      const items=data?.users||[];
      const match=items.find(u=>String(u.email||"").toLowerCase()===email);
      if(match){encontrado={id:match.id,email:match.email};break;}
      if(items.length<200)break;
    }
    let novo=false;
    if(!encontrado){
      const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{
        redirectTo:"https://oraqui.app/definir-senha.html?tipo=sindico",
        data:{nome}
      });
      if(error||!data?.user)throw error||new Error("Não foi possível enviar convite.");
      encontrado={id:data.user.id,email};
      novo=true;
    }

    const filas=ids.map(condominio_id=>({
      condominio_id,auth_user_id:encontrado!.id,nome,ativo:true
    }));
    const {error:linkErr}=await admin.from("oraqui_portal_usuarios")
      .upsert(filas,{onConflict:"condominio_id,auth_user_id"});
    if(linkErr)throw linkErr;
    const {error:flagErr}=await admin.from("oraqui_portal_condominios")
      .upsert(ids.map(condominio_id=>({
        condominio_id,habilitado:true,atualizado_em:new Date().toISOString(),atualizado_por:user.id
      })),{onConflict:"condominio_id"});
    if(flagErr)throw flagErr;

    let aviso="";
    if(!novo){
      // Reutiliza a conta Auth já existente; não altera senha ou identidade.
      aviso="Conta já existente vinculada. O síndico pode entrar com a senha atual em oraqui.app/sindico.html.";
    }
    return reply({ok:true,novo,condominios:ids,aviso,
      mensagem:novo?"Convite enviado por e-mail e acesso de Síndico Acompanhante configurado.":aviso});
  } catch(e){
    console.error("convidar-sindico:",e);
    return reply({error: e instanceof Error?e.message:"Erro interno ao convidar síndico."},500);
  }
});