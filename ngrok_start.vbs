Dim shell, fso, dir, ngrok
Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' Caminho baseado na localização do próprio VBS (independente de onde é chamado)
dir   = fso.GetParentFolderName(WScript.ScriptFullName)
ngrok = dir & "\ngrok.exe"

If fso.FileExists(ngrok) Then
    shell.Run """" & ngrok & """ http 3000", 1, False
End If
