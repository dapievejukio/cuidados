import { Resend } from "npm:resend@4.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const resend = new Resend(
  Deno.env.get("RESEND_API_KEY")
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const {
      email,
      protocolo,
      condominio,
      local,
      mensagem,
      foto_execucao_path,
      fotos_execucao_paths,
      foto_antes_path,
    } = await req.json();

    if (
      !email ||
      !protocolo ||
      !mensagem
    ) {
      return new Response(
        JSON.stringify({
          error: "Dados obrigatórios ausentes.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Compatibilidade com foto legada, permitindo ate oito fotos por atendimento.
    const recebidas = Array.isArray(fotos_execucao_paths)
      ? fotos_execucao_paths.filter((p: unknown): p is string => typeof p === "string" && p.length > 0).slice(0,8)
      : [];
    const pathsFotos: string[] = [...new Set(recebidas.length ? recebidas : (foto_execucao_path ? [foto_execucao_path] : []))];
    const fotosUrls: string[] = [];
    for (const path of pathsFotos) {
      const {data, error} = await supabase.storage.from("fotos-atividades").createSignedUrl(path,60*60*24*7);
      if(error)console.warn("Foto da conclusão indisponível:",error.message);
      else if(data?.signedUrl)fotosUrls.push(data.signedUrl);
    }

    let fotoAntesUrl: string | null = null;
    if (foto_antes_path) {
      const { data: antes, error: errAntes } = await supabase.storage.from("fotos-atividades").createSignedUrl(foto_antes_path,60*60*24*7);
      if (errAntes) console.warn("Foto ANTES indisponível:",errAntes.message);
      else fotoAntesUrl = antes?.signedUrl || null;
    }
    const fotoAntesHtml = fotoAntesUrl ? '<div style="margin-top:20px;font-size:12px;font-weight:bold">📸 ANTES DO ATENDIMENTO</div><p><img src="'+esc(fotoAntesUrl)+'" alt="Antes do atendimento" style="max-width:100%;border-radius:10px"></p>' : "";
    const fotoHtml = fotosUrls.length ? `
      <div style="margin-top:24px">
        <div style="font-size:12px;font-weight:bold;margin-bottom:9px">
          📸 DEPOIS DO ATENDIMENTO (${fotosUrls.length} ${fotosUrls.length === 1 ? "FOTO" : "FOTOS"})
        </div>
        ${fotosUrls.map((url,i)=>`
          <div style="background:#f4f6f8;border-radius:14px;padding:10px;margin-bottom:10px">
            <div style="font-size:11px;color:#586775;font-weight:700;padding:3px 4px 8px">FOTO ${i+1}</div>
            <img src="${esc(url)}" alt="Resultado do atendimento ${i+1}" style="display:block;width:100%;max-width:500px;height:auto;margin:0 auto;border-radius:10px">
          </div>
        `).join("")}
        <div style="color:#8a949e;font-size:10px;line-height:1.5">
          Registros fotográficos realizados pela equipe durante a conclusão do atendimento.
        </div>
      </div>` : "";

    const { data, error } =
      await resend.emails.send({

        from:
          "ORAQUI <atendimento@oraqui.app>",

        to: [email],

        replyTo:
          "atendimento@oraqui.app",

        subject:
          `Ocorrência resolvida — ${protocolo}`,

        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width">
          </head>

          <body
            style="
              margin:0;
              padding:0;
              background:#f4f6f8;
              font-family:Arial,Helvetica,sans-serif;
              color:#2d3742;
            "
          >

            <div
              style="
                max-width:600px;
                margin:0 auto;
                padding:30px 15px;
              "
            >

              <div
                style="
                  background:#ffffff;
                  border-radius:18px;
                  overflow:hidden;
                "
              >

                <div
                  style="
                    background:#ffffff;
                    border-top:6px solid #FF8A3D;
                    border-bottom:1px solid #e7eee9;
                    color:#0f5132;
                    padding:24px 20px 20px;
                    text-align:center;
                  "
                >

                  <img
                    src="https://oraqui.app/assets/marca/oraqui-transparente.webp?v=20261022"
                    alt="OraQui — Condomínios e equipes em ação"
                    width="260"
                    style="
                      display:block;
                      width:260px;
                      max-width:100%;
                      height:auto;
                      margin:0 auto;
                      border:0;
                      outline:none;
                      text-decoration:none;
                    "
                  >

                  <div
                    style="
                      margin-top:5px;
                      font-size:10px;
                      letter-spacing:1px;
                      opacity:.85;
                    "
                  >
                    AGORA. AQUI. REGISTRADO.
                  </div>

                </div>

                <div
                  style="
                    padding:28px;
                  "
                >

                  <h2
                    style="
                      margin:0 0 8px;
                      font-size:20px;
                    "
                  >
                    Ocorrência resolvida
                  </h2>

                  <p
                    style="
                      margin:0 0 25px;
                      color:#75808c;
                      font-size:14px;
                    "
                  >
                    A equipe responsável concluiu
                    o atendimento da ocorrência.
                  </p>

                  <div
                    style="
                      background:#f4f6f8;
                      border-radius:12px;
                      padding:16px;
                      margin-bottom:20px;
                    "
                  >

                    <div
                      style="
                        font-size:12px;
                        color:#75808c;
                      "
                    >
                      PROTOCOLO
                    </div>

                    <div
                      style="
                        margin-top:4px;
                        font-size:15px;
                        font-weight:bold;
                      "
                    >
                      ${esc(protocolo)}
                    </div>

                    <div
                      style="
                        margin-top:15px;
                        font-size:12px;
                        color:#75808c;
                      "
                    >
                      LOCAL
                    </div>

                    <div
                      style="
                        margin-top:4px;
                        font-size:14px;
                      "
                    >
                      ${esc(local || "Não informado")}
                    </div>

                    <div
                      style="
                        margin-top:15px;
                        font-size:12px;
                        color:#75808c;
                      "
                    >
                      CONDOMÍNIO
                    </div>

                    <div
                      style="
                        margin-top:4px;
                        font-size:14px;
                      "
                    >
                      ${esc(condominio || "Não informado")}
                    </div>

                  </div>

                  <div
                    style="
                      font-size:12px;
                      font-weight:bold;
                      margin-bottom:7px;
                    "
                  >
                    RETORNO DA GESTÃO
                  </div>

                  <div
                    style="
                      background:#fff5ed;
                      border-left:4px solid #FF8A3D;
                      border-radius:8px;
                      padding:16px;
                      font-size:14px;
                      line-height:1.6;
                    "
                  >
                    ${esc(mensagem)}
                  </div>

                  ${fotoAntesHtml}
                  ${fotoHtml}

                  <p
                    style="
                      margin-top:28px;
                      color:#75808c;
                      font-size:11px;
                      line-height:1.6;
                    "
                  >
                    Você recebeu esta mensagem porque
                    solicitou retorno ao registrar uma
                    ocorrência.
                  </p>

                </div>

              </div>

              <div
                style="
                  padding:20px;
                  text-align:center;
                  color:#8a949e;
                  font-size:10px;
                "
              >
                ORAQUI • Agora. Aqui. Registrado.
              </div>

            </div>

          </body>
          </html>
        `,
      });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: data?.id,
        foto_incluida: fotosUrls.length > 0,
        fotos_incluidas: fotosUrls.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar e-mail.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  }

});