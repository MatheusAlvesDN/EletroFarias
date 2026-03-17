sub init()
    m.top.functionName = "fazerRequisicao"
end sub

sub fazerRequisicao()
    ' Prepara o cliente HTTP
    http = CreateObject("roUrlTransfer")
    http.SetUrl(m.top.apiUrl)
    
    ' Configuração padrão para aceitar certificados SSL, se for HTTPS no futuro
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.InitClientCertificates()

    ' Faz a chamada e salva o JSON em formato de String
    respostaString = http.GetToString()
    
    ' Devolve a string para a tela principal
    m.top.response = respostaString
end sub