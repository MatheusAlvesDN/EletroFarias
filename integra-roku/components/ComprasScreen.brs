sub init()
    m.listaNotas = m.top.findNode("listaNotas")
    m.statusText = m.top.findNode("statusText")
    
    ' Pega o timer do XML e escuta ele
    m.timer = m.top.findNode("loopDeAtualizacao")
    m.timer.observeField("fire", "buscarDadosSilenciosamente")

    ' Instancia a Task de requisição
    m.fetchTask = CreateObject("roSGNode", "FetchNotasTask")
    m.fetchTask.apiUrl = "https://intgr.onrender.com/expedicao/notas-pendentes"
    m.fetchTask.observeField("response", "onDataReceived")
end sub

' 1. Primeira vez que a tela abre
sub carregarDados()
    m.statusText.text = "Buscando notas..."
    m.statusText.visible = true
    m.listaNotas.visible = false
    
    ' Dispara a primeira busca e liga o relógio de 30s
    m.fetchTask.control = "RUN"
    m.timer.control = "start"
end sub

' 2. Chamado a cada 30 segundos pelo Timer (NÃO mexe na interface)
sub buscarDadosSilenciosamente()
    print "Atualizando dados em background..."
    m.fetchTask.control = "RUN"
end sub

' 3. O nosso "setState" (Atualiza a tela de uma vez só)
sub onDataReceived()
    jsonString = m.fetchTask.response
    
    if jsonString = ""
        print "Falha silenciosa na atualização."
        return
    end if

    dadosJson = ParseJson(jsonString)
    
    if dadosJson <> invalid and dadosJson.Count() > 0
        conteudo = CreateObject("roSGNode", "ContentNode")
        idx = 0
        
        for each nota in dadosJson
            item = conteudo.createChild("ContentNode")
            
            item.title = nota.numnota.toStr()
            item.description = nota.razaosocial
            
            if nota.vlrnota <> invalid
                item.shortDescriptionLine1 = "R$ " + nota.vlrnota.toStr()
            else
                item.shortDescriptionLine1 = "R$ 0.00"
            end if
            
            item.HDPOSTERURL = idx.toStr()
            idx = idx + 1
        end for
        
        ' A MÁGICA: Substituímos o conteúdo inteiro da lista de uma vez.
        ' Isso faz a Roku redesenhar os novos dados sem piscar a tela.
        m.listaNotas.content = conteudo
        
        ' Garante que os componentes estão na visibilidade correta (caso seja o primeiro loading)
        m.statusText.visible = false
        m.listaNotas.visible = true
        m.listaNotas.setFocus(true) 
    else
        ' Se não vier nada do banco, aí sim mostramos aviso
        m.statusText.text = "Nenhuma nota encontrada."
        m.statusText.visible = true
        m.listaNotas.visible = false
    end if
end sub