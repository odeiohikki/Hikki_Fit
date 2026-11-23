# Hikki Fit v1.1 — configuração das notificações push

Esta branch é uma preparação, não um serviço ativo. Para funcionar com o aplicativo fechado, ainda é necessário configurar um projeto Firebase e credenciais de envio.

## Arquitetura proposta
- Firebase Authentication (anônimo) identifica cada instalação sem pedir cadastro.
- Firestore armazena, por instalação, token FCM, fuso horário IANA, dias e hora do lembrete.
- Firebase Cloud Messaging entrega notificações ao service worker do Android.
- GitHub Actions roda a cada 5 minutos (atrasos são possíveis) e envia as notificações usando Firebase Admin SDK.

## Segurança obrigatória
- A configuração web Firebase (apiKey, projectId etc.) é pública por design, mas a chave VAPID pública também pode ficar no frontend.
- **Nunca** publicar a chave privada de conta de serviço Firebase, credenciais de administrador, tokens de acesso ou arquivos JSON privados.
- A conta de serviço de envio deve ser armazenada exclusivamente como GitHub Actions Secret.
- Regras Firestore devem restringir documentos a \`request.auth.uid\` e validar campos; nunca usar regras de leitura/escrita globais.
- Dispositivos podem revogar permissões; tratar tokens inválidos e exclusão de inscrições.
- A instalação do GitHub Pages precisa de HTTPS, e o FCM Web precisa de navegador compatível e service worker.

## Antes de ativar
1. Criar projeto no console Firebase, confirmar que os serviços escolhidos têm cota gratuita e que não é obrigatório ativar faturamento.
2. Habilitar Authentication anônimo, Firestore e Cloud Messaging.
3. Registrar o app web, gerar a chave VAPID e configurar regras Firestore restritivas.
4. Configurar a automação de envio e os segredos no GitHub Actions.
5. Testar no Android com app fechado, celular bloqueado, permissão concedida e horário real.
6. Manter os lembretes locais atuais como fallback.

**Importante:** GitHub Actions em repositórios públicos pode ter limites, atrasos e desativação automática de cron após longos períodos sem atividade. Notificações não são garantidas no minuto exato.

Status: aguardando configuração Firebase pelo proprietário. Não há push ativo apenas com este documento.
