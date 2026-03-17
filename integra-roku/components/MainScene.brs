sub init()
    m.menu = m.top.findNode("menuPrincipal")

    ' 1. Configurando o único item do Menu
    conteudo = CreateObject("roSGNode", "ContentNode")
    
    item1 = conteudo.createChild("ContentNode")
    item1.title = "Compras"

    m.menu.content = conteudo

    ' 2. "Escutando" os cliques no menu
    m.menu.observeField("itemSelected", "onMenuSelecionado")

    ' Dá o foco pro controle remoto funcionar
    m.menu.setFocus(true)
end sub

sub onMenuSelecionado()
    itemClicado = m.menu.itemSelected
    
    if itemClicado = 0 ' Clicou em Compras
        ' Esconde o menu inicial
        m.top.findNode("mainCard").visible = false
        
        ' Puxa a nova tela, deixa visível e manda buscar os dados!
        telaCompras = m.top.findNode("telaCompras")
        telaCompras.visible = true
        telaCompras.callFunc("carregarDados")
    end if
end sub