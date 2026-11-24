# Hikki Fit 2.0 — critérios de lançamento

Não marcar como versão final antes de aprovar os testes automatizados e os testes de dispositivo. Registrar modelo, versão Android, número da compilação e resultado de cada teste.

## Compilação
- [ ] GitHub Actions verde no commit candidato, incluindo npm test.
- [ ] APK assinado com certificado permanente verificado pelo workflow.
- [ ] Artefato Hikki-Fit.apk disponível e ícone oficial integrado.

## Instalação e dados
- [ ] Exportar backup da versão anterior e guardar fora do aplicativo antes de instalar.
- [ ] Instalar APK; se houver conflito de assinatura, não desinstalar antes de confirmar a cópia.
- [ ] Restaurar backup e comparar exercícios, treinos, histórico, mídias e perfil quando presentes.
- [ ] Exportar e restaurar novo backup v2, incluindo medidas e cosméticos.
- [ ] Cancelar exportação e confirmar que não é registrada como sucesso.
- [ ] Importar JSON inválido e confirmar que os dados atuais permanecem intactos.
- [ ] Instalar atualização de mesma assinatura sem perda de dados.

## Treino e evolução
- [ ] Iniciar treino, concluir exercício de repetição e exercício cronometrado.
- [ ] Descanso de 30 segundos, pular descanso, avançar exercício.
- [ ] Tela permanece ligada durante treino e volta ao comportamento normal após sair.
- [ ] Cancelar treino sem criar histórico; finalizar treino completo uma única vez.
- [ ] Conferir duração, XP, séries previstas, nível e histórico.
- [ ] Registrar, editar e excluir medida; conferir gráfico e retrospectivas.
- [ ] Conferir calendário, títulos bloqueados e desbloqueados, cosméticos e mascote.
- [ ] Verificar dica diária e funcionamento sem rede (mídias externas são exceção).

## Android
- [ ] Conferir ícone, nome, áreas de toque e barras do sistema.
- [ ] Testar notificações com permissão concedida e negada.
- [ ] Agendar teste de 15 minutos, fechar normalmente o app, bloquear tela e verificar entrega.
- [ ] Verificar lembrete semanal, alteração de horário, desativação e reinicialização do aparelho.
- [ ] Verificar menu Sobre e sete toques para modo desenvolvedor.
- [ ] Verificar lembrete opcional de backup.

## Registro
Para cada falha: compilação, passos, resultado esperado, resultado observado e gravidade. Não usar dados pessoais reais em capturas compartilhadas. Guardar a chave de assinatura em local seguro fora do repositório. Não publicar senhas ou secrets.
