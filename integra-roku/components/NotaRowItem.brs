sub init()
    ' Mapeamos os nós uma vez só quando o item é criado na tela
    m.background = m.top.findNode("background")
    m.numNota = m.top.findNode("numNota")
    m.parceiro = m.top.findNode("parceiro")
    m.valor = m.top.findNode("valor")
end sub

sub onContentChange()
    itemData = m.top.itemContent
    if itemData = invalid then return

    m.numNota.text = itemData.title
    m.parceiro.text = itemData.description
    m.valor.text = itemData.shortDescriptionLine1

    ' Efeito Zebra: Alterna as cores de fundo com base no index
    index = itemData.HDPOSTERURL.toInt()
    if (index MOD 2 = 0)
        m.background.color = "0xF8FAFCFF" ' Cinza bem claro
    else
        m.background.color = "0xFFFFFFFF" ' Branco
    end if
end sub