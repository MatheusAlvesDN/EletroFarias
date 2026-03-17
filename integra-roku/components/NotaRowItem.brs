sub onContentChange()
    itemData = m.top.itemContent
    if itemData <> invalid
        m.top.findNode("lblNota").text = itemData.TITLE
        m.top.findNode("lblParceiro").text = itemData.DESCRIPTION
        
        ' A CORREÇÃO: Lendo da mesma propriedade nativa que salvamos
        m.top.findNode("lblValor").text = itemData.shortDescriptionLine1
        
        if itemData.HDPOSTERURL.toInt() mod 2 = 0
            m.top.findNode("fundo").color = "0xF8FAFCFF"
        else
            m.top.findNode("fundo").color = "0xFFFFFFFF"
        end if
    end if
end sub