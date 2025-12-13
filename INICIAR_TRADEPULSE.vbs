Set WshShell = CreateObject("WScript.Shell")

' Mostrar mensagem
MsgBox "TradePulse AI iniciando..." & vbCrLf & vbCrLf & "Aguarde ~10 segundos." & vbCrLf & "O navegador abrira automaticamente.", vbInformation, "TradePulse AI"

' Mudar para o diretório do projeto
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Abrir navegador após 5 segundos
WScript.Sleep 5000
WshShell.Run "http://localhost:5173", 1, False

' Iniciar servidor npm em nova janela
WshShell.Run "cmd /k npm run dev", 1, False

MsgBox "Servidor iniciado!" & vbCrLf & vbCrLf & "Se o navegador mostrar erro, aguarde mais 5 segundos e atualize a pagina (F5).", vbInformation, "TradePulse AI"
