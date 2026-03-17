sub Main()
    screen = CreateObject("roSGScreen") ' Cria a tela
    m.port = CreateObject("roMessagePort") ' Cria a porta de comunicação
    screen.setMessagePort(m.port)
    
    scene = screen.CreateScene("MainScene") ' Chama aquele XML que vimos antes
    screen.show() ' Exibe na TV

    while(true)
        msg = wait(0, m.port) ' Mantém o app aberto num loop infinito
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub