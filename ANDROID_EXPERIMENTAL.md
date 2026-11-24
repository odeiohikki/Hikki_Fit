# Hikki Fit Experimental
Branch isolada. Não publicar no Pages. O APK não usa Firebase. A rotina semanal existente permanece como lembrete interno; o painel nativo testa notificações únicas, não agenda recorrência definitiva.
## Compilar
GitHub Actions: Hikki Fit Android Experimental. Baixar o artefato ZIP e extrair app-debug.apk. Instalar no Android autorizando a fonte se necessário. APK debug; futuras compilações podem ter assinatura diferente. Exportar backup antes de desinstalar.
## Testar
Exportar backup do PWA e guardar localmente. Importar no APK pelo seletor de arquivo. Conferir exercícios, mídia, rotina, histórico, XP e conquistas. Exportar via compartilhamento para um destino local e testar restauração. Não enviar dados ao GitHub. Testar offline, fechar normalmente, agendar 1 minuto, verificar bateria e reinício. Não confundir fechar com forçar parada. Notificações podem atrasar. Links externos exigem rede.
## Limitações
Sem agendamento semanal nativo nesta prova de conceito. Sem assinatura definitiva. Dependências fixadas diretamente, sem lockfile inicial. Testes automatizados verificam empacotamento e sintaxe, não comportamento Android.
